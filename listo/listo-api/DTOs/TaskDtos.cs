namespace Listo.Api.DTOs;

// Board DTOs
public record TaskBoardResponse(
    long SysId,
    string Name,
    string? Color,
    int TaskCount,
    List<TaskBoardColumnResponse> Columns
);

public record TaskBoardSummaryResponse(
    long SysId,
    string Name,
    string? Color,
    int TaskCount,
    int ColumnCount
);

public record CreateTaskBoardRequest(
    string Name,
    string? Color,
    List<string>? Columns  // Optional initial column names
);

public record UpdateTaskBoardRequest(
    string? Name,
    string? Color
);

// Column DTOs
public record TaskBoardColumnResponse(
    long SysId,
    string Name,
    int SortOrder,
    int TaskCount
);

public record CreateTaskBoardColumnRequest(
    string Name
);

public record UpdateTaskBoardColumnRequest(
    string? Name
);

public record ReorderColumnsRequest(
    List<long> ColumnSysIds  // Ordered list of column IDs
);

// Task DTOs
public record TaskItemResponse(
    long SysId,
    string Name,
    string? Description,
    string Priority,
    DateTime? DueDate,
    int SortOrder,
    bool IsCompleted,
    DateTime? CompletedDate,
    long? TaskBoardSysId,
    string? TaskBoardName,
    long? TaskBoardColumnSysId,
    string? TaskBoardColumnName,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreateTaskItemRequest(
    string Name,
    string? Description,
    string? Priority,  // Defaults to Medium
    DateTime? DueDate
);

public record UpdateTaskItemRequest(
    string? Name,
    string? Description,
    string? Priority,
    DateTime? DueDate
);

public record AssignTaskToBoardRequest(
    long TaskBoardSysId
);

public record MoveTaskRequest(
    long TaskBoardColumnSysId,
    int SortOrder
);

public record ReorderTasksRequest(
    List<TaskOrderItem> Tasks
);

public record TaskOrderItem(
    long SysId,
    long TaskBoardColumnSysId,
    int SortOrder
);
