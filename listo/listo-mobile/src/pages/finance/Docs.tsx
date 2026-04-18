import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavBar, PullToRefresh, List, Tag, Skeleton, ErrorBlock, Toast, Collapse } from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();

interface Document {
  sysId: number;
  fileName: string;
  originalFileName: string;
  description: string;
  mimeType: string;
  fileSize: number;
  documentTypeSysId?: number;
  documentTypeName?: string;
  uploadedByName: string;
  createTimestamp: string;
}

const Docs: React.FC = () => {
  const { openMenu } = useMenu();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      params.append('module', 'finance');
      params.append('entityType', 'general');
      const response = await api.get(`/documents?${params}`);
      setDocuments(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const grouped = useMemo(() => {
    const typeMap = new Map<string, Document[]>();
    documents.forEach(doc => {
      const typeName = doc.documentTypeName || 'Uncategorized';
      if (!typeMap.has(typeName)) typeMap.set(typeName, []);
      typeMap.get(typeName)!.push(doc);
    });

    const sortedKeys = [...typeMap.keys()].sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(typeName => ({
      typeName,
      docs: typeMap.get(typeName)!,
    }));
  }, [documents]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canView = (doc: Document) =>
    doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/');

  const handleView = async (doc: Document) => {
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
      Toast.show({ content: 'Failed to load document' });
      setViewingDoc(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
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

  const getFileEmoji = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'IMG';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
    if (mimeType.includes('word')) return 'DOC';
    return 'FILE';
  };

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Docs
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
          <div style={{ height: 16 }} />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Docs
        </NavBar>
        <ErrorBlock status="default" title="Unable to load documents" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Docs
      </NavBar>
      <PullToRefresh onRefresh={fetchDocuments}>
        {documents.length === 0 ? (
          <ErrorBlock status="empty" title="No documents" description="Upload documents from the web app" />
        ) : grouped.length > 0 ? (
          <Collapse defaultActiveKey={grouped.map(g => g.typeName)}>
            {grouped.map(group => (
              <Collapse.Panel
                key={group.typeName}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: group.typeName === 'Uncategorized' ? '#8c8c8c' : '#1677ff',
                    }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {group.typeName}
                    </span>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                      {group.docs.length} {group.docs.length === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                }
              >
                <List style={{ '--border-top': 'none' }}>
                  {group.docs.map(doc => (
                    <List.Item
                      key={doc.sysId}
                      onClick={() => handleView(doc)}
                      prefix={
                        <Tag
                          color={
                            doc.mimeType.includes('pdf') ? 'danger' :
                            doc.mimeType.includes('image') ? 'primary' :
                            doc.mimeType.includes('word') ? 'primary' :
                            doc.mimeType.includes('excel') || doc.mimeType.includes('spreadsheet') ? 'success' :
                            'default'
                          }
                          style={{ fontSize: 10, padding: '0 4px' }}
                        >
                          {getFileEmoji(doc.mimeType)}
                        </Tag>
                      }
                      description={
                        <span style={{ fontSize: 11 }}>
                          {formatFileSize(doc.fileSize)} · {new Date(doc.createTimestamp).toLocaleDateString()}
                        </span>
                      }
                    >
                      <span style={{ fontSize: 14 }}>{doc.description || doc.originalFileName}</span>
                    </List.Item>
                  ))}
                </List>
              </Collapse.Panel>
            ))}
          </Collapse>
        ) : null}
        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Full-screen Document Viewer */}
      {viewingDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <NavBar
            onBack={closeViewer}
            right={
              <span
                onClick={() => handleDownload(viewingDoc)}
                style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
              >
                Save
              </span>
            }
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
              {viewingDoc.description || viewingDoc.originalFileName}
            </div>
          </NavBar>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {viewLoading ? (
              <div style={{ padding: 16 }}>
                <Skeleton.Paragraph lineCount={6} animated />
              </div>
            ) : viewUrl && viewingDoc.mimeType === 'application/pdf' ? (
              <Worker workerUrl={pdfWorkerUrl}>
                <div style={{ height: '100%' }}>
                  <Viewer fileUrl={viewUrl} plugins={[defaultLayoutPluginInstance]} />
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
        </div>
      )}
    </>
  );
};

export default Docs;
