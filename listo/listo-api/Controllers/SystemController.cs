using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version;
        return Ok(new { apiVersion = version?.ToString(3) ?? "0.0.0" });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy" });
    }
}
