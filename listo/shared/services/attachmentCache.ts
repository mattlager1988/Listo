// Caches local object URLs for attachments the user just uploaded, keyed by the
// server-assigned attachment sysId. Lets the sender see media instantly without
// waiting for (or depending on) a round-trip to the attachment download endpoint.

const previews = new Map<number, string>();

export function rememberAttachmentPreview(sysId: number, file: Blob): void {
  // Revoke any prior URL for this id before replacing.
  const existing = previews.get(sysId);
  if (existing) URL.revokeObjectURL(existing);
  previews.set(sysId, URL.createObjectURL(file));
}

export function getAttachmentPreview(sysId: number): string | undefined {
  return previews.get(sysId);
}
