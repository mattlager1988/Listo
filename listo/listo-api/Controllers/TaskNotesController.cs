using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/tasks/items/{taskId}/notes")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.Tasks)]
public class TaskNotesController : ControllerBase
{
    private readonly ITaskNoteService _noteService;

    public TaskNotesController(ITaskNoteService noteService)
    {
        _noteService = noteService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskNoteResponse>>> GetByTask(long taskId)
    {
        return Ok(await _noteService.GetByTaskAsync(taskId));
    }

    [HttpPost]
    public async Task<ActionResult<TaskNoteResponse>> Create(long taskId, [FromBody] CreateTaskNoteRequest request)
    {
        try
        {
            var note = await _noteService.CreateAsync(taskId, request);
            return CreatedAtAction(nameof(GetByTask), new { taskId }, note);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
