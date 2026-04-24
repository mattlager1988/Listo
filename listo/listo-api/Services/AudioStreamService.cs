using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IAudioStreamService
{
    Task<IEnumerable<AudioStreamResponse>> GetAllAsync(long userId);
    Task<AudioStreamResponse?> GetByIdAsync(long id, long userId);
    Task<AudioStreamResponse> CreateAsync(CreateAudioStreamRequest request, long userId);
    Task<AudioStreamResponse?> UpdateAsync(long id, UpdateAudioStreamRequest request, long userId);
    Task<bool> DeleteAsync(long id, long userId);
}

public class AudioStreamService : IAudioStreamService
{
    private readonly ListoDbContext _context;

    public AudioStreamService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AudioStreamResponse>> GetAllAsync(long userId)
    {
        return await _context.AudioStreams
            .Where(s => s.UserSysId == userId)
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Name)
            .Select(s => MapToResponse(s))
            .ToListAsync();
    }

    public async Task<AudioStreamResponse?> GetByIdAsync(long id, long userId)
    {
        var stream = await _context.AudioStreams
            .FirstOrDefaultAsync(s => s.SysId == id && s.UserSysId == userId);

        return stream == null ? null : MapToResponse(stream);
    }

    public async Task<AudioStreamResponse> CreateAsync(CreateAudioStreamRequest request, long userId)
    {
        var stream = new AudioStream
        {
            Name = request.Name,
            Url = request.Url,
            Category = request.Category,
            Description = request.Description,
            UserSysId = userId,
        };

        _context.AudioStreams.Add(stream);
        await _context.SaveChangesAsync();

        return MapToResponse(stream);
    }

    public async Task<AudioStreamResponse?> UpdateAsync(long id, UpdateAudioStreamRequest request, long userId)
    {
        var stream = await _context.AudioStreams
            .FirstOrDefaultAsync(s => s.SysId == id && s.UserSysId == userId);

        if (stream == null) return null;

        if (request.Name != null) stream.Name = request.Name;
        if (request.Url != null) stream.Url = request.Url;
        if (request.Category != null) stream.Category = request.Category;
        if (request.Description != null) stream.Description = request.Description;

        await _context.SaveChangesAsync();

        return MapToResponse(stream);
    }

    public async Task<bool> DeleteAsync(long id, long userId)
    {
        var stream = await _context.AudioStreams
            .FirstOrDefaultAsync(s => s.SysId == id && s.UserSysId == userId);

        if (stream == null) return false;

        _context.AudioStreams.Remove(stream);
        await _context.SaveChangesAsync();

        return true;
    }

    private static AudioStreamResponse MapToResponse(AudioStream s) => new(
        s.SysId,
        s.Name,
        s.Url,
        s.Category,
        s.Description,
        s.CreateTimestamp,
        s.ModifyTimestamp
    );
}
