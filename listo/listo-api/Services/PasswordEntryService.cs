using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IPasswordEntryService
{
    Task<IEnumerable<PasswordEntryResponse>> GetAllAsync(long userId);
    Task<PasswordEntryResponse?> GetByIdAsync(long id, long userId);
    Task<PasswordEntryResponse> CreateAsync(CreatePasswordEntryRequest request, long userId);
    Task<PasswordEntryResponse?> UpdateAsync(long id, UpdatePasswordEntryRequest request, long userId);
    Task<bool> DeleteAsync(long id, long userId);
    Task<PasswordEntryResponse?> ToggleFavoriteAsync(long id, long userId);
}

public class PasswordEntryService : IPasswordEntryService
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public PasswordEntryService(ListoDbContext context, IEncryptionService encryptionService)
    {
        _context = context;
        _encryptionService = encryptionService;
    }

    public async Task<IEnumerable<PasswordEntryResponse>> GetAllAsync(long userId)
    {
        var entries = await _context.PasswordEntries
            .Include(e => e.Category)
            .Where(e => e.UserSysId == userId)
            .OrderByDescending(e => e.IsFavorite)
            .ThenBy(e => e.Title)
            .ToListAsync();

        return entries.Select(MapToResponse);
    }

    public async Task<PasswordEntryResponse?> GetByIdAsync(long id, long userId)
    {
        var entry = await _context.PasswordEntries
            .Include(e => e.Category)
            .FirstOrDefaultAsync(e => e.SysId == id && e.UserSysId == userId);

        return entry == null ? null : MapToResponse(entry);
    }

    public async Task<PasswordEntryResponse> CreateAsync(CreatePasswordEntryRequest request, long userId)
    {
        var entry = new PasswordEntry
        {
            Title = request.Title,
            Url = request.Url,
            EncryptedUsername = string.IsNullOrEmpty(request.Username)
                ? null
                : _encryptionService.Encrypt(request.Username),
            EncryptedPassword = string.IsNullOrEmpty(request.Password)
                ? null
                : _encryptionService.Encrypt(request.Password),
            EncryptedNotes = string.IsNullOrEmpty(request.Notes)
                ? null
                : _encryptionService.Encrypt(request.Notes),
            IsFavorite = request.IsFavorite,
            CategorySysId = request.CategorySysId,
            UserSysId = userId,
        };

        _context.PasswordEntries.Add(entry);
        await _context.SaveChangesAsync();

        if (entry.CategorySysId.HasValue)
            await _context.Entry(entry).Reference(e => e.Category).LoadAsync();

        return MapToResponse(entry);
    }

    public async Task<PasswordEntryResponse?> UpdateAsync(long id, UpdatePasswordEntryRequest request, long userId)
    {
        var entry = await _context.PasswordEntries
            .Include(e => e.Category)
            .FirstOrDefaultAsync(e => e.SysId == id && e.UserSysId == userId);

        if (entry == null) return null;

        if (request.Title != null) entry.Title = request.Title;
        if (request.Url != null) entry.Url = request.Url;
        if (request.Username != null)
        {
            entry.EncryptedUsername = string.IsNullOrEmpty(request.Username)
                ? null
                : _encryptionService.Encrypt(request.Username);
        }
        if (request.Password != null)
        {
            entry.EncryptedPassword = string.IsNullOrEmpty(request.Password)
                ? null
                : _encryptionService.Encrypt(request.Password);
        }
        if (request.Notes != null)
        {
            entry.EncryptedNotes = string.IsNullOrEmpty(request.Notes)
                ? null
                : _encryptionService.Encrypt(request.Notes);
        }
        if (request.IsFavorite.HasValue) entry.IsFavorite = request.IsFavorite.Value;
        if (request.CategorySysId.HasValue) entry.CategorySysId = request.CategorySysId.Value == 0 ? null : request.CategorySysId.Value;

        await _context.SaveChangesAsync();

        if (entry.CategorySysId.HasValue)
            await _context.Entry(entry).Reference(e => e.Category).LoadAsync();

        return MapToResponse(entry);
    }

    public async Task<bool> DeleteAsync(long id, long userId)
    {
        var entry = await _context.PasswordEntries
            .FirstOrDefaultAsync(e => e.SysId == id && e.UserSysId == userId);

        if (entry == null) return false;

        _context.PasswordEntries.Remove(entry);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PasswordEntryResponse?> ToggleFavoriteAsync(long id, long userId)
    {
        var entry = await _context.PasswordEntries
            .Include(e => e.Category)
            .FirstOrDefaultAsync(e => e.SysId == id && e.UserSysId == userId);

        if (entry == null) return null;

        entry.IsFavorite = !entry.IsFavorite;
        await _context.SaveChangesAsync();

        return MapToResponse(entry);
    }

    private PasswordEntryResponse MapToResponse(PasswordEntry entry) => new(
        entry.SysId,
        entry.Title,
        entry.Url,
        string.IsNullOrEmpty(entry.EncryptedUsername)
            ? null
            : _encryptionService.Decrypt(entry.EncryptedUsername),
        string.IsNullOrEmpty(entry.EncryptedPassword)
            ? null
            : _encryptionService.Decrypt(entry.EncryptedPassword),
        string.IsNullOrEmpty(entry.EncryptedNotes)
            ? null
            : _encryptionService.Decrypt(entry.EncryptedNotes),
        entry.IsFavorite,
        entry.CategorySysId,
        entry.Category?.Name,
        entry.CreateTimestamp,
        entry.ModifyTimestamp
    );
}
