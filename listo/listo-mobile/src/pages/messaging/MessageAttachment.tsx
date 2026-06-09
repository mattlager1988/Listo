import React, { useEffect, useState } from 'react';
import { SpinLoading, ImageViewer } from 'antd-mobile';
import { messagingApi, type AttachmentDto } from '@shared/services/messagingApi';

interface Props {
  attachment: AttachmentDto;
}

const MessageAttachment: React.FC<Props> = ({ attachment }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    messagingApi
      .fetchAttachmentUrl(attachment.sysId)
      .then((u) => {
        if (active) {
          created = u;
          setUrl(u);
        } else {
          URL.revokeObjectURL(u);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [attachment.sysId]);

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
    <>
      <img
        src={url}
        alt={attachment.originalFileName}
        onClick={() => setViewerVisible(true)}
        style={{ maxWidth: 220, maxHeight: 280, borderRadius: 12, display: 'block' }}
      />
      <ImageViewer image={url} visible={viewerVisible} onClose={() => setViewerVisible(false)} />
    </>
  );
};

export default MessageAttachment;
