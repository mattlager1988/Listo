namespace Listo.Api.Services;

public interface IPushoverService
{
    Task<bool> SendAsync(string userKey, string message, string? title = null, CancellationToken ct = default);
}

public class PushoverService : IPushoverService
{
    private const string Endpoint = "https://api.pushover.net/1/messages.json";

    private readonly HttpClient _http;
    private readonly ISettingsService _settings;
    private readonly ILogger<PushoverService> _logger;

    public PushoverService(HttpClient http, ISettingsService settings, ILogger<PushoverService> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string userKey, string message, string? title = null, CancellationToken ct = default)
    {
        var token = await _settings.GetValueAsync("Pushover:ApiToken");
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(userKey))
            return false;

        try
        {
            var form = new Dictionary<string, string>
            {
                ["token"] = token,
                ["user"] = userKey,
                ["message"] = message,
            };
            if (!string.IsNullOrWhiteSpace(title))
                form["title"] = title;

            using var content = new FormUrlEncodedContent(form);
            var resp = await _http.PostAsync(Endpoint, content, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("Pushover send returned {Status}", (int)resp.StatusCode);
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Pushover send failed");
            return false;
        }
    }
}
