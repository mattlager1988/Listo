using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Listo.Api.Data;
using Listo.Api.Hubs;
using Listo.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel for large file uploads (512MB to accommodate video attachments)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 536_870_912; // 512MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(10);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(10);
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR();

// Configure form options for large file uploads
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 536_870_912; // 512MB
});
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();

// Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ListoDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            // Tighten the default 5-minute grace period so short-lived access
            // tokens expire close to their stated lifetime.
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Browsers can't set Authorization headers on the WebSocket handshake,
        // so SignalR passes the token via the access_token query string.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IAccountTypeService, AccountTypeService>();
builder.Services.AddScoped<IAccountOwnerService, AccountOwnerService>();
builder.Services.AddScoped<ISavedViewService, SavedViewService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<ITrainingTypeService, TrainingTypeService>();
builder.Services.AddScoped<IAircraftService, AircraftService>();
builder.Services.AddScoped<ITrainingLogService, TrainingLogService>();
builder.Services.AddScoped<IDocumentTypeService, DocumentTypeService>();
builder.Services.AddScoped<INoteService, NoteService>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IOpenAIService, OpenAIService>();
builder.Services.AddScoped<IAiPromptService, AiPromptService>();
builder.Services.AddScoped<IPaymentMethodService, PaymentMethodService>();
builder.Services.AddScoped<IBankAccountService, BankAccountService>();
builder.Services.AddScoped<ILedgerTransactionService, LedgerTransactionService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<ICycleGoalService, CycleGoalService>();
builder.Services.AddScoped<ICyclePlanService, CyclePlanService>();
builder.Services.AddScoped<ICycleTransactionService, CycleTransactionService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IPasswordCategoryService, PasswordCategoryService>();
builder.Services.AddScoped<IPasswordEntryService, PasswordEntryService>();
builder.Services.AddScoped<ITaskBoardService, TaskBoardService>();
builder.Services.AddScoped<ITaskItemService, TaskItemService>();
builder.Services.AddScoped<IScratchNoteService, ScratchNoteService>();
builder.Services.AddScoped<IAudioStreamService, AudioStreamService>();
builder.Services.AddScoped<IAudioStreamCategoryService, AudioStreamCategoryService>();
builder.Services.AddScoped<ITranscriptionService, TranscriptionService>();
builder.Services.AddSingleton<ITranscriptionSessionManager, TranscriptionSessionManager>();
builder.Services.AddScoped<IMessagingService, MessagingService>();
builder.Services.AddSingleton<IPresenceTracker, PresenceTracker>();
builder.Services.AddHttpClient<IPushoverService, PushoverService>(c => c.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddHostedService<UnreadNotificationService>();

// CORS — allowed browser origins are config-driven so the web and mobile apps'
// production origins can be listed per environment (defaults to local dev origins).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Honor X-Forwarded-* from the reverse proxy so RemoteIpAddress (used by the rate
// limiter) and Request.IsHttps (used by HSTS) reflect the real client. By default
// only loopback proxies are trusted — correct when the proxy runs on the same host
// over localhost. To trust a proxy on another address, list its IP(s) under
// ForwardedHeaders:KnownProxies; that clears the defaults and trusts only those.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    var knownProxies = builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
    if (knownProxies is { Length: > 0 })
    {
        options.KnownProxies.Clear();
        options.KnownNetworks.Clear();
        foreach (var proxy in knownProxies)
        {
            if (IPAddress.TryParse(proxy, out var ip))
                options.KnownProxies.Add(ip);
        }
    }
});

// Rate limiting for authentication endpoints to blunt brute-force / credential
// stuffing. Partitioned by client IP. Note: behind a reverse proxy, configure
// forwarded headers so RemoteIpAddress reflects the real client (see issue #11).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Stricter window for the brute-force-sensitive endpoints (login, MFA verify).
    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // More lenient window for token refresh, which legitimate clients call often.
    options.AddPolicy("refresh", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.Headers.RetryAfter = "60";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Too many requests. Please wait a moment and try again." }, token);
    };
});

var app = builder.Build();

// Apply forwarded headers before anything reads the client IP or scheme.
app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // TLS terminates at the reverse proxy; the proxy handles HTTP->HTTPS redirects.
    // HSTS is emitted on requests the proxy forwards as https (via X-Forwarded-Proto).
    app.UseHsts();
}

// Baseline security response headers on every response.
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<MessagingHub>("/hubs/messaging");

// Seed initial admin user
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ListoDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    if (!context.Users.Any())
    {
        var adminConfig = config.GetSection("InitialAdmin");
        var adminUser = new Listo.Api.Models.User
        {
            Email = adminConfig["Email"]!,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminConfig["Password"]!),
            FirstName = adminConfig["FirstName"]!,
            LastName = adminConfig["LastName"]!,
            Role = "admin",
            IsActive = true
        };
        context.Users.Add(adminUser);
        context.SaveChanges();
    }
}

app.Run();
