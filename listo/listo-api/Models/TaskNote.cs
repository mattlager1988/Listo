namespace Listo.Api.Models;

// An append-only, timestamped note logged against a task. CreateTimestamp/CreateUser
// (from BaseEntity) provide the timestamp and author; entries are never edited or deleted.
public class TaskNote : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    public long TaskItemSysId { get; set; }
    public TaskItem? TaskItem { get; set; }
}
