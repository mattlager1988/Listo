using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/cards")]
[Authorize]
public class CardsController : ControllerBase
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public CardsController(
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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountCardWithAccountResponse>>> GetAllCards()
    {
        var cards = await _context.AccountCards
            .Include(c => c.Account)
            .Where(c => !c.Account.IsDiscontinued)
            .OrderBy(c => c.Account.Name)
            .ThenBy(c => c.Name)
            .ToListAsync();

        var response = cards.Select(card =>
        {
            var cardNumber = !string.IsNullOrEmpty(card.EncryptedCardNumber)
                ? _encryptionService.Decrypt(card.EncryptedCardNumber)
                : null;
            var cvv = !string.IsNullOrEmpty(card.EncryptedCvv)
                ? _encryptionService.Decrypt(card.EncryptedCvv)
                : null;

            return new AccountCardWithAccountResponse(
                card.SysId,
                card.AccountSysId,
                card.Account.Name,
                card.Name,
                MaskCardNumber(cardNumber),
                cardNumber,
                card.ExpirationDate,
                cvv,
                card.PhoneNumber,
                card.FrontImage != null,
                card.BackImage != null,
                card.CreateTimestamp
            );
        });

        return Ok(response);
    }
}
