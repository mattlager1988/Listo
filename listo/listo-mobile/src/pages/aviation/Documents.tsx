import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavBar, PullToRefresh, List, Tag, Skeleton, ErrorBlock, Popup, Toast, Collapse, SearchBar } from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

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

const Documents: React.FC = () => {
  const { openMenu } = useMenu();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(false);
      const params = new URLSearchParams();
      params.append('module', 'aviation');
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

  const filtered = useMemo(() => {
    if (!searchText.trim()) return documents;
    const query = searchText.toLowerCase();
    return documents.filter(doc =>
      (doc.description || '').toLowerCase().includes(query) ||
      doc.originalFileName.toLowerCase().includes(query)
    );
  }, [documents, searchText]);

  const grouped = useMemo(() => {
    const typeMap = new Map<string, Document[]>();
    filtered.forEach(doc => {
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
  }, [filtered]);

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

  const getFileTag = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'IMG';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
    if (mimeType.includes('word')) return 'DOC';
    return 'FILE';
  };

  const getFileTagColor = (mimeType: string): 'danger' | 'primary' | 'success' | 'default' => {
    if (mimeType.includes('pdf')) return 'danger';
    if (mimeType.includes('image')) return 'primary';
    if (mimeType.includes('word')) return 'primary';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'success';
    return 'default';
  };

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Documents
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
          Documents
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
        Documents
      </NavBar>
      <div style={{ padding: '8px 12px', background: '#fff' }}>
        <SearchBar
          placeholder="Search documents"
          value={searchText}
          onChange={setSearchText}
          style={{ '--background': '#f5f5f5' }}
        />
      </div>
      <PullToRefresh onRefresh={fetchDocuments}>
        {filtered.length === 0 ? (
          <ErrorBlock
            status="empty"
            title={searchText ? 'No results' : 'No documents'}
            description={searchText ? 'Try a different search term' : 'Upload documents from the web app'}
          />
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
                          color={getFileTagColor(doc.mimeType)}
                          style={{ fontSize: 10, padding: '0 4px' }}
                        >
                          {getFileTag(doc.mimeType)}
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

      {/* Document Viewer */}
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
                      {viewingDoc.description || viewingDoc.originalFileName}
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
                    {viewingDoc.originalFileName} · {formatFileSize(viewingDoc.fileSize)}
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
                <iframe
                  src={viewUrl}
                  style={{ width: '100%', height: '100%', border: 'none', minHeight: '60vh' }}
                  title={viewingDoc.originalFileName}
                />
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

export default Documents;
