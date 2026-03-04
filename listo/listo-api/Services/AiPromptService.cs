using System.Text.Json;
using System.Text.RegularExpressions;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IAiPromptService
{
    Task<IEnumerable<AiPromptResponse>> GetAllAsync(bool includeDeleted = false);
    Task<AiPromptResponse?> GetByIdAsync(long id);
    Task<AiPromptResponse> CreateAsync(CreateAiPromptRequest request);
    Task<AiPromptResponse?> UpdateAsync(long id, UpdateAiPromptRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
    Task<TrainingAnalysisResponse> AnalyzeTrainingLogsAsync(TrainingAnalysisRequest request);
}

public class AiPromptService : IAiPromptService
{
    private readonly ListoDbContext _context;
    private readonly IOpenAIService _openAIService;

    public AiPromptService(ListoDbContext context, IOpenAIService openAIService)
    {
        _context = context;
        _openAIService = openAIService;
    }

    public async Task<IEnumerable<AiPromptResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.AiPrompts.AsQueryable();
        if (!includeDeleted)
            query = query.Where(p => !p.IsDeleted);

        return await query
            .Select(p => new AiPromptResponse(
                p.SysId,
                p.Name,
                p.PromptText,
                p.IsDeleted
            ))
            .ToListAsync();
    }

    public async Task<AiPromptResponse?> GetByIdAsync(long id)
    {
        var prompt = await _context.AiPrompts.FindAsync(id);
        return prompt == null ? null : new AiPromptResponse(
            prompt.SysId, prompt.Name, prompt.PromptText, prompt.IsDeleted);
    }

    public async Task<AiPromptResponse> CreateAsync(CreateAiPromptRequest request)
    {
        if (await _context.AiPrompts.AnyAsync(p => p.Name == request.Name))
            throw new InvalidOperationException("AI prompt with this name already exists");

        var prompt = new AiPrompt
        {
            Name = request.Name,
            PromptText = request.PromptText
        };
        _context.AiPrompts.Add(prompt);
        await _context.SaveChangesAsync();

        return new AiPromptResponse(prompt.SysId, prompt.Name, prompt.PromptText, prompt.IsDeleted);
    }

    public async Task<AiPromptResponse?> UpdateAsync(long id, UpdateAiPromptRequest request)
    {
        var prompt = await _context.AiPrompts.FindAsync(id);
        if (prompt == null) return null;

        if (request.Name != null)
        {
            if (await _context.AiPrompts.AnyAsync(p => p.Name == request.Name && p.SysId != id))
                throw new InvalidOperationException("AI prompt with this name already exists");
            prompt.Name = request.Name;
        }

        if (request.PromptText != null)
        {
            prompt.PromptText = request.PromptText;
        }

        await _context.SaveChangesAsync();

        return new AiPromptResponse(prompt.SysId, prompt.Name, prompt.PromptText, prompt.IsDeleted);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var prompt = await _context.AiPrompts.FindAsync(id);
        if (prompt == null) return false;

        prompt.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var prompt = await _context.AiPrompts.FindAsync(id);
        if (prompt == null) return false;

        prompt.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var prompt = await _context.AiPrompts.FindAsync(id);
        if (prompt == null) return false;

        _context.AiPrompts.Remove(prompt);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TrainingAnalysisResponse> AnalyzeTrainingLogsAsync(TrainingAnalysisRequest request)
    {
        // Fetch the prompt
        var prompt = await _context.AiPrompts.FindAsync(request.PromptSysId);
        if (prompt == null || prompt.IsDeleted)
            throw new InvalidOperationException("Selected AI prompt not found");

        // Fetch training logs
        var logs = await _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .Where(l => request.TrainingLogIds.Contains(l.SysId))
            .OrderBy(l => l.Date)
            .ToListAsync();

        if (logs.Count == 0)
            throw new InvalidOperationException("No training logs found for the selected IDs");

        // Build JSON payload of records
        var trainingData = logs.Select(l => new
        {
            Date = l.Date.ToString("yyyy-MM-dd"),
            TrainingType = l.TrainingType.Name,
            HoursFlown = l.HoursFlown,
            Aircraft = l.Aircraft?.Name,
            AircraftId = l.Aircraft?.PlaneId,
            Description = StripHtml(l.Description)
        }).ToList();

        var jsonPayload = JsonSerializer.Serialize(trainingData, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        // Call OpenAI
        var systemPrompt = prompt.PromptText;
        var userPrompt = $"Here are the training records to analyze:\n\n{jsonPayload}";

        var analysis = await _openAIService.GetCompletionAsync(systemPrompt, userPrompt);

        return new TrainingAnalysisResponse(analysis, DateTime.UtcNow);
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;

        // Remove HTML tags
        var text = Regex.Replace(html, "<[^>]*>", " ");
        // Decode HTML entities
        text = System.Net.WebUtility.HtmlDecode(text);
        // Normalize whitespace
        text = Regex.Replace(text, @"\s+", " ").Trim();

        return text;
    }
}
