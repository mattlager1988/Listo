using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Listo.Api.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<ListoDbContext>
{
    public ListoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<ListoDbContext>();

        // Use a dummy connection string for design-time operations
        // The actual connection will be configured at runtime
        var connectionString = "Server=localhost;Database=listo;User=listo;Password=dummy;";
        var serverVersion = new MySqlServerVersion(new Version(8, 0, 36));

        optionsBuilder.UseMySql(connectionString, serverVersion);

        // Create a mock HttpContextAccessor for design-time
        var httpContextAccessor = new Microsoft.AspNetCore.Http.HttpContextAccessor();

        return new ListoDbContext(optionsBuilder.Options, httpContextAccessor);
    }
}
