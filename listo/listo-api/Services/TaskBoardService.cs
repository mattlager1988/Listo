using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ITaskBoardService
{
    Task<IEnumerable<TaskBoardSummaryResponse>> GetAllAsync();
    Task<TaskBoardResponse?> GetByIdAsync(long id);
    Task<TaskBoardResponse> CreateAsync(CreateTaskBoardRequest request);
    Task<TaskBoardResponse?> UpdateAsync(long id, UpdateTaskBoardRequest request);
    Task<bool> DeleteAsync(long id);

    // Column management
    Task<TaskBoardColumnResponse?> AddColumnAsync(long boardId, CreateTaskBoardColumnRequest request);
    Task<TaskBoardColumnResponse?> UpdateColumnAsync(long boardId, long columnId, UpdateTaskBoardColumnRequest request);
    Task<bool> DeleteColumnAsync(long boardId, long columnId);
    Task<bool> ReorderColumnsAsync(long boardId, ReorderColumnsRequest request);
}

public class TaskBoardService : ITaskBoardService
{
    private readonly ListoDbContext _context;

    public TaskBoardService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TaskBoardSummaryResponse>> GetAllAsync()
    {
        var boards = await _context.TaskBoards
            .Include(b => b.Tasks)
            .Include(b => b.Columns)
            .OrderBy(b => b.Name)
            .ToListAsync();

        return boards.Select(b => new TaskBoardSummaryResponse(
            b.SysId,
            b.Name,
            b.Color,
            b.Tasks.Count(t => !t.IsCompleted),
            b.Columns.Count
        ));
    }

    public async Task<TaskBoardResponse?> GetByIdAsync(long id)
    {
        var board = await _context.TaskBoards
            .Include(b => b.Columns.OrderBy(c => c.SortOrder))
                .ThenInclude(c => c.Tasks)
            .Include(b => b.Tasks)
            .FirstOrDefaultAsync(b => b.SysId == id);

        if (board == null) return null;

        return MapToResponse(board);
    }

    public async Task<TaskBoardResponse> CreateAsync(CreateTaskBoardRequest request)
    {
        var board = new TaskBoard
        {
            Name = request.Name,
            Color = request.Color
        };

        _context.TaskBoards.Add(board);
        await _context.SaveChangesAsync();

        // Create initial columns if provided, otherwise create defaults
        var columnNames = request.Columns?.Count > 0
            ? request.Columns
            : new List<string> { "To Do", "In Progress", "Done" };

        for (int i = 0; i < columnNames.Count; i++)
        {
            _context.TaskBoardColumns.Add(new TaskBoardColumn
            {
                Name = columnNames[i],
                SortOrder = i,
                TaskBoardSysId = board.SysId
            });
        }

        await _context.SaveChangesAsync();

        // Reload with includes
        return (await GetByIdAsync(board.SysId))!;
    }

    public async Task<TaskBoardResponse?> UpdateAsync(long id, UpdateTaskBoardRequest request)
    {
        var board = await _context.TaskBoards.FindAsync(id);
        if (board == null) return null;

        if (request.Name != null) board.Name = request.Name;
        if (request.Color != null) board.Color = request.Color;

        await _context.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var board = await _context.TaskBoards
            .Include(b => b.Tasks)
            .Include(b => b.Columns)
            .FirstOrDefaultAsync(b => b.SysId == id);

        if (board == null) return false;

        // Unassign all tasks from this board (return to backlog)
        foreach (var task in board.Tasks)
        {
            task.TaskBoardSysId = null;
            task.TaskBoardColumnSysId = null;
        }

        await _context.SaveChangesAsync();

        // Now delete the board (columns cascade-delete)
        _context.TaskBoards.Remove(board);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<TaskBoardColumnResponse?> AddColumnAsync(long boardId, CreateTaskBoardColumnRequest request)
    {
        var board = await _context.TaskBoards
            .Include(b => b.Columns)
            .FirstOrDefaultAsync(b => b.SysId == boardId);

        if (board == null) return null;

        var maxOrder = board.Columns.Any() ? board.Columns.Max(c => c.SortOrder) : -1;

        var column = new TaskBoardColumn
        {
            Name = request.Name,
            SortOrder = maxOrder + 1,
            TaskBoardSysId = boardId
        };

        _context.TaskBoardColumns.Add(column);
        await _context.SaveChangesAsync();

        return new TaskBoardColumnResponse(column.SysId, column.Name, column.SortOrder, 0);
    }

    public async Task<TaskBoardColumnResponse?> UpdateColumnAsync(long boardId, long columnId, UpdateTaskBoardColumnRequest request)
    {
        var column = await _context.TaskBoardColumns
            .Include(c => c.Tasks)
            .FirstOrDefaultAsync(c => c.SysId == columnId && c.TaskBoardSysId == boardId);

        if (column == null) return null;

        if (request.Name != null) column.Name = request.Name;

        await _context.SaveChangesAsync();

        return new TaskBoardColumnResponse(column.SysId, column.Name, column.SortOrder, column.Tasks.Count(t => !t.IsCompleted));
    }

    public async Task<bool> DeleteColumnAsync(long boardId, long columnId)
    {
        var column = await _context.TaskBoardColumns
            .Include(c => c.Tasks)
            .FirstOrDefaultAsync(c => c.SysId == columnId && c.TaskBoardSysId == boardId);

        if (column == null) return false;

        // Move tasks in this column to the first remaining column
        var firstColumn = await _context.TaskBoardColumns
            .Where(c => c.TaskBoardSysId == boardId && c.SysId != columnId)
            .OrderBy(c => c.SortOrder)
            .FirstOrDefaultAsync();

        foreach (var task in column.Tasks)
        {
            if (firstColumn != null)
            {
                task.TaskBoardColumnSysId = firstColumn.SysId;
            }
            else
            {
                // No other columns - return tasks to backlog
                task.TaskBoardSysId = null;
                task.TaskBoardColumnSysId = null;
            }
        }

        _context.TaskBoardColumns.Remove(column);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ReorderColumnsAsync(long boardId, ReorderColumnsRequest request)
    {
        var columns = await _context.TaskBoardColumns
            .Where(c => c.TaskBoardSysId == boardId)
            .ToListAsync();

        for (int i = 0; i < request.ColumnSysIds.Count; i++)
        {
            var column = columns.FirstOrDefault(c => c.SysId == request.ColumnSysIds[i]);
            if (column != null) column.SortOrder = i;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    private static TaskBoardResponse MapToResponse(TaskBoard board)
    {
        return new TaskBoardResponse(
            board.SysId,
            board.Name,
            board.Color,
            board.Tasks.Count(t => !t.IsCompleted),
            board.Columns.OrderBy(c => c.SortOrder).Select(c => new TaskBoardColumnResponse(
                c.SysId,
                c.Name,
                c.SortOrder,
                c.Tasks.Count(t => !t.IsCompleted)
            )).ToList()
        );
    }
}
