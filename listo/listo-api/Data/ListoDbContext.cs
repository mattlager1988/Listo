using Microsoft.EntityFrameworkCore;
using Listo.Api.Models;

namespace Listo.Api.Data;

public class ListoDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ListoDbContext(DbContextOptions<ListoDbContext> options,
        IHttpContextAccessor httpContextAccessor) : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Email).HasColumnName("email").IsRequired();
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(e => e.FirstName).HasColumnName("first_name").IsRequired();
            entity.Property(e => e.LastName).HasColumnName("last_name").IsRequired();
            entity.Property(e => e.PhoneNumber).HasColumnName("phone_number");
            entity.Property(e => e.Role).HasColumnName("role").IsRequired();
            entity.Property(e => e.MfaEnabled).HasColumnName("mfa_enabled");
            entity.Property(e => e.MfaSecret).HasColumnName("mfa_secret");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.LastLoginAt).HasColumnName("last_login_at");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.UsersSysId).HasColumnName("users_sys_id");
            entity.Property(e => e.Token).HasColumnName("token").IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.Revoked).HasColumnName("revoked");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UsersSysId);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = GetCurrentUserId();
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            if (entry.Entity is BaseEntity entity)
            {
                entity.ModifyTimestamp = DateTime.UtcNow;
                entity.ModifyUser = currentUserId;

                if (entry.State == EntityState.Added)
                {
                    entity.CreateTimestamp = DateTime.UtcNow;
                    entity.CreateUser = currentUserId;
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = _httpContextAccessor.HttpContext?.User
            .FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
