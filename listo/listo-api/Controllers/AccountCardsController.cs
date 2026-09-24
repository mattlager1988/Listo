using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/accounts/{accountId}/cards")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.Finance)]
public class AccountCardsController : ControllerBase
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public AccountCardsController(
        ListoDbContext context,
        IEncryptionService encryptionService)
    {
        _context = context;
        _encryptionService = encryptionService;
    }

    private string MaskCardNumber(string? cardNumber)
    {
        if (string.IsNullOrEmpty(cardNumber) || cardNumber.Length < 4)
            return cardNumber ?? "";
        return $"****{cardNumber[^4..]}";
    }

    // Card metadata without the front/back image blobs - callers only need to
    // know whether an image exists, and fetch it separately from GetImage.
    private record CardProjection(
        long SysId,
        long AccountSysId,
        string Name,
        string? EncryptedCardNumber,
        string? ExpirationDate,
        string? EncryptedCvv,
        string? PhoneNumber,
        bool HasFrontImage,
        bool HasBackImage,
        DateTime CreateTimestamp
    );

    private static IQueryable<CardProjection> Project(IQueryable<AccountCard> cards) =>
        cards.Select(c => new CardProjection(
            c.SysId,
            c.AccountSysId,
            c.Name,
            c.EncryptedCardNumber,
            c.ExpirationDate,
            c.EncryptedCvv,
            c.PhoneNumber,
            c.FrontImage != null,
            c.BackImage != null,
            c.CreateTimestamp
        ));

    private static CardProjection ToProjection(AccountCard c) => new(
        c.SysId,
        c.AccountSysId,
        c.Name,
        c.EncryptedCardNumber,
        c.ExpirationDate,
        c.EncryptedCvv,
        c.PhoneNumber,
        c.FrontImage != null,
        c.BackImage != null,
        c.CreateTimestamp
    );

    private AccountCardResponse MapToResponse(CardProjection card)
    {
        var cardNumber = !string.IsNullOrEmpty(card.EncryptedCardNumber)
            ? _encryptionService.Decrypt(card.EncryptedCardNumber)
            : null;
        var cvv = !string.IsNullOrEmpty(card.EncryptedCvv)
            ? _encryptionService.Decrypt(card.EncryptedCvv)
            : null;

        return new AccountCardResponse(
            card.SysId,
            card.AccountSysId,
            card.Name,
            MaskCardNumber(cardNumber),
            cardNumber,
            card.ExpirationDate,
            cvv,
            card.PhoneNumber,
            card.HasFrontImage,
            card.HasBackImage,
            card.CreateTimestamp
        );
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountCardResponse>>> GetCards(long accountId)
    {
        var cards = await Project(_context.AccountCards
                .AsNoTracking()
                .Where(c => c.AccountSysId == accountId)
                .OrderBy(c => c.Name))
            .ToListAsync();

        return Ok(cards.Select(MapToResponse));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountCardResponse>> GetCard(long accountId, long id)
    {
        var card = await Project(_context.AccountCards
                .AsNoTracking()
                .Where(c => c.SysId == id && c.AccountSysId == accountId))
            .FirstOrDefaultAsync();

        if (card == null) return NotFound();

        return Ok(MapToResponse(card));
    }

    [HttpGet("{id}/image/{side}")]
    public async Task<IActionResult> GetImage(long accountId, long id, string side)
    {
        if (side != "front" && side != "back")
        {
            return BadRequest(new { message = "Side must be 'front' or 'back'" });
        }

        // Read only the requested side so the other image is not pulled too.
        var cardQuery = _context.AccountCards
            .AsNoTracking()
            .Where(c => c.SysId == id && c.AccountSysId == accountId);

        var image = side == "front"
            ? await cardQuery.Select(c => new { Data = c.FrontImage, Mime = c.FrontImageMimeType }).FirstOrDefaultAsync()
            : await cardQuery.Select(c => new { Data = c.BackImage, Mime = c.BackImageMimeType }).FirstOrDefaultAsync();

        if (image?.Data == null || string.IsNullOrEmpty(image.Mime))
        {
            return NotFound();
        }

        // Decrypt the image data
        var imageData = _encryptionService.DecryptBytes(image.Data);
        return File(imageData, image.Mime);
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

        return CreatedAtAction(nameof(GetCard), new { accountId, id = card.SysId }, MapToResponse(ToProjection(card)));
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

        return Ok(MapToResponse(ToProjection(card)));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCard(long accountId, long id)
    {
        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        _context.AccountCards.Remove(card);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/image/{side}")]
    [RequestSizeLimit(10_485_760)] // 10MB for images
    [RequestFormLimits(MultipartBodyLengthLimit = 10_485_760)]
    public async Task<IActionResult> UploadImage(long accountId, long id, string side, IFormFile file)
    {
        if (side != "front" && side != "back")
        {
            return BadRequest(new { message = "Side must be 'front' or 'back'" });
        }

        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        // Validate file type (images only)
        var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
        {
            return BadRequest(new { message = "Only image files are allowed" });
        }

        // Read file into byte array and encrypt
        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        var imageData = memoryStream.ToArray();
        var encryptedData = _encryptionService.EncryptBytes(imageData);

        if (side == "front")
        {
            card.FrontImage = encryptedData;
            card.FrontImageMimeType = file.ContentType;
        }
        else
        {
            card.BackImage = encryptedData;
            card.BackImageMimeType = file.ContentType;
        }

        await _context.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpDelete("{id}/image/{side}")]
    public async Task<IActionResult> DeleteImage(long accountId, long id, string side)
    {
        if (side != "front" && side != "back")
        {
            return BadRequest(new { message = "Side must be 'front' or 'back'" });
        }

        var card = await _context.AccountCards
            .FirstOrDefaultAsync(c => c.SysId == id && c.AccountSysId == accountId);

        if (card == null) return NotFound();

        if (side == "front")
        {
            card.FrontImage = null;
            card.FrontImageMimeType = null;
        }
        else
        {
            card.BackImage = null;
            card.BackImageMimeType = null;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }
}
