using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ITaskItemService
{
    Task<IEnumerable<TaskItemResponse>> GetBacklogAsync();
    Task<IEnumerable<TaskItemResponse>> GetByBoardAsync(long boardId);
    Task<IEnumerable<TaskItemResponse>> GetCompletedAsync();
    Task<TaskItemResponse?> GetByIdAsync(long id);
    Task<TaskItemResponse> CreateAsync(CreateTaskItemRequest request);
    Task<TaskItemResponse?> UpdateAsync(long id, UpdateTaskItemRequest request);
    Task<bool> DeleteAsync(long id);
    Task<TaskItemResponse?> AssignToBoardAsync(long id, AssignTaskToBoardRequest request);
    Task<TaskItemResponse?> SetFlagAsync(long id, SetTaskFlagRequest request);
    Task<TaskItemResponse?> MoveToBacklogAsync(long id);
    Task<TaskItemResponse?> CompleteAsync(long id);
    Task<TaskItemResponse?> UncompleteAsync(long id);
    Task<bool> MoveTaskAsync(long id, MoveTaskRequest request);
    Task<bool> ReorderTasksAsync(ReorderTasksRequest request);
}

public class TaskItemService : ITaskItemService
{
    // Attachments on a task use these keys on the generic Documents system.
    private const string DocumentModule = "tasks";
    private const string TaskEntityType = "task";

    // Colour keys accepted for a task's flag. Kept in sync with the flag palettes
    // in listo-web (pages/tasks/BoardView.tsx) and listo-mobile (@shared/utils/taskFlags).
    private static readonly HashSet<string> ValidFlagColors = new(StringComparer.OrdinalIgnoreCase)
    {
        "red", "orange", "yellow", "green", "blue", "purple"
    };

    private readonly ListoDbContext _context;
    private readonly IDocumentService _documentService;

    public TaskItemService(ListoDbContext context, IDocumentService documentService)
    {
        _context = context;
        _documentService = documentService;
    }

    public async Task<IEnumerable<TaskItemResponse>> GetBacklogAsync()
    {
        var tasks = await _context.TaskItems
            .Where(t => t.TaskBoardSysId == null && !t.IsCompleted)
            .OrderBy(t => t.SortOrder)
            .ThenByDescending(t => t.CreateTimestamp)
            .ToListAsync();

        return await MapManyAsync(tasks);
    }

    public async Task<IEnumerable<TaskItemResponse>> GetByBoardAsync(long boardId)
    {
        var tasks = await _context.TaskItems
            .Include(t => t.TaskBoardColumn)
            .Where(t => t.TaskBoardSysId == boardId && !t.IsCompleted)
            .OrderBy(t => t.SortOrder)
            .ToListAsync();

        return await MapManyAsync(tasks);
    }

    public async Task<IEnumerable<TaskItemResponse>> GetCompletedAsync()
    {
        var tasks = await _context.TaskItems
            .Include(t => t.TaskBoard)
            .Include(t => t.TaskBoardColumn)
            .Where(t => t.IsCompleted)
            .OrderByDescending(t => t.CompletedDate)
            .ToListAsync();

        return await MapManyAsync(tasks);
    }

    public async Task<TaskItemResponse?> GetByIdAsync(long id)
    {
        var task = await _context.TaskItems
            .Include(t => t.TaskBoard)
            .Include(t => t.TaskBoardColumn)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return task == null ? null : MapToResponse(task, await GetLastNoteDateAsync(id));
    }

    public async Task<TaskItemResponse> CreateAsync(CreateTaskItemRequest request)
    {
        var priority = TaskPriority.Medium;
        if (!string.IsNullOrEmpty(request.Priority))
        {
            if (!Enum.TryParse<TaskPriority>(request.Priority, out priority))
                throw new ArgumentException("Invalid priority. Must be Low, Medium, or High.");
        }

        var task = new TaskItem
        {
            Name = request.Name,
            Description = request.Description,
            Priority = priority,
            DueDate = request.DueDate
        };

        // If board specified, assign to its first column
        if (request.TaskBoardSysId.HasValue)
        {
            var board = await _context.TaskBoards
                .Include(b => b.Columns.OrderBy(c => c.SortOrder))
                .FirstOrDefaultAsync(b => b.SysId == request.TaskBoardSysId.Value);

            if (board == null)
                throw new ArgumentException("Board not found.");

            var firstColumn = board.Columns.FirstOrDefault();
            if (firstColumn == null)
                throw new ArgumentException("Board has no columns.");

            var maxSort = await _context.TaskItems
                .Where(t => t.TaskBoardColumnSysId == firstColumn.SysId && !t.IsCompleted)
                .MaxAsync(t => (int?)t.SortOrder) ?? -1;

            task.TaskBoardSysId = board.SysId;
            task.TaskBoardColumnSysId = firstColumn.SysId;
            task.SortOrder = maxSort + 1;
        }

        _context.TaskItems.Add(task);
        await _context.SaveChangesAsync();

        // A brand new task cannot have notes yet.
        return MapToResponse(task, null);
    }

