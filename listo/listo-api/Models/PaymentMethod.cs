namespace Listo.Api.Models;

public class PaymentMethod : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
