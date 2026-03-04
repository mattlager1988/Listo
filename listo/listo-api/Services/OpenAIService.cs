using OpenAI;
using OpenAI.Chat;

namespace Listo.Api.Services;

public interface IOpenAIService
{
    Task<string> GetCompletionAsync(string prompt);
    Task<string> GetCompletionAsync(string systemPrompt, string userPrompt);
    Task<string> GetCompletionAsync(IEnumerable<ChatMessage> messages);
}

public class OpenAIService : IOpenAIService
{
    private readonly ISettingsService _settingsService;
    private ChatClient? _chatClient;
    private string? _currentApiKey;
    private string? _currentModel;

    public OpenAIService(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    private async Task<ChatClient> GetChatClientAsync()
    {
        var apiKey = await _settingsService.GetValueAsync("OpenAI:ApiKey");
        var model = await _settingsService.GetValueAsync("OpenAI:Model", "gpt-4o");

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException(
                "OpenAI API key is not configured. Please set it in Admin > Listo Settings.");
        }

        // Recreate client if settings changed
        if (_chatClient == null || _currentApiKey != apiKey || _currentModel != model)
        {
            var client = new OpenAIClient(apiKey);
            _chatClient = client.GetChatClient(model!);
            _currentApiKey = apiKey;
            _currentModel = model;
        }

        return _chatClient;
    }

    public async Task<string> GetCompletionAsync(string prompt)
    {
        var chatClient = await GetChatClientAsync();
        var messages = new List<ChatMessage>
        {
            new UserChatMessage(prompt)
        };

        var completion = await chatClient.CompleteChatAsync(messages);
        return completion.Value.Content[0].Text;
    }

    public async Task<string> GetCompletionAsync(string systemPrompt, string userPrompt)
    {
        var chatClient = await GetChatClientAsync();
        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(userPrompt)
        };

        var completion = await chatClient.CompleteChatAsync(messages);
        return completion.Value.Content[0].Text;
    }

    public async Task<string> GetCompletionAsync(IEnumerable<ChatMessage> messages)
    {
        var chatClient = await GetChatClientAsync();
        var completion = await chatClient.CompleteChatAsync(messages);
        return completion.Value.Content[0].Text;
    }
}
