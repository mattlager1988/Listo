using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IAudioStreamCategoryService
{
    Task<IEnumerable<AudioStreamCategoryResponse>> GetAllAsync(bool includeDeleted = false);
    Task<AudioStreamCategoryResponse?> GetByIdAsync(long id);
    Task<AudioStreamCategoryResponse> CreateAsync(CreateAudioStreamCategoryRequest request);
    Task<AudioStreamCategoryResponse?> UpdateAsync(long id, UpdateAudioStreamCategoryRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class AudioStreamCategoryService : IAudioStreamCategoryService
{
    private readonly ListoDbContext _context;

    public AudioStreamCategoryService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AudioStreamCategoryResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.AudioStreamCategories.AsQueryable();
        if (!includeDeleted)
            query = query.Where(c => !c.IsDeleted);

        return await query
            .OrderBy(c => c.Name)
            .Select(c => new AudioStreamCategoryResponse(
                c.SysId,
                c.Name,
                c.IsDeleted,
                _context.AudioStreams.Count(s => s.Category == c.Name)
            ))
            .ToListAsync();
    }

    public async Task<AudioStreamCategoryResponse?> GetByIdAsync(long id)
    {
        var category = await _context.AudioStreamCategories.FindAsync(id);
        if (category == null) return null;

        return new AudioStreamCategoryResponse(
            category.SysId, category.Name, category.IsDeleted,
            await _context.AudioStreams.CountAsync(s => s.Category == category.Name));
    }

    public async Task<AudioStreamCategoryResponse> CreateAsync(CreateAudioStreamCategoryRequest request)
    {
        if (await _context.AudioStreamCategories.AnyAsync(c => c.Name == request.Name && !c.IsDeleted))
            throw new InvalidOperationException("A category with this name already exists");

        var category = new AudioStreamCategory { Name = request.Name };
        _context.AudioStreamCategories.Add(category);
        await _context.SaveChangesAsync();

        return new AudioStreamCategoryResponse(category.SysId, category.Name, category.IsDeleted, 0);
    }

    public async Task<AudioStreamCategoryResponse?> UpdateAsync(long id, UpdateAudioStreamCategoryRequest request)
    {
        var category = await _context.AudioStreamCategories.FindAsync(id);
        if (category == null) return null;

        if (request.Name != null)
        {
            if (await _context.AudioStreamCategories.AnyAsync(c => c.Name == request.Name && !c.IsDeleted && c.SysId != id))
                throw new InvalidOperationException("A category with this name already exists");
            category.Name = request.Name;
        }

        await _context.SaveChangesAsync();

        return new AudioStreamCategoryResponse(
            category.SysId, category.Name, category.IsDeleted,
            await _context.AudioStreams.CountAsync(s => s.Category == category.Name));
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var category = await _context.AudioStreamCategories.FindAsync(id);
        if (category == null) return false;

        category.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var category = await _context.AudioStreamCategories.FindAsync(id);
        if (category == null) return false;

        if (await _context.AudioStreamCategories.AnyAsync(c => c.Name == category.Name && !c.IsDeleted && c.SysId != id))
            throw new InvalidOperationException("Cannot restore: an active category with this name already exists");

        category.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var category = await _context.AudioStreamCategories.FindAsync(id);
        if (category == null) return false;

        var streamCount = await _context.AudioStreams.CountAsync(s => s.Category == category.Name);
        if (streamCount > 0)
            throw new InvalidOperationException($"Cannot purge category in use by {streamCount} stream{(streamCount == 1 ? "" : "s")}");

        _context.AudioStreamCategories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }
}
