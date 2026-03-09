import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Card,
  Button,
  Space,
  message,
  Form,
  Input,
  Upload,
  Popconfirm,
  Tooltip,
  Empty,
  Spin,
  Typography,
  Divider,
} from 'antd';
import type { UploadFile } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  UploadOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import PhoneInput from './PhoneInput';

const { Text } = Typography;

interface AccountCard {
  sysId: number;
  accountSysId: number;
  name: string;
  cardNumber: string | null;
  cardNumberFull: string | null;
  expirationDate: string | null;
  cvv: string | null;
  phoneNumber: string | null;
  imageDocumentSysId: number | null;
  createTimestamp: string;
}

interface CardViewModalProps {
  visible: boolean;
  onClose: () => void;
  accountSysId: number;
  accountName: string;
}

const CardViewModal: React.FC<CardViewModalProps> = ({
  visible,
  onClose,
  accountSysId,
  accountName,
}) => {
  const [cards, setCards] = useState<AccountCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<AccountCard | null>(null);
  const [editingCard, setEditingCard] = useState<AccountCard | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [cardImages, setCardImages] = useState<Record<number, string>>({});

  const fetchCards = useCallback(async () => {
    if (!accountSysId) return;
    setLoading(true);
    try {
      const response = await api.get(`/finance/accounts/${accountSysId}/cards`);
      setCards(response.data);
    } catch {
      message.error('Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  }, [accountSysId]);

  const fetchCardImage = useCallback(async (card: AccountCard) => {
    if (!card.imageDocumentSysId) return;
    try {
      const response = await api.get(`/documents/${card.imageDocumentSysId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      setCardImages(prev => ({ ...prev, [card.sysId]: url }));
    } catch {
      // Ignore image load errors
    }
  }, []);

  useEffect(() => {
    if (visible && accountSysId) {
      fetchCards();
      setSelectedCard(null);
    }
  }, [visible, accountSysId, fetchCards]);

  useEffect(() => {
    // Load images for all cards
    cards.forEach(card => {
      if (card.imageDocumentSysId && !cardImages[card.sysId]) {
        fetchCardImage(card);
      }
    });
  }, [cards, cardImages, fetchCardImage]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(cardImages).forEach(url => URL.revokeObjectURL(url));
    };
  }, [cardImages]);

  const handleCopy = async (value: string | null, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied`);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success(`${label} copied`);
    }
  };

  const handleCreate = () => {
    setEditingCard(null);
    form.resetFields();
    setFileList([]);
    setEditModalVisible(true);
  };

  const handleEdit = (card: AccountCard) => {
    setEditingCard(card);
    form.setFieldsValue({
      name: card.name,
      cardNumber: card.cardNumberFull,
      expirationDate: card.expirationDate,
      cvv: card.cvv,
      phoneNumber: card.phoneNumber,
    });
    setFileList([]);
    setEditModalVisible(true);
  };

  const handleDelete = async (cardSysId: number) => {
    try {
      await api.delete(`/finance/accounts/${accountSysId}/cards/${cardSysId}`);
      message.success('Card deleted');
      if (selectedCard?.sysId === cardSysId) {
        setSelectedCard(null);
      }
      // Cleanup image URL
      if (cardImages[cardSysId]) {
        URL.revokeObjectURL(cardImages[cardSysId]);
        setCardImages(prev => {
          const updated = { ...prev };
          delete updated[cardSysId];
          return updated;
        });
      }
      fetchCards();
    } catch {
      message.error('Failed to delete card');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      let cardSysId: number;

      if (editingCard) {
        await api.put(`/finance/accounts/${accountSysId}/cards/${editingCard.sysId}`, values);
        cardSysId = editingCard.sysId;
        message.success('Card updated');
      } else {
        const response = await api.post(`/finance/accounts/${accountSysId}/cards`, {
          ...values,
          accountSysId,
        });
        cardSysId = response.data.sysId;
        message.success('Card created');
      }

      // Upload image if provided
      if (fileList.length > 0 && fileList[0].originFileObj) {
        const formData = new FormData();
        formData.append('file', fileList[0].originFileObj);
        await api.post(`/finance/accounts/${accountSysId}/cards/${cardSysId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Clear cached image URL for this card
        if (cardImages[cardSysId]) {
          URL.revokeObjectURL(cardImages[cardSysId]);
          setCardImages(prev => {
            const updated = { ...prev };
            delete updated[cardSysId];
            return updated;
          });
        }
      }

      setEditModalVisible(false);
      form.resetFields();
      setFileList([]);
      fetchCards();
    } catch {
      message.error('Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const renderCardTile = (card: AccountCard) => {
    const imageUrl = cardImages[card.sysId];
    const isSelected = selectedCard?.sysId === card.sysId;

    return (
      <Card
        key={card.sysId}
        hoverable
        onClick={() => setSelectedCard(card)}
        style={{
          width: 200,
          border: isSelected ? '2px solid #1890ff' : '1px solid #e8e8e8',
          borderRadius: 8,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            height: 120,
            background: imageUrl ? `url(${imageUrl}) center/cover` : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px 8px 0 0',
          }}
        >
          {!imageUrl && <CreditCardOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}
        </div>
        <div style={{ padding: 12 }}>
          <Text strong ellipsis style={{ display: 'block' }}>{card.name}</Text>
          {card.cardNumber && (
            <Text type="secondary" style={{ fontSize: 12 }}>{card.cardNumber}</Text>
          )}
        </div>
      </Card>
    );
  };

  const renderDetailRow = (label: string, value: string | null, copyValue?: string | null) => {
    if (!value) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Text type="secondary" style={{ width: 100 }}>{label}:</Text>
        <Text strong style={{ flex: 1 }}>{value}</Text>
        <Tooltip title={`Copy ${label}`}>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(copyValue ?? value, label)}
          />
        </Tooltip>
      </div>
    );
  };

  return (
    <>
      <Modal
        title={`Cards - ${accountName}`}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        styles={{ body: { minHeight: 400 } }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button icon={<PlusOutlined />} onClick={handleCreate}>
            Add Card
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : cards.length === 0 ? (
          <Empty description="No cards" />
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
              {cards.map(renderCardTile)}
            </div>

            {selectedCard && (
              <Card
                title={selectedCard.name}
                style={{ width: 280, flexShrink: 0 }}
                extra={
                  <Space>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(selectedCard)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Delete this card?"
                      onConfirm={() => handleDelete(selectedCard.sysId)}
                    >
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                }
              >
                {renderDetailRow('Card Number', selectedCard.cardNumberFull, selectedCard.cardNumberFull)}
                {renderDetailRow('Expiration', selectedCard.expirationDate)}
                {renderDetailRow('CVV', selectedCard.cvv)}
                {renderDetailRow('Phone', selectedCard.phoneNumber)}

                {cardImages[selectedCard.sysId] && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <img
                      src={cardImages[selectedCard.sysId]}
                      alt={selectedCard.name}
                      style={{ width: '100%', borderRadius: 4 }}
                    />
                  </>
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={editingCard ? 'Edit Card' : 'Add Card'}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
          setFileList([]);
        }}
        onOk={handleSave}
        confirmLoading={saving}
        width={400}
      >
        <Form form={form} layout="vertical" size="small" requiredMark={false} autoComplete="off">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Form.Item
              name="name"
              label="Card Name"
              rules={[{ required: true, message: 'Required' }]}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder="e.g., Chase Visa" />
            </Form.Item>
            <Form.Item name="cardNumber" label="Card Number" style={{ marginBottom: 0 }}>
              <Input placeholder="1234 5678 9012 3456" />
            </Form.Item>
            <Form.Item name="expirationDate" label="Expiration Date" style={{ marginBottom: 0 }}>
              <Input placeholder="MM/YY" maxLength={5} />
            </Form.Item>
            <Form.Item name="cvv" label="CVV" style={{ marginBottom: 0 }}>
              <Input placeholder="123" maxLength={4} />
            </Form.Item>
            <Form.Item name="phoneNumber" label="Phone Number" style={{ marginBottom: 0 }}>
              <PhoneInput />
            </Form.Item>
            <Form.Item label="Card Image" style={{ marginBottom: 0 }}>
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: fl }) => setFileList(fl)}
                accept="image/*"
                listType="picture"
              >
                <Button icon={<UploadOutlined />} size="small">
                  {editingCard?.imageDocumentSysId ? 'Replace Image' : 'Upload Image'}
                </Button>
              </Upload>
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default CardViewModal;
