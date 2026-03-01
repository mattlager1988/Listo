using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ISavedViewService
{
    Task<IEnumerable<SavedViewResponse>> GetAllForUserAsync(long userId, string viewType);
    Task<SavedViewResponse?> GetByIdAsync(long id);
    Task<SavedViewResponse> CreateAsync(long userId, CreateSavedViewRequest request);
    Task<SavedViewResponse?> UpdateAsync(long id, UpdateSavedViewRequest request);
    Task<bool> DeleteAsync(long id);
}

public class SavedViewService : ISavedViewService
{
    private readonly ListoDbContext _context;

    public SavedViewService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SavedViewResponse>> GetAllForUserAsync(long userId, string viewType)
    {
        return await _context.SavedViews
            .Where(v => v.UserSysId == userId && v.ViewType == viewType)
            .Select(v => new SavedViewResponse(
                v.SysId,
                v.Name,
                v.ViewType,
                v.Configuration,
                v.IsDefault
            ))
            .ToListAsync();
    }

    public async Task<SavedViewResponse?> GetByIdAsync(long id)
    {
        var view = await _context.SavedViews.FindAsync(id);
        return view == null ? null : new SavedViewResponse(
            view.SysId,
            view.Name,
            view.ViewType,
            view.Configuration,
            view.IsDefault
        );
    }

    public async Task<SavedViewResponse> CreateAsync(long userId, CreateSavedViewRequest request)
    {
        // If setting as default, unset other defaults for this view type
        if (request.IsDefault)
        {
            var existingDefaults = await _context.SavedViews
                .Where(v => v.UserSysId == userId && v.ViewType == request.ViewType && v.IsDefault)
                .ToListAsync();
            foreach (var v in existingDefaults)
                v.IsDefault = false;
        }

        var view = new SavedView
        {
            Name = request.Name,
            ViewType = request.ViewType,
            Configuration = request.Configuration,
            UserSysId = userId,
            IsDefault = request.IsDefault
        };

        _context.SavedViews.Add(view);
        await _context.SaveChangesAsync();

        return new SavedViewResponse(view.SysId, view.Name, view.ViewType, view.Configuration, view.IsDefault);
    }

    public async Task<SavedViewResponse?> UpdateAsync(long id, UpdateSavedViewRequest request)
    {
        var view = await _context.SavedViews.FindAsync(id);
        if (view == null) return null;

        if (request.Name != null) view.Name = request.Name;
        if (request.Configuration != null) view.Configuration = request.Configuration;
        if (request.IsDefault.HasValue)
        {
            if (request.IsDefault.Value)
            {
                // Unset other defaults
                var existingDefaults = await _context.SavedViews
                    .Where(v => v.UserSysId == view.UserSysId && v.ViewType == view.ViewType && v.IsDefault && v.SysId != id)
                    .ToListAsync();
                foreach (var v in existingDefaults)
                    v.IsDefault = false;
            }
            view.IsDefault = request.IsDefault.Value;
        }

        await _context.SaveChangesAsync();
        return new SavedViewResponse(view.SysId, view.Name, view.ViewType, view.Configuration, view.IsDefault);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var view = await _context.SavedViews.FindAsync(id);
        if (view == null) return false;

        _context.SavedViews.Remove(view);
        await _context.SaveChangesAsync();
        return true;
    }
}
