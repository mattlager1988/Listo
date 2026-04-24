import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tag, Typography, Button, Tooltip, message } from 'antd';
import { AudioOutlined, AudioMutedOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../services/api';

const ListenPlayer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url') ?? '';
  const name = searchParams.get('name') ?? 'Unknown Stream';
  const category = searchParams.get('category');
  const description = searchParams.get('description');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<{ text: string; time: string }[]>([]);
  const [transcriptError, setTranscriptError] = useState('');

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const stopTranscription = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (sessionIdRef.current) {
      api.delete(`/aviation/transcription/${sessionIdRef.current}`).catch(() => {});
      sessionIdRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  useEffect(() => () => stopTranscription(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const startTranscription = useCallback(async () => {
    if (!url) return;
    setTranscriptError('');
    try {
      const response = await api.post('/aviation/transcription/start', { url });
      const { sessionId } = response.data;
      sessionIdRef.current = sessionId;
      setIsTranscribing(true);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const poll = await api.get(`/aviation/transcription/${sessionId}/poll`);
          const { segments, isComplete } = poll.data as { segments: string[]; isComplete: boolean };
          if (segments.length > 0) {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setTranscript(prev => [...prev, ...segments.map(text => ({ text, time }))]);
          }
          if (isComplete) stopTranscription();
        } catch { /* non-fatal - server-side chunk errors appear in transcript text */ }
      }, 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Failed to start transcription.';
      setTranscriptError(msg);
      message.error(msg);
    }
  }, [url]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Stream info + controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>{name}</Typography.Text>
          {category && <Tag style={{ marginLeft: 8 }}>{category}</Tag>}
          {description && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>{description}</Typography.Text>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tooltip title={isTranscribing ? 'Stop transcription' : 'Start transcription'}>
            <Button
              type={isTranscribing ? 'primary' : 'text'}
              size="small"
              danger={isTranscribing}
              icon={isTranscribing ? <AudioMutedOutlined /> : <AudioOutlined />}
              onClick={isTranscribing ? stopTranscription : startTranscription}
            />
          </Tooltip>
          {transcript.length > 0 && (
            <Tooltip title="Clear transcript">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => setTranscript([])}
              />
            </Tooltip>
          )}
        </div>
      </div>

      <audio src={url} controls autoPlay style={{ width: '100%' }} />

      {(transcript.length > 0 || transcriptError || isTranscribing) && (
        <div
          style={{
            border: '1px solid #e8e8e8',
            borderRadius: 6,
            padding: '8px 12px',
            background: '#fafafa',
            maxHeight: 220,
            overflowY: 'auto',
            fontSize: 12,
          }}
        >
          {transcriptError ? (
            <Typography.Text type="danger">{transcriptError}</Typography.Text>
          ) : transcript.length > 0 ? (
            <>
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '3px 0',
                    borderTop: i > 0 ? '1px solid #f0f0f0' : undefined,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 10, color: '#8c8c8c', fontFamily: 'monospace', whiteSpace: 'nowrap', paddingTop: 2 }}>
                    {entry.time}
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{entry.text}</span>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Waiting for transmissions…
            </Typography.Text>
          )}
        </div>
      )}
    </div>
  );
};

export default ListenPlayer;
