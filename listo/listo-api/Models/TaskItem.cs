namespace Listo.Api.Models;

public enum TaskPriority
{
    Low,
    Medium,
    High
}

public class TaskItem : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public DateTime? DueDate { get; set; }
    public int SortOrder { get; set; }
    public bool IsCompleted { get; set; } = false;
    public DateTime? CompletedDate { get; set; }

    // Colour flag set from the board's context menu. Null means unflagged.
    // Stores a colour key (red, orange, yellow, green, blue, purple) so both
    // frontends can pick their own shade.
    public string? FlagColor { get; set; }

    // Nullable - null means task is in backlog
    public long? TaskBoardSysId { get; set; }
    public long? TaskBoardColumnSysId { get; set; }

    public TaskBoard? TaskBoard { get; set; }
    public TaskBoardColumn? TaskBoardColumn { get; set; }
}
