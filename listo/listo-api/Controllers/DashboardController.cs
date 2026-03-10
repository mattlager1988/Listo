using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary()
    {
        var summary = await _dashboardService.GetSummaryAsync();
        return Ok(summary);
    }

    [HttpGet("layout")]
    public async Task<ActionResult<DashboardLayoutDto>> GetLayout()
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var layout = await _dashboardService.GetLayoutAsync(userId);
        if (layout == null)
            return NotFound();
        return Ok(layout);
    }

    [HttpPut("layout")]
    public async Task<ActionResult<DashboardLayoutDto>> SaveLayout([FromBody] SaveDashboardLayoutRequest request)
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var layout = await _dashboardService.SaveLayoutAsync(userId, request.LayoutJson);
        return Ok(layout);
    }
}
