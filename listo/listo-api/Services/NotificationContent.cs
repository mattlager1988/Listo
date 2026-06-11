namespace Listo.Api.Services;

/// <summary>
/// Builds the title/body for a message push notification (sender + preview).
/// </summary>
public static class NotificationContent
{
    public static (string Title, string Body) Build(
        string senderName,
        string? body,
        string? firstAttachmentKind,
        string conversationType,
        string? conversationName)
    {
        var preview = !string.IsNullOrWhiteSpace(body)
            ? (body!.Length > 200 ? body[..200].TrimEnd() + "…" : body)
            : firstAttachmentKind == "video" ? "📹 Video"
            : firstAttachmentKind == "image" ? "📷 Photo"
            : "New message";

        var name = string.IsNullOrWhiteSpace(senderName) ? "Listo" : senderName;

        if (conversationType == "group")
        {
            var groupTitle = string.IsNullOrWhiteSpace(conversationName) ? "Listo group" : conversationName!;
            return (groupTitle, $"{name}: {preview}");
        }

        return (name, preview);
    }
}
