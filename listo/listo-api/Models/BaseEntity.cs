namespace Listo.Api.Models;

public abstract class BaseEntity
{
    public long SysId { get; set; }
    public DateTime CreateTimestamp { get; set; }
    public DateTime ModifyTimestamp { get; set; }
    public long? CreateUser { get; set; }
    public long? ModifyUser { get; set; }
}
