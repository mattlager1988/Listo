using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/tasks/boards")]
[Authorize]
public class TaskBoardsController : ControllerBase
{
    private readonly ITaskBoardService _boardService;

    public TaskBoardsController(ITaskBoardService boardService)
    {
        _boardService = boardService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskBoardSummaryResponse>>> GetAll()
    {
        return Ok(await _boardService.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskBoardResponse>> GetById(long id)
    {
        var board = await _boardService.GetByIdAsync(id);
        if (board == null) return NotFound();
        return Ok(board);
    }

    [HttpPost]
    public async Task<ActionResult<TaskBoardResponse>> Create([FromBody] CreateTaskBoardRequest request)
    {
        var board = await _boardService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = board.SysId }, board);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskBoardResponse>> Update(long id, [FromBody] UpdateTaskBoardRequest request)
    {
        var board = await _boardService.UpdateAsync(id, request);
        if (board == null) return NotFound();
        return Ok(board);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _boardService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    // Column endpoints
    [HttpPost("{boardId}/columns")]
    public async Task<ActionResult<TaskBoardColumnResponse>> AddColumn(long boardId, [FromBody] CreateTaskBoardColumnRequest request)
    {
        var column = await _boardService.AddColumnAsync(boardId, request);
        if (column == null) return NotFound();
        return Ok(column);
    }

    [HttpPut("{boardId}/columns/{columnId}")]
    public async Task<ActionResult<TaskBoardColumnResponse>> UpdateColumn(long boardId, long columnId, [FromBody] UpdateTaskBoardColumnRequest request)
    {
        var column = await _boardService.UpdateColumnAsync(boardId, columnId, request);
        if (column == null) return NotFound();
        return Ok(column);
    }

    [HttpDelete("{boardId}/columns/{columnId}")]
    public async Task<IActionResult> DeleteColumn(long boardId, long columnId)
    {
        var result = await _boardService.DeleteColumnAsync(boardId, columnId);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPut("{boardId}/columns/reorder")]
    public async Task<IActionResult> ReorderColumns(long boardId, [FromBody] ReorderColumnsRequest request)
    {
        var result = await _boardService.ReorderColumnsAsync(boardId, request);
        if (!result) return NotFound();
        return NoContent();
    }
}
