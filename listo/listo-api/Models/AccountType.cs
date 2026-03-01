namespace Listo.Api.Models;

public class AccountType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
