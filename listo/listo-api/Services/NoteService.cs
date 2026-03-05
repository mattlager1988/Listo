using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface INoteService
{
    Task<IEnumerable<NoteResponse>> GetAllAsync(long userId);
    Task<IEnumerable<NoteResponse>> GetDiscontinuedAsync(long userId);
    Task<NoteResponse?> GetByIdAsync(long id, long userId);
    Task<NoteResponse> CreateAsync(CreateNoteRequest request, long userId);
    Task<NoteResponse?> UpdateAsync(long id, UpdateNoteRequest request, long userId);
    Task<bool> DiscontinueAsync(long id, long userId);
    Task<NoteResponse?> ReactivateAsync(long id, long userId);
}

public class NoteService : INoteService
{
    private readonly ListoDbContext _context;

    public NoteService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<NoteResponse>> GetAllAsync(long userId)
    {
        return await _context.Notes
            .Where(n => n.UserSysId == userId && !n.IsDiscontinued)
            .OrderByDescending(n => n.CreateTimestamp)
            .Select(n => MapToResponse(n))
            .ToListAsync();
    }

    public async Task<IEnumerable<NoteResponse>> GetDiscontinuedAsync(long userId)
    {
        return await _context.Notes
            .Where(n => n.UserSysId == userId && n.IsDiscontinued)
            .OrderByDescending(n => n.DiscontinuedDate)
            .Select(n => MapToResponse(n))
            .ToListAsync();
    }

    public async Task<NoteResponse?> GetByIdAsync(long id, long userId)
    {
        var note = await _context.Notes
            .FirstOrDefaultAsync(n => n.SysId == id && n.UserSysId == userId);

        return note == null ? null : MapToResponse(note);
    }

    public async Task<NoteResponse> CreateAsync(CreateNoteRequest request, long userId)
    {
        var note = new Note
        {
            Subject = request.Subject,
            Description = request.Description,
            UserSysId = userId,
        };

        _context.Notes.Add(note);
        await _context.SaveChangesAsync();

        return MapToResponse(note);
    }

    public async Task<NoteResponse?> UpdateAsync(long id, UpdateNoteRequest request, long userId)
    {
        var note = await _context.Notes
            .FirstOrDefaultAsync(n => n.SysId == id && n.UserSysId == userId);

        if (note == null) return null;

        if (request.Subject != null) note.Subject = request.Subject;
        if (request.Description != null) note.Description = request.Description;

        await _context.SaveChangesAsync();

        return MapToResponse(note);
    }

    public async Task<bool> DiscontinueAsync(long id, long userId)
    {
        var note = await _context.Notes
            .FirstOrDefaultAsync(n => n.SysId == id && n.UserSysId == userId);

        if (note == null) return false;

        note.IsDiscontinued = true;
        note.DiscontinuedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<NoteResponse?> ReactivateAsync(long id, long userId)
    {
        var note = await _context.Notes
            .FirstOrDefaultAsync(n => n.SysId == id && n.UserSysId == userId);

        if (note == null) return null;

        note.IsDiscontinued = false;
        note.DiscontinuedDate = null;
        await _context.SaveChangesAsync();

        return MapToResponse(note);
    }

    private static NoteResponse MapToResponse(Note n) => new(
        n.SysId,
        n.Subject,
        n.Description,
        n.CreateTimestamp,
        n.ModifyTimestamp,
        n.IsDiscontinued,
        n.DiscontinuedDate
    );
}
