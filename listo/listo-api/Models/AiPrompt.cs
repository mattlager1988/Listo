namespace Listo.Api.Models;

public class AiPrompt : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string PromptText { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;
}
