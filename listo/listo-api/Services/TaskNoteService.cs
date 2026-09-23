using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ITaskNoteService
{
    Task<IEnumerable<TaskNoteResponse>> GetByTaskAsync(long taskItemSysId);
    Task<TaskNoteResponse> CreateAsync(long taskItemSysId, CreateTaskNoteRequest request);
}

public class TaskNoteService : ITaskNoteService
{
    private readonly ListoDbContext _context;

    public TaskNoteService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TaskNoteResponse>> GetByTaskAsync(long taskItemSysId)
    {
        // Left join to Users so we can show the author's name; newest note first.
        var notes = await (
            from n in _context.TaskNotes
            where n.TaskItemSysId == taskItemSysId
            orderby n.CreateTimestamp descending
            join u in _context.Users on n.CreateUser equals u.SysId into authors
            from author in authors.DefaultIfEmpty()
            select new TaskNoteResponse(
                n.SysId,
                n.TaskItemSysId,
                n.Content,
                n.CreateTimestamp,
                n.CreateUser,
                author != null ? (author.FirstName + " " + author.LastName).Trim() : null
            )
        ).ToListAsync();

        return notes;
    }

    public async Task<TaskNoteResponse> CreateAsync(long taskItemSysId, CreateTaskNoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new ArgumentException("Note content is required.");

        var taskExists = await _context.TaskItems.AnyAsync(t => t.SysId == taskItemSysId);
        if (!taskExists)
            throw new ArgumentException("Task not found.");

        var note = new TaskNote
        {
            TaskItemSysId = taskItemSysId,
            Content = request.Content.Trim()
        };

        _context.TaskNotes.Add(note);
        await _context.SaveChangesAsync();

        // Resolve author name for the created note (CreateUser is set by SaveChangesAsync).
        string? authorName = null;
        if (note.CreateUser.HasValue)
        {
            var author = await _context.Users
                .Where(u => u.SysId == note.CreateUser.Value)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync();
            authorName = string.IsNullOrWhiteSpace(author) ? null : author;
        }

        return new TaskNoteResponse(
            note.SysId,
            note.TaskItemSysId,
            note.Content,
            note.CreateTimestamp,
            note.CreateUser,
            authorName
        );
    }
}
