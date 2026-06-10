// Caches a base64 data URL for attachments the user just uploaded, keyed by the
// server-assigned attachment sysId. Data URLs (unlike blob: URLs) render in iOS
// WKWebView, so the sender sees their media instantly without a server round-trip.

const previews = new Map<number, string>();

export function rememberAttachmentPreview(sysId: number, file: Blob): Promise<void> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') previews.set(sysId, reader.result);
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsDataURL(file);
  });
}

export function getAttachmentPreview(sysId: number): string | undefined {
  return previews.get(sysId);
}