    public async Task<TaskItemResponse?> UpdateAsync(long id, UpdateTaskItemRequest request)
    {
        var task = await _context.TaskItems
            .Include(t => t.TaskBoard)
            .Include(t => t.TaskBoardColumn)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (task == null) return null;

        if (request.Name != null) task.Name = request.Name;
        if (request.Description != null) task.Description = request.Description;
        if (request.Priority != null)
        {
            if (!Enum.TryParse<TaskPriority>(request.Priority, out var priority))
                throw new ArgumentException("Invalid priority. Must be Low, Medium, or High.");
            task.Priority = priority;
        }
        if (request.DueDate.HasValue) task.DueDate = request.DueDate;

        await _context.SaveChangesAsync();
        return MapToResponse(task, await GetLastNoteDateAsync(id));
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return false;

        // Remove any attachments (DB rows + files on disk) so they aren't orphaned.
        var attachments = await _context.Documents
            .Where(d => d.Module == DocumentModule &&
                        d.EntityType == TaskEntityType &&
                        d.EntitySysId == id)
            .Select(d => d.SysId)
            .ToListAsync();

        foreach (var documentId in attachments)
        {
            await _documentService.DeleteAsync(documentId);
        }

        _context.TaskItems.Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TaskItemResponse?> AssignToBoardAsync(long id, AssignTaskToBoardRequest request)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return null;

        var board = await _context.TaskBoards
            .Include(b => b.Columns.OrderBy(c => c.SortOrder))
            .FirstOrDefaultAsync(b => b.SysId == request.TaskBoardSysId);

        if (board == null)
            throw new ArgumentException("Board not found.");

        var firstColumn = board.Columns.FirstOrDefault();
        if (firstColumn == null)
            throw new ArgumentException("Board has no columns.");

        // Get max sort order in the target column
        var maxSort = await _context.TaskItems
            .Where(t => t.TaskBoardColumnSysId == firstColumn.SysId && !t.IsCompleted)
            .MaxAsync(t => (int?)t.SortOrder) ?? -1;

        task.TaskBoardSysId = board.SysId;
        task.TaskBoardColumnSysId = firstColumn.SysId;
        task.SortOrder = maxSort + 1;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<TaskItemResponse?> SetFlagAsync(long id, SetTaskFlagRequest request)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return null;

        if (string.IsNullOrWhiteSpace(request.FlagColor))
        {
            task.FlagColor = null;
        }
        else
        {
            var color = request.FlagColor.Trim().ToLowerInvariant();
            if (!ValidFlagColors.Contains(color))
                throw new ArgumentException($"Invalid flag color. Must be one of: {string.Join(", ", ValidFlagColors)}.");
            task.FlagColor = color;
        }

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TaskItemResponse?> MoveToBacklogAsync(long id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return null;

        task.TaskBoardSysId = null;
        task.TaskBoardColumnSysId = null;
        task.SortOrder = 0;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TaskItemResponse?> CompleteAsync(long id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return null;

        task.IsCompleted = true;
        task.CompletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TaskItemResponse?> UncompleteAsync(long id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return null;

        task.IsCompleted = false;
        task.CompletedDate = null;
        // Return to backlog when uncompleting
        task.TaskBoardSysId = null;
        task.TaskBoardColumnSysId = null;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> MoveTaskAsync(long id, MoveTaskRequest request)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return false;

        task.TaskBoardColumnSysId = request.TaskBoardColumnSysId;
        task.SortOrder = request.SortOrder;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderTasksAsync(ReorderTasksRequest request)
    {
        var taskIds = request.Tasks.Select(t => t.SysId).ToList();
        var tasks = await _context.TaskItems
            .Where(t => taskIds.Contains(t.SysId))
            .ToListAsync();

        foreach (var orderItem in request.Tasks)
        {
            var task = tasks.FirstOrDefault(t => t.SysId == orderItem.SysId);
            if (task != null)
            {
                task.TaskBoardColumnSysId = orderItem.TaskBoardColumnSysId;
                task.SortOrder = orderItem.SortOrder;
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    // Batch-loads the most recent note timestamp per task so list endpoints
    // don't issue one query per task.
    private async Task<IEnumerable<TaskItemResponse>> MapManyAsync(List<TaskItem> tasks)
    {
        if (tasks.Count == 0) return Enumerable.Empty<TaskItemResponse>();

        // CreateTimestamp carries a value converter (see ListoDbContext), and EF can't
        // translate an aggregate over one — so group the raw rows client-side.
        var ids = tasks.Select(t => t.SysId).ToList();
        var noteDates = await _context.TaskNotes
            .Where(n => ids.Contains(n.TaskItemSysId))
            .Select(n => new { n.TaskItemSysId, n.CreateTimestamp })
            .ToListAsync();

        var lastNoteDates = noteDates
            .GroupBy(n => n.TaskItemSysId)
            .ToDictionary(g => g.Key, g => (DateTime?)g.Max(n => n.CreateTimestamp));

        return tasks.Select(t => MapToResponse(t, lastNoteDates.GetValueOrDefault(t.SysId))).ToList();
    }

    private async Task<DateTime?> GetLastNoteDateAsync(long taskId)
    {
        return await _context.TaskNotes
            .Where(n => n.TaskItemSysId == taskId)
            .OrderByDescending(n => n.CreateTimestamp)
            .Select(n => (DateTime?)n.CreateTimestamp)
            .FirstOrDefaultAsync();
    }

    private static TaskItemResponse MapToResponse(TaskItem task, DateTime? lastNoteDate)
    {
        return new TaskItemResponse(
            task.SysId,
            task.Name,
            task.Description,
            task.Priority.ToString(),
            task.DueDate,
            task.SortOrder,
            task.IsCompleted,
            task.CompletedDate,
            task.FlagColor,
            // Aggregate results bypass the context's UTC value converter, so tag the kind here.
            lastNoteDate.HasValue ? DateTime.SpecifyKind(lastNoteDate.Value, DateTimeKind.Utc) : null,
            task.TaskBoardSysId,
            task.TaskBoard?.Name,
            task.TaskBoardColumnSysId,
            task.TaskBoardColumn?.Name,
            task.CreateTimestamp,
            task.ModifyTimestamp
        );
    }
}
