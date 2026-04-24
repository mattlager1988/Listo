using OpenAI;
using OpenAI.Audio;

namespace Listo.Api.Services;

public interface ITranscriptionService
{
    Task<string> TranscribeChunkAsync(Stream audioStream, string fileName);
}

public class TranscriptionService : ITranscriptionService
{
    private readonly ISettingsService _settingsService;

    public TranscriptionService(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    public async Task<string> TranscribeChunkAsync(Stream audioStream, string fileName)
    {
        var apiKey = await _settingsService.GetValueAsync("OpenAI:ApiKey");
        if (string.IsNullOrEmpty(apiKey))
            throw new InvalidOperationException(
                "OpenAI API key is not configured. Please set it in Admin > Listo Settings.");

        var audioClient = new OpenAIClient(apiKey).GetAudioClient("whisper-1");
        var result = await audioClient.TranscribeAudioAsync(audioStream, fileName);
        return result.Value.Text;
    }
}
