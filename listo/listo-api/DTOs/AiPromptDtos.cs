namespace Listo.Api.DTOs;

// AI Prompt DTOs
public record AiPromptResponse(
    long SysId,
    string Name,
    string PromptText,
    bool IsDeleted
);

public record CreateAiPromptRequest(string Name, string PromptText);

public record UpdateAiPromptRequest(string? Name, string? PromptText);

// Training Analysis DTOs
public record TrainingAnalysisRequest(
    List<long> TrainingLogIds,
    long PromptSysId
);

public record TrainingAnalysisResponse(
    string Analysis,
    DateTime GeneratedAt
);

// Content Formatting DTOs
public record FormatContentRequest(
    string Content,
    long PromptSysId
);

public record FormatContentResponse(
    string FormattedContent
);
