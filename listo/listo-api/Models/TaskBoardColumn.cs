namespace Listo.Api.Models;

public class TaskBoardColumn : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public long TaskBoardSysId { get; set; }

    public TaskBoard TaskBoard { get; set; } = null!;
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
