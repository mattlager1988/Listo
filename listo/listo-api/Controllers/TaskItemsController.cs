using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/tasks/items")]
[Authorize]
public class TaskItemsController : ControllerBase
{
    private readonly ITaskItemService _taskService;

    public TaskItemsController(ITaskItemService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet("backlog")]
    public async Task<ActionResult<IEnumerable<TaskItemResponse>>> GetBacklog()
    {
        return Ok(await _taskService.GetBacklogAsync());
    }

    [HttpGet("board/{boardId}")]
    public async Task<ActionResult<IEnumerable<TaskItemResponse>>> GetByBoard(long boardId)
    {
        return Ok(await _taskService.GetByBoardAsync(boardId));
    }

    [HttpGet("completed")]
    public async Task<ActionResult<IEnumerable<TaskItemResponse>>> GetCompleted()
    {
        return Ok(await _taskService.GetCompletedAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskItemResponse>> GetById(long id)
    {
        var task = await _taskService.GetByIdAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskItemResponse>> Create([FromBody] CreateTaskItemRequest request)
    {
        try
        {
            var task = await _taskService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = task.SysId }, task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskItemResponse>> Update(long id, [FromBody] UpdateTaskItemRequest request)
    {
        try
        {
            var task = await _taskService.UpdateAsync(id, request);
            if (task == null) return NotFound();
            return Ok(task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _taskService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/assign")]
    public async Task<ActionResult<TaskItemResponse>> AssignToBoard(long id, [FromBody] AssignTaskToBoardRequest request)
    {
        try
        {
            var task = await _taskService.AssignToBoardAsync(id, request);
            if (task == null) return NotFound();
            return Ok(task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/backlog")]
    public async Task<ActionResult<TaskItemResponse>> MoveToBacklog(long id)
    {
        var task = await _taskService.MoveToBacklogAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<TaskItemResponse>> Complete(long id)
    {
        var task = await _taskService.CompleteAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost("{id}/uncomplete")]
    public async Task<ActionResult<TaskItemResponse>> Uncomplete(long id)
    {
        var task = await _taskService.UncompleteAsync(id);
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPut("{id}/move")]
    public async Task<IActionResult> MoveTask(long id, [FromBody] MoveTaskRequest request)
    {
        var result = await _taskService.MoveTaskAsync(id, request);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> ReorderTasks([FromBody] ReorderTasksRequest request)
    {
        var result = await _taskService.ReorderTasksAsync(request);
        return result ? NoContent() : BadRequest();
    }
}
