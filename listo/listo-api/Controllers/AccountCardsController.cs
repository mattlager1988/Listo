using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/accounts/{accountId}/cards")]
[Authorize]
public class AccountCardsController : ControllerBase
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;
    private readonly IDocumentService _documentService;
    private readonly ISettingsService _settingsService;

    public AccountCardsController(
        ListoDbContext context,
        IEncryptionService encryptionService,
        IDocumentService documentService,
        ISettingsService settingsService)
    {
        _context = context;
        _encryptionService = encryptionService;
        _documentService = documentService;
        _settingsService = settingsService;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private string MaskCardNumber(string? cardNumber)
    {
        if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 4)
            return cardNumber ?? "";
        return $"****{cardNumber[^4..]}";
    }

    private async Task<long?> GetCardImageDocumentSysIdAsync(long cardSysId)
    {
        var doc = await _context.Documents
            .Where(d => d.Module == "finance" && d.EntityType == "account_card" && d.EntitySysId == cardSysId)
            .OrderByDescending(d => d.CreateTimestamp)
            .FirstOrDefaultAsync();
        return doc?.SysId;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountCardResponse>>> GetCards(long accountId)
    {
        var cards = await _context.AccountCards
            .Where(c => c.AccountSysId == accountId)
            .OrderBy(c => c.Name)
            .ToListAsync();

        var responses = new List<AccountCardResponse>();
        foreach (var card in cards)
        {
            var cardNumber = !string.IsNullOrEmpty(card.EncryptedCardNumber)
                ? _encryptionService.Decrypt(card.EncryptedCardNumber)
                : null;
            var cvv = !string.IsNullOrEmpty(card.EncryptedCvv)
                ? _encryptionService.Decrypt(card.EncryptedCvv)
                : null;
            var imageDocId = await GetCardImageDocumentSysIdAsync(card.SysId);

            responses.Add(new AccountCardResponse(
                card.SysId,
                card.AccountSysId,
                card.Name,
                MaskCardNumber(cardNumber),
                cardNumber,
                card.ExpirationDate,
                cvv,
                card.PhoneNumber,
                imageDocId,
                card.CreateTimestamp
            ));
        }

        return Ok(responses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountCardResponse>> GetCard(long accountId, long id)
    {
        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        var cardNumber = !string.IsNullOrEmpty(card.EncryptedCardNumber)
            ? _encryptionService.Decrypt(card.EncryptedCardNumber)
            : null;
        var cvv = !string.IsNullOrEmpty(card.EncryptedCvv)
            ? _encryptionService.Decrypt(card.EncryptedCvv)
            : null;
        var imageDocId = await GetCardImageDocumentSysIdAsync(card.SysId);

        return Ok(new AccountCardResponse(
            card.SysId,
            card.AccountSysId,
            card.Name,
            MaskCardNumber(cardNumber),
            cardNumber,
            card.ExpirationDate,
            cvv,
            card.PhoneNumber,
            imageDocId,
            card.CreateTimestamp
        ));
    }

    [HttpPost]
    public async Task<ActionResult<AccountCardResponse>> CreateCard(long accountId, [FromBody] CreateAccountCardRequest request)
    {
        var account = await _context.Accounts.FindAsync(accountId);
        if (account == null) return NotFound(new { message = "Account not found" });

        var card = new AccountCard
        {
            AccountSysId = accountId,
            Name = request.Name,
            EncryptedCardNumber = !string.IsNullOrEmpty(request.CardNumber)
                ? _encryptionService.Encrypt(request.CardNumber)
                : null,
            ExpirationDate = request.ExpirationDate,
            EncryptedCvv = !string.IsNullOrEmpty(request.Cvv)
                ? _encryptionService.Encrypt(request.Cvv)
                : null,
            PhoneNumber = request.PhoneNumber
        };

        _context.AccountCards.Add(card);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCard), new { accountId, id = card.SysId }, new AccountCardResponse(
            card.SysId,
            card.AccountSysId,
            card.Name,
            MaskCardNumber(request.CardNumber),
            request.CardNumber,
            card.ExpirationDate,
            request.Cvv,
            card.PhoneNumber,
            null,
            card.CreateTimestamp
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AccountCardResponse>> UpdateCard(long accountId, long id, [FromBody] UpdateAccountCardRequest request)
    {
        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        if (request.Name != null) card.Name = request.Name;
        if (request.CardNumber != null)
        {
            card.EncryptedCardNumber = !string.IsNullOrEmpty(request.CardNumber)
                ? _encryptionService.Encrypt(request.CardNumber)
                : null;
        }
        if (request.ExpirationDate != null) card.ExpirationDate = request.ExpirationDate;
        if (request.Cvv != null)
        {
            card.EncryptedCvv = !string.IsNullOrEmpty(request.Cvv)
                ? _encryptionService.Encrypt(request.Cvv)
                : null;
        }
        if (request.PhoneNumber != null) card.PhoneNumber = request.PhoneNumber;

        await _context.SaveChangesAsync();

        var cardNumber = !string.IsNullOrEmpty(card.EncryptedCardNumber)
            ? _encryptionService.Decrypt(card.EncryptedCardNumber)
            : null;
        var cvv = !string.IsNullOrEmpty(card.EncryptedCvv)
            ? _encryptionService.Decrypt(card.EncryptedCvv)
            : null;
        var imageDocId = await GetCardImageDocumentSysIdAsync(card.SysId);

        return Ok(new AccountCardResponse(
            card.SysId,
            card.AccountSysId,
            card.Name,
            MaskCardNumber(cardNumber),
            cardNumber,
            card.ExpirationDate,
            cvv,
            card.PhoneNumber,
            imageDocId,
            card.CreateTimestamp
        ));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCard(long accountId, long id)
    {
        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        // Delete associated card images
        var images = await _context.Documents
            .Where(d => d.Module == "finance" && d.EntityType == "account_card" && d.EntitySysId == id)
            .ToListAsync();

        foreach (var image in images)
        {
            await _documentService.DeleteAsync(image.SysId);
        }

        _context.AccountCards.Remove(card);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/image")]
    [RequestSizeLimit(10_485_760)] // 10MB for images
    [RequestFormLimits(MultipartBodyLengthLimit = 10_485_760)]
    public async Task<IActionResult> UploadImage(long accountId, long id, IFormFile file)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        // Validate file type (images only)
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = "Only image files are allowed" });
        }

        // Delete existing image if any
        var existingImages = await _context.Documents
            .Where(d => d.Module == "finance" && d.EntityType == "account_card" && d.EntitySysId == id)
            .ToListAsync();

        foreach (var img in existingImages)
        {
            await _documentService.DeleteAsync(img.SysId);
        }

        // Upload new image
        var request = new CreateDocumentRequest(
            card.Name,
            "finance",
            "account_card",
            id,
            null
        );

        using var stream = file.OpenReadStream();
        var document = await _documentService.UploadAsync(stream, file.FileName, request, userId.Value);

        return Ok(new { documentSysId = document.SysId });
    }

    [HttpDelete("{id}/image")]
    public async Task<IActionResult> DeleteImage(long accountId, long id)
    {
        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        var images = await _context.Documents
            .Where(d => d.Module == "finance" && d.EntityType == "account_card" && d.EntitySysId == id)
            .ToListAsync();

        foreach (var img in images)
        {
            await _documentService.DeleteAsync(img.SysId);
        }

        return NoContent();
    }
}
