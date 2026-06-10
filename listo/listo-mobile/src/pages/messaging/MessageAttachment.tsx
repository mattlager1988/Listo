import React, { useEffect, useState } from 'react';
import { SpinLoading, ImageViewer } from 'antd-mobile';
import { messagingApi, type AttachmentDto } from '@shared/services/messagingApi';

interface Props {
  attachment: AttachmentDto;
}

// Uses a base64 data URL (not a blob: URL) because installed iOS PWAs (WKWebView)
// frequently fail to render blob: URLs in <img>/<video>.
const MessageAttachment: React.FC<Props> = ({ attachment }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let blobUrl: string | null = null;
    let attempts = 0;
    setUrl(null);
    setFailed(false);

    const tryLoad = () => {
      // Images: base64 data URL (reliable in iOS WKWebView). Videos: blob URL,
      // since base64-encoding a large video in memory is impractical.
      const load = attachment.kind === 'video'
        ? messagingApi.fetchAttachmentUrl(attachment.sysId).then((u) => { blobUrl = u; return u; })
        : messagingApi.fetchAttachmentDataUrl(attachment.sysId);
      load
        .then((u) => { if (active) setUrl(u); else if (blobUrl) URL.revokeObjectURL(blobUrl); })
        .catch(() => {
          if (!active) return;
          attempts += 1;
          // Retry a few times — a just-sent attachment can briefly 404 right after upload.
          if (attempts < 4) setTimeout(tryLoad, 700);
          else setFailed(true);
        });
    };
    tryLoad();

    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [attachment.sysId, attachment.kind]);

  if (failed) {
    return (
      <div style={{ padding: '8px 12px', fontSize: 13, color: '#fff', opacity: 0.85 }}>
        📎 {attachment.originalFileName}
      </div>
    );
  }

  if (!url) {
    return (
      <div style={{ width: 160, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 12 }}>
        <SpinLoading style={{ '--size': '24px' }} />
      </div>
    );
  }

  if (attachment.kind === 'video') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        style={{ maxWidth: 220, maxHeight: 280, borderRadius: 12, display: 'block' }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={attachment.originalFileName}
      onClick={() => ImageViewer.show({ image: url })}
      style={{ maxWidth: 220, maxHeight: 280, borderRadius: 12, display: 'block' }}
    />
  );
};

export default MessageAttachment;
