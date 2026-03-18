namespace Listo.Api.Models;

public class TaskBoard : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }

    public ICollection<TaskBoardColumn> Columns { get; set; } = new List<TaskBoardColumn>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
