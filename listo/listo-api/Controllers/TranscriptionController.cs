using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

public record StartTranscriptionRequest(string Url);

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class TranscriptionController : ControllerBase
{
    private readonly ITranscriptionSessionManager _sessionManager;
    private readonly ISettingsService _settingsService;

    public TranscriptionController(ITranscriptionSessionManager sessionManager, ISettingsService settingsService)
    {
        _sessionManager = sessionManager;
        _settingsService = settingsService;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartTranscriptionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "Url is required." });

        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri))
            return BadRequest(new { message = "Invalid URL." });

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return BadRequest(new { message = "Only http and https URLs are permitted." });

        if (await ResolvesToInternalAddressAsync(uri.Host))
            return BadRequest(new { message = "URL host is not permitted." });

        var apiKey = await _settingsService.GetValueAsync("OpenAI:ApiKey");
        if (string.IsNullOrEmpty(apiKey))
            return BadRequest(new { message = "OpenAI API key is not configured. Set it in Admin > Listo Settings." });

        var sessionId = _sessionManager.StartSession(request.Url, apiKey);
        return Ok(new { sessionId });
    }

    [HttpGet("{sessionId}/poll")]
    public IActionResult Poll(string sessionId)
    {
        var (segments, isComplete) = _sessionManager.Poll(sessionId);
        return Ok(new { segments, isComplete });
    }

    [HttpDelete("{sessionId}")]
    public IActionResult Stop(string sessionId)
    {
        _sessionManager.StopSession(sessionId);
        return NoContent();
    }

    private static async Task<bool> ResolvesToInternalAddressAsync(string host)
    {
        IPAddress[] addresses;
        if (IPAddress.TryParse(host, out var literal))
        {
            addresses = new[] { literal };
        }
        else
        {
            try
            {
                addresses = await Dns.GetHostAddressesAsync(host);
            }
            catch
            {
                return true;
            }
        }

        if (addresses.Length == 0) return true;

        foreach (var ip in addresses)
        {
            if (IsInternalAddress(ip)) return true;
        }
        return false;
    }

    private static bool IsInternalAddress(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = ip.GetAddressBytes();
            // 10.0.0.0/8
            if (bytes[0] == 10) return true;
            // 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
            // 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168) return true;
            // 169.254.0.0/16 (link-local, includes cloud metadata 169.254.169.254)
            if (bytes[0] == 169 && bytes[1] == 254) return true;
            // 127.0.0.0/8 (loopback, covered above but explicit)
            if (bytes[0] == 127) return true;
            // 0.0.0.0/8
            if (bytes[0] == 0) return true;
            // 100.64.0.0/10 (carrier-grade NAT / shared address space)
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;
        }
        else if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal) return true;
            // Unique local addresses (fc00::/7)
            var bytes = ip.GetAddressBytes();
            if ((bytes[0] & 0xfe) == 0xfc) return true;
            // IPv4-mapped IPv6 — recurse on mapped form
            if (ip.IsIPv4MappedToIPv6) return IsInternalAddress(ip.MapToIPv4());
        }

        return false;
    }
}
