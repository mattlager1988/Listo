using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Listo.Api.Authorization;

/// <summary>
/// Requires that the authenticated user has access to the given module.
/// Admins (role == "admin") bypass the check. Access is read from the "module"
/// claims embedded in the JWT at login. Returns 403 when access is missing.
/// Pair with [Authorize] so unauthenticated requests get 401 first.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class ModuleAccessAttribute : Attribute, IAuthorizationFilter
{
    private readonly string _module;

    public ModuleAccessAttribute(string module) => _module = module;

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        // Let [Authorize] handle the 401 for unauthenticated requests.
        if (user?.Identity?.IsAuthenticated != true)
            return;

        if (user.IsInRole("admin"))
            return;

        var hasAccess = user.Claims.Any(c =>
            c.Type == "module" &&
            string.Equals(c.Value, _module, StringComparison.OrdinalIgnoreCase));

        if (!hasAccess)
            context.Result = new ForbidResult();
    }
}
