using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Listo.Api.Services;

public interface ISettingsService
{
    Task<IEnumerable<SettingCategoryResponse>> GetAllGroupedAsync();
    Task<string?> GetValueAsync(string key, string? defaultValue = null);
    Task<int> GetIntValueAsync(string key, int defaultValue = 0);
    Task<string[]> GetArrayValueAsync(string key, string[]? defaultValue = null);
    Task<SettingResponse?> UpdateSettingAsync(string key, string? value);
    Task<IEnumerable<SettingResponse>> BulkUpdateSettingsAsync(Dictionary<string, string?> settings);
    void InvalidateCache();
}

public class SettingsService : ISettingsService
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IMemoryCache _cache;
    private const string CacheKey = "AllSettings";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    public SettingsService(
        ListoDbContext context,
        IEncryptionService encryptionService,
        IMemoryCache cache)
    {
        _context = context;
        _encryptionService = encryptionService;
        _cache = cache;
    }

    public async Task<IEnumerable<SettingCategoryResponse>> GetAllGroupedAsync()
    {
        var settings = await _context.Settings
            .OrderBy(s => s.Category)
            .ThenBy(s => s.SortOrder)
            .ToListAsync();

        return settings
            .GroupBy(s => s.Category)
            .Select(g => new SettingCategoryResponse(
                g.Key,
                g.Select(s => MapToResponse(s, maskSensitive: true))
            ));
    }

    public async Task<string?> GetValueAsync(string key, string? defaultValue = null)
    {
        var settings = await GetCachedSettingsAsync();
        var setting = settings.FirstOrDefault(s => s.Key == key);

        if (setting == null || string.IsNullOrEmpty(setting.Value))
            return defaultValue;

        if (setting.IsSensitive)
        {
            try
            {
                return _encryptionService.Decrypt(setting.Value);
            }
            catch
            {
                // If decryption fails, return the raw value (might be unencrypted legacy data)
                return setting.Value;
            }
        }

        return setting.Value;
    }

    public async Task<int> GetIntValueAsync(string key, int defaultValue = 0)
    {
        var value = await GetValueAsync(key);
        return int.TryParse(value, out var result) ? result : defaultValue;
    }

    public async Task<string[]> GetArrayValueAsync(string key, string[]? defaultValue = null)
    {
        var value = await GetValueAsync(key);
        if (string.IsNullOrEmpty(value))
            return defaultValue ?? Array.Empty<string>();

        return value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    public async Task<SettingResponse?> UpdateSettingAsync(string key, string? value)
    {
        var setting = await _context.Settings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null)
            return null;

        if (setting.IsSensitive && !string.IsNullOrEmpty(value))
        {
            setting.Value = _encryptionService.Encrypt(value);
        }
        else
        {
            setting.Value = value;
        }

        await _context.SaveChangesAsync();
        InvalidateCache();

        return MapToResponse(setting, maskSensitive: true);
    }

    public async Task<IEnumerable<SettingResponse>> BulkUpdateSettingsAsync(Dictionary<string, string?> settings)
    {
        var keys = settings.Keys.ToList();
        var dbSettings = await _context.Settings
            .Where(s => keys.Contains(s.Key))
            .ToListAsync();

        foreach (var setting in dbSettings)
        {
            if (!settings.TryGetValue(setting.Key, out var newValue))
                continue;

            // Skip if the value is the masked placeholder for sensitive fields
            if (setting.IsSensitive && newValue == "********")
                continue;

            if (setting.IsSensitive && !string.IsNullOrEmpty(newValue))
            {
                setting.Value = _encryptionService.Encrypt(newValue);
            }
            else
            {
                setting.Value = newValue;
            }
        }

        await _context.SaveChangesAsync();
        InvalidateCache();

        return dbSettings.Select(s => MapToResponse(s, maskSensitive: true));
    }

    public void InvalidateCache()
    {
        _cache.Remove(CacheKey);
    }

    private async Task<List<Setting>> GetCachedSettingsAsync()
    {
        if (!_cache.TryGetValue(CacheKey, out List<Setting>? settings))
        {
            settings = await _context.Settings.AsNoTracking().ToListAsync();
            _cache.Set(CacheKey, settings, CacheDuration);
        }
        return settings!;
    }

    private static SettingResponse MapToResponse(Setting s, bool maskSensitive)
    {
        var value = s.Value;
        if (maskSensitive && s.IsSensitive && !string.IsNullOrEmpty(value))
        {
            value = "********";
        }

        return new SettingResponse(
            s.SysId,
            s.Key,
            value,
            s.Category,
            s.DisplayName,
            s.Description,
            s.ValueType,
            s.IsSensitive,
            s.SortOrder
        );
    }
}
