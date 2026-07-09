using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IScratchNoteService
{
    Task<IEnumerable<ScratchNoteResponse>> GetAllAsync();
    Task<ScratchNoteResponse?> GetByIdAsync(long id);
    Task<ScratchNoteResponse> CreateAsync(CreateScratchNoteRequest request);
    Task<ScratchNoteResponse?> UpdateAsync(long id, UpdateScratchNoteRequest request);
    Task<bool> DeleteAsync(long id);
    Task<ScratchNoteResponse?> ConvertAsync(long id, ConvertScratchNoteRequest request);
}

public class ScratchNoteService : IScratchNoteService
{
    // Documents attached to a scratch note are keyed by this (module, entityType)
    // pair on the generic Documents system.
    private const string DocumentModule = "tasks";
    private const string DocumentEntityType = "scratchpad";
    // On convert, attachments are re-pointed to the created task using this entity type.
    private const string TaskEntityType = "task";

    private readonly ListoDbContext _context;
    private readonly ITaskItemService _taskItemService;
    private readonly IDocumentService _documentService;

    public ScratchNoteService(
        ListoDbContext context,
        ITaskItemService taskItemService,
        IDocumentService documentService)
    {
        _context = context;
        _taskItemService = taskItemService;
        _documentService = documentService;
    }

    public async Task<IEnumerable<ScratchNoteResponse>> GetAllAsync()
    {
        var notes = await _context.ScratchNotes
            .OrderByDescending(n => n.CreateTimestamp)
            .ToListAsync();

        var attachmentCounts = await GetAttachmentCountsAsync(notes.Select(n => n.SysId).ToList());

        return notes.Select(n => MapToResponse(
            n, attachmentCounts.TryGetValue(n.SysId, out var count) ? count : 0));
    }

    public async Task<ScratchNoteResponse?> GetByIdAsync(long id)
    {
        var note = await _context.ScratchNotes.FindAsync(id);
        if (note == null) return null;

        var count = await _context.Documents.CountAsync(d =>
            d.Module == DocumentModule &&
            d.EntityType == DocumentEntityType &&
            d.EntitySysId == id);

        return MapToResponse(note, count);
    }

    public async Task<ScratchNoteResponse> CreateAsync(CreateScratchNoteRequest request)
    {
        var note = new ScratchNote
        {
            Content = request.Content
        };

        _context.ScratchNotes.Add(note);
        await _context.SaveChangesAsync();

        return MapToResponse(note, 0);
    }

    public async Task<ScratchNoteResponse?> UpdateAsync(long id, UpdateScratchNoteRequest request)
    {
        var note = await _context.ScratchNotes.FindAsync(id);
        if (note == null) return null;

        if (request.Content != null) note.Content = request.Content;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var note = await _context.ScratchNotes.FindAsync(id);
        if (note == null) return false;

        // Remove attached documents (DB rows + files on disk) first.
        var attachments = await _context.Documents
            .Where(d => d.Module == DocumentModule &&
                        d.EntityType == DocumentEntityType &&
                        d.EntitySysId == id)
            .Select(d => d.SysId)
            .ToListAsync();

        foreach (var documentId in attachments)
        {
            await _documentService.DeleteAsync(documentId);
        }

        _context.ScratchNotes.Remove(note);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ScratchNoteResponse?> ConvertAsync(long id, ConvertScratchNoteRequest request)
    {
        var note = await _context.ScratchNotes.FindAsync(id);
        if (note == null) return null;

        // Reuse the task creation logic (handles backlog vs. board placement).
        var task = await _taskItemService.CreateAsync(new CreateTaskItemRequest(
            request.Name,
            request.Description,
            request.Priority,
            request.DueDate,
            request.TaskBoardSysId));

        // Move the note's attachments over to the new task.
        var attachments = await _context.Documents
            .Where(d => d.Module == DocumentModule &&
                        d.EntityType == DocumentEntityType &&
                        d.EntitySysId == id)
            .ToListAsync();

        foreach (var doc in attachments)
        {
            doc.EntityType = TaskEntityType;
            doc.EntitySysId = task.SysId;
        }

        note.IsConverted = true;
        note.ConvertedDate = DateTime.UtcNow;
        note.ConvertedTaskSysId = task.SysId;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    private async Task<Dictionary<long, int>> GetAttachmentCountsAsync(List<long> noteIds)
    {
        if (noteIds.Count == 0) return new Dictionary<long, int>();

        var counts = await _context.Documents
            .Where(d => d.Module == DocumentModule &&
                        d.EntityType == DocumentEntityType &&
                        d.EntitySysId != null &&
                        noteIds.Contains(d.EntitySysId.Value))
            .GroupBy(d => d.EntitySysId!.Value)
            .Select(g => new { EntitySysId = g.Key, Count = g.Count() })
            .ToListAsync();

        return counts.ToDictionary(c => c.EntitySysId, c => c.Count);
    }

    private static ScratchNoteResponse MapToResponse(ScratchNote note, int attachmentCount)
    {
        return new ScratchNoteResponse(
            note.SysId,
            note.Content,
            note.IsConverted,
            note.ConvertedDate,
            note.ConvertedTaskSysId,
            attachmentCount,
            note.CreateTimestamp,
            note.ModifyTimestamp
        );
    }
}
