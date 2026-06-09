import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { messagingApi, type AttachmentDto } from '../../services/messagingApi';

interface Props {
  attachment: AttachmentDto;
  onOpen?: (url: string, kind: 'image' | 'video') => void;
}

// Fetches an attachment through the authenticated endpoint and renders it as a
// blob URL (matching the document preview pattern). Revokes the URL on unmount.
const AttachmentView: React.FC<Props> = ({ attachment, onOpen }) => {
  const [url, setUrl] = useState<string | null>(null);

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
      <div className="msg-attachment msg-attachment-loading">
        <Spin size="small" />
      </div>
    );
  }

  if (attachment.kind === 'video') {
    return (
      <video className="msg-attachment" src={url} controls preload="metadata" />
    );
  }

  return (
    <img
      className="msg-attachment"
      src={url}
      alt={attachment.originalFileName}
      onClick={() => onOpen?.(url, 'image')}
      style={{ cursor: onOpen ? 'pointer' : undefined }}
    />
  );
};

export default AttachmentView;
