namespace Listo.Api.Models;

public class AccountOwner : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
