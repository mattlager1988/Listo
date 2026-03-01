using Microsoft.AspNetCore.Mvc;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly IConfiguration _config;

    public SystemController(IConfiguration config)
    {
        _config = config;
    }

    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        return Ok(new { version = _config["AppVersion"] });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy" });
    }
}
