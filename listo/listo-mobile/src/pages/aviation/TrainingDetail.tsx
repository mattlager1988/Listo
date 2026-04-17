import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Card,
  List,
  Tag,
  Toast,
  Skeleton,
  ErrorBlock,
  PullToRefresh,
  ActionSheet,
  Dialog,
  Popup,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';

const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

interface TrainingLog {
  sysId: number;
  date: string;
  description: string;
  hoursFlown: number;
  trainingTypeSysId: number;
  trainingTypeName: string;
  aircraftSysId: number | null;
  aircraftPlaneId: string | null;
  aircraftName: string | null;
}

interface Attachment {
  sysId: number;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  entitySysId: number;
}

const TrainingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<TrainingLog | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Attachment | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const [logRes, attachRes] = await Promise.all([
        api.get(`/aviation/traininglogs/${id}`),
        api.get(`/documents?module=aviation&entityType=training_log&entitySysId=${id}`),
      ]);
      setLog(logRes.data);
      setAttachments(attachRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: 'Delete this training log? This cannot be undone.',
    });
    if (!confirmed) return;

    try {
      // Delete attachments first
      if (attachments.length > 0) {
        await Promise.all(attachments.map(a => api.delete(`/documents/${a.sysId}`)));
      }
      await api.delete(`/aviation/traininglogs/${id}`);
      Toast.show({ icon: 'success', content: 'Training log deleted' });
      navigate('/aviation/training');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canView = (doc: Attachment) =>
    doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/');

  const handleViewAttachment = async (doc: Attachment) => {
    if (!canView(doc)) {
      handleDownload(doc);
      return;
    }
    setViewingDoc(doc);
    setViewLoading(true);
    try {
      const response = await api.get(`/documents/${doc.sysId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: doc.mimeType }));
      setViewUrl(url);
    } catch {
      Toast.show({ content: 'Failed to load file' });
      setViewingDoc(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (doc: Attachment) => {
    try {
      const response = await api.get(`/documents/${doc.sysId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      Toast.show({ content: 'Download started' });
    } catch {
      Toast.show({ content: 'Failed to download' });
    }
  };

  const closeViewer = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    setViewUrl(null);
    setViewingDoc(null);
  };

  const getFileTag = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'IMG';
    if (mimeType.includes('word')) return 'DOC';
    return 'FILE';
  };

  const getFileTagColor = (mimeType: string): 'danger' | 'primary' | 'success' | 'default' => {
    if (mimeType.includes('pdf')) return 'danger';
    if (mimeType.includes('image')) return 'primary';
    if (mimeType.includes('word')) return 'primary';
    return 'default';
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/aviation/training')}>Training Log</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !log) {
    return (
      <>
        <NavBar onBack={() => navigate('/aviation/training')}>Training Log</NavBar>
        <ErrorBlock status="default" title="Training log not found" />
      </>
    );
  }

  const actionSheetActions: Action[] = [
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/aviation/training/${log.sysId}/edit`);
      },
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  // Strip HTML tags for plain text display
  const plainDescription = log.description
    ? log.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  return (
    <>
      <PullToRefresh onRefresh={fetchData}>
        <NavBar
          onBack={() => navigate('/aviation/training')}
          right={
            <span
              onClick={() => setActionSheetVisible(true)}
              style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
            >
              More
            </span>
          }
        >
          Training Log
        </NavBar>

        <div style={{ padding: 12, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{log.trainingTypeName}</div>
            <span style={{ fontSize: 13, color: '#8c8c8c' }}>
              {parseDate(log.date).format('MMM D, YYYY')}
            </span>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              background: '#e6f4ff',
              border: '1px solid #91caff',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Hours</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>
                {log.hoursFlown.toFixed(1)}
              </div>
            </div>
            <div style={{
              background: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Aircraft</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#595959' }}>
                {log.aircraftPlaneId || 'N/A'}
              </div>
              {log.aircraftName && (
                <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                  {log.aircraftName}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {plainDescription && (
            <Card title="Description" style={{ borderRadius: 8 }}>
              <div
                className="rich-text-content"
                style={{ fontSize: 13, color: '#595959', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: log.description }}
              />
            </Card>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card
              title={`Attachments (${attachments.length})`}
              style={{ borderRadius: 8 }}
            >
              <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
                {attachments.map(att => (
                  <List.Item
                    key={att.sysId}
                    onClick={() => handleViewAttachment(att)}
                    prefix={
                      <Tag
                        color={getFileTagColor(att.mimeType)}
                        style={{ fontSize: 10, padding: '0 4px' }}
                      >
                        {getFileTag(att.mimeType)}
                      </Tag>
                    }
                    description={
                      <span style={{ fontSize: 11 }}>
                        {formatFileSize(att.fileSize)}
                      </span>
                    }
                  >
                    <span style={{ fontSize: 14 }}>{att.originalFileName}</span>
                  </List.Item>
                ))}
              </List>
            </Card>
          )}
        </div>
      </PullToRefresh>

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />

      {/* Attachment Viewer Popup */}
      <Popup
        visible={!!viewingDoc}
        onMaskClick={closeViewer}
        position="bottom"
        bodyStyle={{
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          maxHeight: 'calc(90vh - env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {viewingDoc && (
          <>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
              </div>
              <div style={{
                padding: '4px 16px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <Tag
                      color={getFileTagColor(viewingDoc.mimeType)}
                      style={{ fontSize: 10, padding: '0 4px', flexShrink: 0 }}
                    >
                      {getFileTag(viewingDoc.mimeType)}
                    </Tag>
                    <span style={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {viewingDoc.originalFileName}
                    </span>
                  </div>
                  <span
                    onClick={closeViewer}
                    style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14, flexShrink: 0, marginLeft: 12 }}
                  >
                    Close
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {formatFileSize(viewingDoc.fileSize)}
                  </span>
                  <span
                    onClick={() => handleDownload(viewingDoc)}
                    style={{ color: '#1677ff', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Save to device
                  </span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {viewLoading ? (
                <div style={{ padding: 16 }}>
                  <Skeleton.Paragraph lineCount={6} animated />
                </div>
              ) : viewUrl && viewingDoc.mimeType === 'application/pdf' ? (
                <Worker workerUrl={pdfWorkerUrl}>
                  <div style={{ height: '70vh' }}>
                    <Viewer fileUrl={viewUrl} />
                  </div>
                </Worker>
              ) : viewUrl && viewingDoc.mimeType.startsWith('image/') ? (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <img
                    src={viewUrl}
                    alt={viewingDoc.originalFileName}
                    style={{ maxWidth: '100%', borderRadius: 8 }}
                  />
                </div>
              ) : null}
            </div>
          </>
        )}
      </Popup>
    </>
  );
};

export default TrainingDetail;
