using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using OpenAI;
using OpenAI.Audio;

namespace Listo.Api.Services;

public class TranscriptionSession
{
    public string SessionId { get; init; } = Guid.NewGuid().ToString("N");
    public CancellationTokenSource Cts { get; init; } = new();
    public ConcurrentQueue<string> Segments { get; } = new();
    public bool IsComplete { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public interface ITranscriptionSessionManager
{
    string StartSession(string streamUrl, string apiKey);
    (IEnumerable<string> Segments, bool IsComplete) Poll(string sessionId);
    bool StopSession(string sessionId);
}

public class TranscriptionSessionManager : ITranscriptionSessionManager, IDisposable
{
    private const int ChunkSeconds = 8;
    private const int SampleRate = 16000;
    private const int Channels = 1;
    private const int BitsPerSample = 16;
    private const int BytesPerSample = BitsPerSample / 8;
    private const int ChunkSizeBytes = SampleRate * Channels * BytesPerSample * ChunkSeconds;

    private readonly ConcurrentDictionary<string, TranscriptionSession> _sessions = new();

    public string StartSession(string streamUrl, string apiKey)
    {
        var session = new TranscriptionSession();
        _sessions[session.SessionId] = session;
        _ = Task.Run(() => RunAsync(session, streamUrl, apiKey, session.Cts.Token));
        return session.SessionId;
    }

    public (IEnumerable<string> Segments, bool IsComplete) Poll(string sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
            return (Enumerable.Empty<string>(), true);

        var results = new List<string>();
        while (session.Segments.TryDequeue(out var segment))
            results.Add(segment);

        return (results, session.IsComplete);
    }

    public bool StopSession(string sessionId)
    {
        if (!_sessions.TryRemove(sessionId, out var session))
            return false;
        session.Cts.Cancel();
        return true;
    }

    private async Task RunAsync(TranscriptionSession session, string streamUrl, string apiKey, CancellationToken ct)
    {
        using var ffmpeg = new Process();
        ffmpeg.StartInfo = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        // Decode stream → raw signed 16-bit PCM at 16 kHz mono (Whisper's native format)
        foreach (var arg in new[] { "-loglevel", "error", "-i", streamUrl, "-f", "s16le", "-ar", SampleRate.ToString(), "-ac", Channels.ToString(), "pipe:1" })
            ffmpeg.StartInfo.ArgumentList.Add(arg);

        try
        {
            ffmpeg.Start();
            // Drain stderr so ffmpeg never blocks on a full pipe
            _ = Task.Run(() => ffmpeg.StandardError.ReadToEndAsync(), CancellationToken.None);

            var stdout = ffmpeg.StandardOutput.BaseStream;
            var pcmBuf = new byte[ChunkSizeBytes];
            var done = false;

            while (!ct.IsCancellationRequested && !done)
            {
                var totalRead = 0;
                while (totalRead < ChunkSizeBytes && !ct.IsCancellationRequested)
                {
                    var read = await stdout.ReadAsync(pcmBuf.AsMemory(totalRead, ChunkSizeBytes - totalRead), ct);
                    if (read == 0) { done = true; break; }
                    totalRead += read;
                }

                if (totalRead > 0)
                    _ = TranscribeAndEnqueueAsync(session, BuildWav(pcmBuf, totalRead), apiKey, ct);
            }
        }
        catch (OperationCanceledException) { /* normal stop */ }
        catch (Exception ex)
        {
            session.Segments.Enqueue($"[Stream error: {ex.Message}]");
        }
        finally
        {
            try { if (!ffmpeg.HasExited) ffmpeg.Kill(); } catch { }
            session.IsComplete = true;
        }
    }

    private static byte[] BuildWav(byte[] pcmData, int dataLength)
    {
        var wav = new byte[44 + dataLength];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(wav, 0);
        BitConverter.GetBytes(36 + dataLength).CopyTo(wav, 4);
        Encoding.ASCII.GetBytes("WAVE").CopyTo(wav, 8);
        Encoding.ASCII.GetBytes("fmt ").CopyTo(wav, 12);
        BitConverter.GetBytes(16).CopyTo(wav, 16);                                          // fmt chunk size
        BitConverter.GetBytes((short)1).CopyTo(wav, 20);                                   // PCM = 1
        BitConverter.GetBytes((short)Channels).CopyTo(wav, 22);
        BitConverter.GetBytes(SampleRate).CopyTo(wav, 24);
        BitConverter.GetBytes(SampleRate * Channels * BytesPerSample).CopyTo(wav, 28);     // byte rate
        BitConverter.GetBytes((short)(Channels * BytesPerSample)).CopyTo(wav, 32);         // block align
        BitConverter.GetBytes((short)BitsPerSample).CopyTo(wav, 34);
        Encoding.ASCII.GetBytes("data").CopyTo(wav, 36);
        BitConverter.GetBytes(dataLength).CopyTo(wav, 40);
        Buffer.BlockCopy(pcmData, 0, wav, 44, dataLength);
        return wav;
    }

    private static readonly AudioTranscriptionOptions TranscriptionOptions = new()
    {
        Language = "en",
        Temperature = 0,
    };

    // Phrases Whisper hallucinates on silent/noisy audio with temperature=0
    private static readonly string[] HallucinationPhrases =
        ["thank you", "thanks for watching", "transcribed by", "subtitles by", "please subscribe", "♪"];

    private static async Task TranscribeAndEnqueueAsync(TranscriptionSession session, byte[] wavBytes, string apiKey, CancellationToken ct)
    {
        if (wavBytes.Length == 0 || ct.IsCancellationRequested) return;
        try
        {
            var audioClient = new OpenAIClient(apiKey).GetAudioClient("whisper-1");
            using var stream = new MemoryStream(wavBytes);
            var result = await audioClient.TranscribeAudioAsync(stream, "audio.wav", TranscriptionOptions, ct);
            var text = result.Value.Text.Trim();
            var lower = text.ToLowerInvariant();
            var letterCount = text.Count(char.IsLetter);
            if (letterCount >= 3 && !HallucinationPhrases.Any(lower.Contains))
                session.Segments.Enqueue(text);
        }
        catch (OperationCanceledException) { /* expected */ }
        catch (Exception ex)
        {
            session.Segments.Enqueue($"[Transcription error: {ex.Message}]");
        }
    }

    public void Dispose()
    {
        foreach (var session in _sessions.Values)
            session.Cts.Cancel();
        _sessions.Clear();
    }
}
