namespace Listo.Api.Models;

public class DocumentType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    // Navigation property for usage tracking
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}
