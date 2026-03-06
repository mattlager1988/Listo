import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Space, Tooltip, Popconfirm, message, Modal, Tag, Input, Select, Row, Col, Form, Upload, Progress } from 'antd';
import type { UploadFile } from 'antd';
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
  EditOutlined,
  UploadOutlined,
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
  modifyTimestamp: string;
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
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [editForm] = Form.useForm();
  const [editFileList, setEditFileList] = useState<UploadFile[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);

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

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/documents/${id}`)));
      message.success(`${selectedRowKeys.length} document${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchDocuments();
    } catch {
      message.error('Failed to delete documents');
    }
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    editForm.setFieldsValue({
      description: doc.description || doc.originalFileName,
      documentTypeSysId: doc.documentTypeSysId,
    });
    setEditFileList([]);
    setSelectedRowKeys([]);
  };

  const closeEditModal = () => {
    setEditingDoc(null);
    editForm.resetFields();
    setEditFileList([]);
  };

  const handleEditSave = async () => {
    if (!editingDoc) return;
    setEditSaving(true);
    setEditUploadProgress(0);
    try {
      const values = editForm.getFieldsValue();
      const formData = new FormData();

      if (values.description !== undefined) {
        formData.append('description', values.description || '');
      }
      if (values.documentTypeSysId !== undefined) {
        formData.append('documentTypeSysId', values.documentTypeSysId?.toString() || '');
      }
      if (editFileList.length > 0 && editFileList[0].originFileObj) {
        formData.append('file', editFileList[0].originFileObj);
      }

      await api.put(`/documents/${editingDoc.sysId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minute timeout for large files
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setEditUploadProgress(percent);
        },
      });
      message.success('Document updated');
      closeEditModal();
      setSelectedRowKeys([]);
      fetchDocuments();
    } catch {
      message.error('Failed to update document');
    } finally {
      setEditSaving(false);
      setEditUploadProgress(0);
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
      title: 'Name',
      key: 'name',
      width: 300,
      ellipsis: true,
      render: (_: unknown, record: Document) => (
        <Space>
          {getFileIcon(record.mimeType)}
          <span>{record.description || record.originalFileName}</span>
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
      title: 'Size',
      key: 'size',
      width: 100,
      render: (_: unknown, record: Document) => formatFileSize(record.fileSize),
    },
    {
      title: 'Uploaded',
      key: 'uploaded',
      width: 120,
      render: (_: unknown, record: Document) =>
        new Date(record.createTimestamp).toLocaleDateString(),
    },
    {
      title: 'Modified',
      key: 'modified',
      width: 120,
      render: (_: unknown, record: Document) =>
        new Date(record.modifyTimestamp).toLocaleDateString(),
    },
  ];

  // Get the selected document for single-select actions
  const selectedDoc = selectedRowKeys.length === 1
    ? filteredDocuments.find(d => d.sysId === selectedRowKeys[0])
    : null;

  return (
    <div>
      {/* Filter Row */}
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
                onChange={(value) => setSelectedType(value ?? null)}
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

      {/* Action Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          marginBottom: 16,
          background: '#fafafa',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
          gap: 4,
        }}
      >
        <Tooltip title="View">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            disabled={!selectedDoc || !canView(selectedDoc)}
            onClick={() => {
              if (selectedDoc && canView(selectedDoc)) handleView(selectedDoc);
            }}
          />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              if (selectedDoc) openEditModal(selectedDoc);
            }}
          />
        </Tooltip>
        <Tooltip title="Download">
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => {
              if (selectedDoc) handleDownload(selectedDoc);
            }}
          />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} document${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="This action cannot be undone."
            onConfirm={handleBulkDelete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            />
          </Popconfirm>
        </Tooltip>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8c8c8c' }}>
          {selectedRowKeys.length > 0
            ? `${selectedRowKeys.length} selected`
            : 'Select rows to perform actions'}
        </div>
      </div>

      <div className="condensed-table">
        <Table
          columns={columns}
          dataSource={filteredDocuments}
          rowKey="sysId"
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'No documents' }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          onRow={(record) => {
            let clickTimer: ReturnType<typeof setTimeout> | null = null;
            return {
              onClick: () => {
                clickTimer = setTimeout(() => {
                  const key = record.sysId;
                  setSelectedRowKeys(prev =>
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  );
                }, 200);
              },
              onDoubleClick: () => {
                if (clickTimer) clearTimeout(clickTimer);
                openEditModal(record);
              },
              style: { cursor: 'pointer' },
            };
          }}
        />
      </div>
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
      <Modal
        title="Edit Document"
        open={!!editingDoc}
        onCancel={closeEditModal}
        onOk={handleEditSave}
        okText="Save"
        confirmLoading={editSaving}
      >
        <Form form={editForm} layout="vertical" size="small" requiredMark={false} autoComplete="off">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item name="description" label="Name / Description" style={{ marginBottom: 0 }}>
              <Input placeholder="Enter document name or description" />
            </Form.Item>
            {showDocumentType && (
              <Form.Item name="documentTypeSysId" label="Document Type" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="Select document type"
                  allowClear
                  options={documentTypes.map(dt => ({ value: dt.sysId, label: dt.name }))}
                />
              </Form.Item>
            )}
            <Form.Item label="Replace File" style={{ marginBottom: 0 }}>
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                fileList={editFileList}
                onChange={({ fileList }) => setEditFileList(fileList)}
              >
                <Button icon={<UploadOutlined />} size="small">Select New File</Button>
              </Upload>
              <div style={{ marginTop: 4, color: '#888', fontSize: 12 }}>
                Leave empty to keep current file: {editingDoc?.originalFileName}
              </div>
            </Form.Item>
            {editSaving && editFileList.length > 0 && (
              <Form.Item label="Upload Progress" style={{ marginBottom: 0 }}>
                <Progress percent={editUploadProgress} status="active" />
              </Form.Item>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DocumentList;
