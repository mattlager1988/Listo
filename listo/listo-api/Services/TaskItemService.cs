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
    Task<TaskItemResponse?> MoveToBacklogAsync(long id);
    Task<TaskItemResponse?> CompleteAsync(long id);
    Task<TaskItemResponse?> UncompleteAsync(long id);
    Task<bool> MoveTaskAsync(long id, MoveTaskRequest request);
    Task<bool> ReorderTasksAsync(ReorderTasksRequest request);
}

public class TaskItemService : ITaskItemService
{
    private readonly ListoDbContext _context;

    public TaskItemService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TaskItemResponse>> GetBacklogAsync()
    {
        var tasks = await _context.TaskItems
            .Where(t => t.TaskBoardSysId == null && !t.IsCompleted)
            .OrderBy(t => t.SortOrder)
            .ThenByDescending(t => t.CreateTimestamp)
            .ToListAsync();

        return tasks.Select(MapToResponse);
    }

    public async Task<IEnumerable<TaskItemResponse>> GetByBoardAsync(long boardId)
    {
        var tasks = await _context.TaskItems
            .Include(t => t.TaskBoardColumn)
            .Where(t => t.TaskBoardSysId == boardId && !t.IsCompleted)
            .OrderBy(t => t.SortOrder)
            .ToListAsync();

        return tasks.Select(MapToResponse);
    }

    public async Task<IEnumerable<TaskItemResponse>> GetCompletedAsync()
    {
        var tasks = await _context.TaskItems
            .Include(t => t.TaskBoard)
            .Include(t => t.TaskBoardColumn)
            .Where(t => t.IsCompleted)
            .OrderByDescending(t => t.CompletedDate)
            .ToListAsync();

        return tasks.Select(MapToResponse);
    }

    public async Task<TaskItemResponse?> GetByIdAsync(long id)
    {
        var task = await _context.TaskItems
            .Include(t => t.TaskBoard)
            .Include(t => t.TaskBoardColumn)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return task == null ? null : MapToResponse(task);
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

        _context.TaskItems.Add(task);
        await _context.SaveChangesAsync();

        return MapToResponse(task);
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
        return MapToResponse(task);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var task = await _context.TaskItems.FindAsync(id);
        if (task == null) return false;

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

    private static TaskItemResponse MapToResponse(TaskItem task)
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
            task.TaskBoardSysId,
            task.TaskBoard?.Name,
            task.TaskBoardColumnSysId,
            task.TaskBoardColumn?.Name,
            task.CreateTimestamp,
            task.ModifyTimestamp
        );
    }
}
