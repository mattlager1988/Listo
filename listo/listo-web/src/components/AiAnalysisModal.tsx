import React, { useState, useEffect, useRef } from 'react';
import { Modal, Select, Button, Space, Spin, message, Typography, Empty } from 'antd';
import {
  RobotOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';

const { Paragraph } = Typography;

interface AiPrompt {
  sysId: number;
  name: string;
  promptText: string;
}

interface AiAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  selectedLogIds: number[];
}

const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  open,
  onClose,
  selectedLogIds,
}) => {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchPrompts();
      setAnalysis(null);
      setSelectedPromptId(null);
    }
  }, [open]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/aviation/aiprompts');
      setPrompts(response.data);
    } catch {
      message.error('Failed to fetch AI prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPromptId) {
      message.warning('Please select an AI prompt');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await api.post('/aviation/aiprompts/analyze', {
        trainingLogIds: selectedLogIds,
        promptSysId: selectedPromptId,
      });
      setAnalysis(response.data.analysis);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrint = () => {
    if (!analysis || !contentRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const selectedPrompt = prompts.find(p => p.sysId === selectedPromptId);
      const renderedContent = contentRef.current.innerHTML;
      printWindow.document.write(`
        <html>
          <head>
            <title>Training Analysis - ${selectedPrompt?.name || 'AI Analysis'}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
              }
              h1 { font-size: 20px; margin-bottom: 8px; }
              .meta { color: #666; margin-bottom: 24px; font-size: 14px; }
              .content h1 { font-size: 18px; margin-top: 24px; }
              .content h2 { font-size: 16px; margin-top: 20px; }
              .content h3 { font-size: 14px; margin-top: 16px; }
              .content ul, .content ol { padding-left: 24px; }
              .content li { margin: 4px 0; }
              .content p { margin: 12px 0; }
              .content strong { font-weight: 600; }
              .content code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
              .content pre { background: #f0f0f0; padding: 12px; border-radius: 6px; overflow-x: auto; }
              .content blockquote { border-left: 3px solid #ddd; padding-left: 12px; margin-left: 0; color: #666; }
              .content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
              .content th, .content td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .content th { background: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>Training Analysis</h1>
            <div class="meta">
              Prompt: ${selectedPrompt?.name || 'N/A'}<br/>
              Records analyzed: ${selectedLogIds.length}<br/>
              Generated: ${new Date().toLocaleString()}
            </div>
            <div class="content">${renderedContent}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSavePdf = () => {
    if (!analysis) return;
    const selectedPrompt = prompts.find(p => p.sysId === selectedPromptId);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text('Training Analysis', 20, 20);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Prompt: ${selectedPrompt?.name || 'N/A'}`, 20, 30);
    doc.text(`Records analyzed: ${selectedLogIds.length}`, 20, 36);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);

    // Content
    doc.setFontSize(11);
    doc.setTextColor(0);
    const splitText = doc.splitTextToSize(analysis, 170);
    doc.text(splitText, 20, 55);

    // Save
    const filename = `training-analysis-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    message.success('PDF saved');
  };

  const handleCopyToClipboard = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis);
      message.success('Copied to clipboard');
    } catch {
      message.error('Failed to copy to clipboard');
    }
  };

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          Analyze with AI
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={800}
      footer={
        analysis ? (
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              Print
            </Button>
            <Button icon={<FilePdfOutlined />} onClick={handleSavePdf}>
              Save PDF
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopyToClipboard}>
              Copy
            </Button>
            <Button type="primary" onClick={onClose}>
              Close
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleAnalyze}
              loading={analyzing}
              disabled={!selectedPromptId}
            >
              Analyze
            </Button>
          </Space>
        )
      }
    >
      {!analysis ? (
        <div>
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            Select an AI prompt to analyze {selectedLogIds.length} training record
            {selectedLogIds.length !== 1 ? 's' : ''}.
          </Paragraph>

          <Select
            placeholder="Select AI prompt"
            style={{ width: '100%' }}
            loading={loading}
            value={selectedPromptId}
            onChange={setSelectedPromptId}
            options={prompts.map(p => ({
              value: p.sysId,
              label: p.name,
            }))}
          />

          {prompts.length === 0 && !loading && (
            <Empty
              description="No AI prompts configured"
              style={{ marginTop: 24 }}
            >
              <Paragraph type="secondary">
                Create AI prompts in Admin &gt; List Manager &gt; Aviation &gt; AI Prompts
              </Paragraph>
            </Empty>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>Analyzing training records...</Paragraph>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={contentRef}
          className="markdown-content"
          style={{
            padding: 16,
            background: '#fafafa',
            borderRadius: 6,
            border: '1px solid #d9d9d9',
            maxHeight: 500,
            overflow: 'auto',
            lineHeight: 1.6,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
        </div>
      )}
    </Modal>
  );
};

export default AiAnalysisModal;
