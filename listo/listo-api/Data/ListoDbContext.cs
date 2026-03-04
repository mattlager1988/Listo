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
    public DbSet<AccountType> AccountTypes => Set<AccountType>();
    public DbSet<AccountOwner> AccountOwners => Set<AccountOwner>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<SavedView> SavedViews => Set<SavedView>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<TrainingType> TrainingTypes => Set<TrainingType>();
    public DbSet<Aircraft> Aircraft => Set<Aircraft>();
    public DbSet<TrainingLog> TrainingLogs => Set<TrainingLog>();
    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Setting> Settings => Set<Setting>();

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

        modelBuilder.Entity<AccountType>(entity =>
        {
            entity.ToTable("account_types");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<AccountOwner>(entity =>
        {
            entity.ToTable("account_owners");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("accounts");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.AccountTypeSysId).HasColumnName("account_type_sys_id");
            entity.Property(e => e.AccountOwnerSysId).HasColumnName("account_owner_sys_id");
            entity.Property(e => e.AmountDue).HasColumnName("amount_due").HasPrecision(18, 2);
            entity.Property(e => e.DueDate).HasColumnName("due_date");
            entity.Property(e => e.AccountNumber).HasColumnName("account_number");
            entity.Property(e => e.PhoneNumber).HasColumnName("phone_number");
            entity.Property(e => e.WebAddress).HasColumnName("web_address");
            entity.Property(e => e.Username).HasColumnName("username");
            entity.Property(e => e.EncryptedPassword).HasColumnName("encrypted_password");
            entity.Property(e => e.AutoPay).HasColumnName("auto_pay");
            entity.Property(e => e.ResetAmountDue).HasColumnName("reset_amount_due");
            entity.Property(e => e.AccountFlag).HasColumnName("account_flag")
                .HasConversion<string>();
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasOne(e => e.AccountType)
                .WithMany(t => t.Accounts)
                .HasForeignKey(e => e.AccountTypeSysId);
            entity.HasOne(e => e.AccountOwner)
                .WithMany(o => o.Accounts)
                .HasForeignKey(e => e.AccountOwnerSysId);
        });

        modelBuilder.Entity<SavedView>(entity =>
        {
            entity.ToTable("saved_views");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.ViewType).HasColumnName("view_type").IsRequired();
            entity.Property(e => e.Configuration).HasColumnName("configuration").IsRequired();
            entity.Property(e => e.UserSysId).HasColumnName("user_sys_id");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserSysId);
            entity.HasIndex(e => new { e.UserSysId, e.ViewType, e.Name }).IsUnique();
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.FileName).HasColumnName("file_name").IsRequired();
            entity.Property(e => e.OriginalFileName).HasColumnName("original_file_name").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.MimeType).HasColumnName("mime_type").IsRequired();
            entity.Property(e => e.FileSize).HasColumnName("file_size");
            entity.Property(e => e.StoragePath).HasColumnName("storage_path").IsRequired();
            entity.Property(e => e.Module).HasColumnName("module").IsRequired();
            entity.Property(e => e.EntityType).HasColumnName("entity_type").IsRequired();
            entity.Property(e => e.EntitySysId).HasColumnName("entity_sys_id");
            entity.Property(e => e.UploadedBySysId).HasColumnName("uploaded_by_sys_id");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");

            entity.Property(e => e.DocumentTypeSysId).HasColumnName("document_type_sys_id");

            entity.HasOne(e => e.UploadedBy)
                .WithMany()
                .HasForeignKey(e => e.UploadedBySysId);

            entity.HasOne(e => e.DocumentType)
                .WithMany(t => t.Documents)
                .HasForeignKey(e => e.DocumentTypeSysId);

            entity.HasIndex(e => new { e.Module, e.EntityType, e.EntitySysId });
        });

        modelBuilder.Entity<DocumentType>(entity =>
        {
            entity.ToTable("document_types");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<TrainingType>(entity =>
        {
            entity.ToTable("training_types");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        modelBuilder.Entity<Aircraft>(entity =>
        {
            entity.ToTable("aircraft");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.PlaneId).HasColumnName("plane_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.PlaneId).IsUnique();
        });

        modelBuilder.Entity<TrainingLog>(entity =>
        {
            entity.ToTable("training_logs");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("text");
            entity.Property(e => e.HoursFlown).HasColumnName("hours_flown").HasPrecision(5, 2);
            entity.Property(e => e.UserSysId).HasColumnName("user_sys_id");
            entity.Property(e => e.TrainingTypeSysId).HasColumnName("training_type_sys_id");
            entity.Property(e => e.AircraftSysId).HasColumnName("aircraft_sys_id");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserSysId);

            entity.HasOne(e => e.TrainingType)
                .WithMany(t => t.TrainingLogs)
                .HasForeignKey(e => e.TrainingTypeSysId);

            entity.HasOne(e => e.Aircraft)
                .WithMany(a => a.TrainingLogs)
                .HasForeignKey(e => e.AircraftSysId);

            entity.HasIndex(e => e.UserSysId);
            entity.HasIndex(e => e.Date);
        });

        modelBuilder.Entity<Note>(entity =>
        {
            entity.ToTable("notes");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Subject).HasColumnName("subject").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description").HasColumnType("text");
            entity.Property(e => e.UserSysId).HasColumnName("user_sys_id");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserSysId);

            entity.HasIndex(e => e.UserSysId);
        });

        modelBuilder.Entity<Setting>(entity =>
        {
            entity.ToTable("settings");
            entity.HasKey(e => e.SysId);
            entity.Property(e => e.SysId).HasColumnName("sys_id");
            entity.Property(e => e.Key).HasColumnName("key").IsRequired();
            entity.Property(e => e.Value).HasColumnName("value").HasColumnType("text");
            entity.Property(e => e.Category).HasColumnName("category").IsRequired();
            entity.Property(e => e.DisplayName).HasColumnName("display_name").IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ValueType).HasColumnName("value_type").IsRequired();
            entity.Property(e => e.IsSensitive).HasColumnName("is_sensitive");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.CreateTimestamp).HasColumnName("create_timestamp");
            entity.Property(e => e.ModifyTimestamp).HasColumnName("modify_timestamp");
            entity.Property(e => e.CreateUser).HasColumnName("create_user");
            entity.Property(e => e.ModifyUser).HasColumnName("modify_user");
            entity.HasIndex(e => e.Key).IsUnique();
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
        var user = _httpContextAccessor.HttpContext?.User;
        // Check multiple claim types - JWT "sub" may be mapped to NameIdentifier by ASP.NET Core
        var userIdClaim = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? user?.FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
