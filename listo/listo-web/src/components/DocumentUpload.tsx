import React, { useState, useEffect } from 'react';
import { Upload, Button, message, Modal, Form, Input, Select, Progress } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import api from '../services/api';

interface DocumentType {
  sysId: number;
  name: string;
}

interface DocumentUploadProps {
  module: string;
  entityType: string;
  entitySysId?: number;
  onUploadComplete?: () => void;
  showDocumentType?: boolean;
}

const { Dragger } = Upload;

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  module,
  entityType,
  entitySysId,
  onUploadComplete,
  showDocumentType = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (showDocumentType) {
      api.get('/aviation/documenttypes')
        .then(res => setDocumentTypes(res.data.filter((dt: DocumentType & { isDeleted: boolean }) => !dt.isDeleted)))
        .catch(() => {});
    }
  }, [showDocumentType]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0] as unknown as Blob);
    formData.append('description', form.getFieldValue('description') || '');
    formData.append('module', module);
    formData.append('entityType', entityType);
    if (entitySysId) {
      formData.append('entitySysId', entitySysId.toString());
    }
    const documentTypeSysId = form.getFieldValue('documentTypeSysId');
    if (documentTypeSysId) {
      formData.append('documentTypeSysId', documentTypeSysId.toString());
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for large uploads
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(percent);
        },
      });
      message.success('Document uploaded successfully');
      setFileList([]);
      form.resetFields();
      setModalVisible(false);
      onUploadComplete?.();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // Prevent auto upload
    },
    fileList,
    maxCount: 1,
  };

  return (
    <>
      <Button icon={<UploadOutlined />} onClick={() => setModalVisible(true)}>
        Upload Document
      </Button>
      <Modal
        title="Upload Document"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleUpload}
          >
            Upload
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="file" label="File">
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">
                Supported: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, GIF, TXT (max 50MB)
              </p>
            </Dragger>
          </Form.Item>
          <Form.Item name="description" label="Name">
            <Input placeholder="Document name..." />
          </Form.Item>
          {showDocumentType && documentTypes.length > 0 && (
            <Form.Item name="documentTypeSysId" label="Document Type">
              <Select
                placeholder="Select a document type"
                allowClear
                options={documentTypes.map(dt => ({ value: dt.sysId, label: dt.name }))}
              />
            </Form.Item>
          )}
          {uploading && (
            <Form.Item label="Upload Progress">
              <Progress percent={uploadProgress} status="active" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default DocumentUpload;
