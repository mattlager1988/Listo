namespace Listo.Api.Models;

public class ScratchNote : BaseEntity
{
    public string Content { get; set; } = string.Empty;

    // Set when the note has been promoted into a task
    public bool IsConverted { get; set; } = false;
    public DateTime? ConvertedDate { get; set; }

    // Id of the TaskItem created on convert (plain column, no FK so deleting the
    // task does not cascade back to the note)
    public long? ConvertedTaskSysId { get; set; }
}
