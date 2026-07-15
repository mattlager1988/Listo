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
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.Aviation)]
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

        // Block server-side requests to internal/reserved addresses (SSRF). The
        // URL is handed to ffmpeg, so an attacker could otherwise reach cloud
        // metadata endpoints, localhost, or other internal services.
        if (await ResolvesToBlockedAddressAsync(uri))
            return BadRequest(new { message = "The requested host is not permitted." });

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

    // Resolves the URL's host and returns true if it (or any of its addresses)
    // points at a loopback, private, link-local, or otherwise reserved range.
    // Fails closed: an unresolvable host is treated as blocked.
    private static async Task<bool> ResolvesToBlockedAddressAsync(Uri uri)
    {
        IPAddress[] addresses;
        try
        {
            addresses = await Dns.GetHostAddressesAsync(uri.DnsSafeHost);
        }
        catch
        {
            return true;
        }

        return addresses.Length == 0 || addresses.Any(IsReservedAddress);
    }

    private static bool IsReservedAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return true;

        var ip = address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            return b[0] switch
            {
                0 => true,                                   // 0.0.0.0/8
                10 => true,                                  // 10.0.0.0/8 (private)
                127 => true,                                 // 127.0.0.0/8 (loopback)
                169 when b[1] == 254 => true,                // 169.254.0.0/16 (link-local, incl. cloud metadata)
                172 when b[1] >= 16 && b[1] <= 31 => true,   // 172.16.0.0/12 (private)
                192 when b[1] == 168 => true,                // 192.168.0.0/16 (private)
                100 when b[1] >= 64 && b[1] <= 127 => true,  // 100.64.0.0/10 (CGNAT)
                _ => false
            };
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6UniqueLocal;
        }

        // Unknown address family — block to be safe.
        return true;
    }
}
