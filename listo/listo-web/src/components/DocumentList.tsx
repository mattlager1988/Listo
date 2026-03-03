import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Tooltip, Popconfirm, message, Modal, Tag, Input, Select, Row, Col } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import DocumentUpload from './DocumentUpload';

interface DocumentType {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

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

interface DocumentListProps {
  module: string;
  entityType: string;
  entitySysId?: number;
  showUpload?: boolean;
  showDocumentType?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  module,
  entityType,
  entitySysId,
  showUpload = true,
  showDocumentType = false,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('module', module);
      params.append('entityType', entityType);
      if (entitySysId) params.append('entitySysId', entitySysId.toString());

      const response = await api.get(`/documents?${params}`);
      setDocuments(response.data);
    } catch {
      message.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [module, entityType, entitySysId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (showDocumentType) {
      api.get('/aviation/documenttypes')
        .then(res => setDocumentTypes(res.data.filter((dt: DocumentType) => !dt.isDeleted)))
        .catch(() => {});
    }
  }, [showDocumentType]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = !searchText ||
        doc.originalFileName.toLowerCase().includes(searchText.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = selectedType === null || doc.documentTypeSysId === selectedType;
      return matchesSearch && matchesType;
    });
  }, [documents, searchText, selectedType]);

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get(`/documents/${doc.sysId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.originalFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to download document');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      message.success('Document deleted');
      fetchDocuments();
    } catch {
      message.error('Failed to delete document');
    }
  };

  const handleView = async (doc: Document) => {
    if (doc.mimeType === 'application/pdf') {
      try {
        const response = await api.get(`/documents/${doc.sysId}/download`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        setPdfUrl(url);
        setViewingDoc(doc);
      } catch {
        message.error('Failed to load document');
      }
    } else if (doc.mimeType.startsWith('image/')) {
      try {
        const response = await api.get(`/documents/${doc.sysId}/download`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: doc.mimeType }));
        setPdfUrl(url);
        setViewingDoc(doc);
      } catch {
        message.error('Failed to load document');
      }
    } else {
      handleDownload(doc);
    }
  };

  const closeViewer = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setViewingDoc(null);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FilePdfOutlined />;
    if (mimeType.includes('image')) return <FileImageOutlined />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileExcelOutlined />;
    if (mimeType.includes('word')) return <FileWordOutlined />;
    return <FileOutlined />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canView = (doc: Document) =>
    doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/');

  const columns = [
    {
      title: 'File',
      key: 'file',
      render: (_: unknown, record: Document) => (
        <Space>
          {getFileIcon(record.mimeType)}
          <span>{record.originalFileName}</span>
        </Space>
      ),
    },
    ...(showDocumentType ? [{
      title: 'Type',
      key: 'documentType',
      width: 150,
      render: (_: unknown, record: Document) =>
        record.documentTypeName ? <Tag>{record.documentTypeName}</Tag> : '-',
    }] : []),
    {
      title: 'Name',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Size',
      key: 'size',
      width: 100,
      render: (_: unknown, record: Document) => formatFileSize(record.fileSize),
    },
    {
      title: 'Uploaded By',
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      width: 150,
    },
    {
      title: 'Date',
      key: 'date',
      width: 120,
      render: (_: unknown, record: Document) =>
        new Date(record.createTimestamp).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: unknown, record: Document) => (
        <Space>
          {canView(record) && (
            <Tooltip title="View">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this document?"
              onConfirm={() => handleDelete(record.sysId)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
        <Col flex="auto">
          <Space>
            {showUpload && (
              <DocumentUpload
                module={module}
                entityType={entityType}
                entitySysId={entitySysId}
                onUploadComplete={fetchDocuments}
                showDocumentType={showDocumentType}
              />
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            {showDocumentType && documentTypes.length > 0 && (
              <Select
                placeholder="Filter by type"
                allowClear
                style={{ width: 180 }}
                value={selectedType}
                onChange={setSelectedType}
                options={documentTypes.map(dt => ({ value: dt.sysId, label: dt.name }))}
              />
            )}
            <Input
              placeholder="Search documents..."
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 220 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Space>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={filteredDocuments}
        rowKey="sysId"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'No documents' }}
      />
      <Modal
        title={viewingDoc?.originalFileName}
        open={!!viewingDoc}
        onCancel={closeViewer}
        footer={null}
        width="80%"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(100vh - 150px)', padding: 0 } }}
      >
        {pdfUrl && viewingDoc?.mimeType === 'application/pdf' && (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={viewingDoc.originalFileName}
          />
        )}
        {pdfUrl && viewingDoc?.mimeType.startsWith('image/') && (
          <div style={{ textAlign: 'center', height: '100%', overflow: 'auto' }}>
            <img
              src={pdfUrl}
              alt={viewingDoc.originalFileName}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DocumentList;
