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
  hasFrontImage: boolean;
  hasBackImage: boolean;
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
  const [frontFileList, setFrontFileList] = useState<UploadFile[]>([]);
  const [backFileList, setBackFileList] = useState<UploadFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [cardFrontImages, setCardFrontImages] = useState<Record<number, string>>({});
  const [cardBackImages, setCardBackImages] = useState<Record<number, string>>({});

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

  const fetchCardImage = useCallback(async (cardSysId: number, side: 'front' | 'back') => {
    try {
      const response = await api.get(`/finance/accounts/${accountSysId}/cards/${cardSysId}/image/${side}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      if (side === 'front') {
        setCardFrontImages(prev => ({ ...prev, [cardSysId]: url }));
      } else {
        setCardBackImages(prev => ({ ...prev, [cardSysId]: url }));
      }
    } catch {
      // Ignore image load errors
    }
  }, [accountSysId]);

  useEffect(() => {
    if (visible && accountSysId) {
      fetchCards();
      setSelectedCard(null);
    }
  }, [visible, accountSysId, fetchCards]);

  useEffect(() => {
    // Load images for all cards
    cards.forEach(card => {
      if (card.hasFrontImage && !cardFrontImages[card.sysId]) {
        fetchCardImage(card.sysId, 'front');
      }
      if (card.hasBackImage && !cardBackImages[card.sysId]) {
        fetchCardImage(card.sysId, 'back');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, fetchCardImage]);

  // Clear image cache when modal closes
  useEffect(() => {
    if (!visible) {
      // Revoke all blob URLs when modal closes
      Object.values(cardFrontImages).forEach(url => URL.revokeObjectURL(url));
      Object.values(cardBackImages).forEach(url => URL.revokeObjectURL(url));
      setCardFrontImages({});
      setCardBackImages({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    setFrontFileList([]);
    setBackFileList([]);
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
    setFrontFileList([]);
    setBackFileList([]);
    setEditModalVisible(true);
  };

  const handleDelete = async (cardSysId: number) => {
    try {
      await api.delete(`/finance/accounts/${accountSysId}/cards/${cardSysId}`);
      message.success('Card deleted');
      if (selectedCard?.sysId === cardSysId) {
        setSelectedCard(null);
      }
      // Cleanup image URLs
      if (cardFrontImages[cardSysId]) {
        URL.revokeObjectURL(cardFrontImages[cardSysId]);
        setCardFrontImages(prev => {
          const updated = { ...prev };
          delete updated[cardSysId];
          return updated;
        });
      }
      if (cardBackImages[cardSysId]) {
        URL.revokeObjectURL(cardBackImages[cardSysId]);
        setCardBackImages(prev => {
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

      // Upload front image if provided
      if (frontFileList.length > 0 && frontFileList[0].originFileObj) {
        try {
          const formData = new FormData();
          formData.append('file', frontFileList[0].originFileObj);
          await api.post(`/finance/accounts/${accountSysId}/cards/${cardSysId}/image/front`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (err) {
          console.error('Front image upload failed:', err);
          message.error('Failed to upload front image');
        }
      }

      // Upload back image if provided
      if (backFileList.length > 0 && backFileList[0].originFileObj) {
        try {
          const formData = new FormData();
          formData.append('file', backFileList[0].originFileObj);
          await api.post(`/finance/accounts/${accountSysId}/cards/${cardSysId}/image/back`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (err) {
          console.error('Back image upload failed:', err);
          message.error('Failed to upload back image');
        }
      }

      // Clear cached images for this card so they get refetched
      if (cardFrontImages[cardSysId]) {
        URL.revokeObjectURL(cardFrontImages[cardSysId]);
      }
      if (cardBackImages[cardSysId]) {
        URL.revokeObjectURL(cardBackImages[cardSysId]);
      }
      setCardFrontImages(prev => {
        const updated = { ...prev };
        delete updated[cardSysId];
        return updated;
      });
      setCardBackImages(prev => {
        const updated = { ...prev };
        delete updated[cardSysId];
        return updated;
      });

      setEditModalVisible(false);
      form.resetFields();
      setFrontFileList([]);
      setBackFileList([]);
      fetchCards();
    } catch (err) {
      console.error('Card save failed:', err);
      message.error('Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const renderCardTile = (card: AccountCard) => {
    const frontImageUrl = cardFrontImages[card.sysId];
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
            background: frontImageUrl ? `url(${frontImageUrl}) center/cover` : '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px 8px 0 0',
          }}
        >
          {!frontImageUrl && <CreditCardOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}
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

                {cardFrontImages[selectedCard.sysId] && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Front</Text>
                    <img
                      src={cardFrontImages[selectedCard.sysId]}
                      alt={`${selectedCard.name} - Front`}
                      style={{ width: '100%', borderRadius: 4 }}
                    />
                  </>
                )}
                {cardBackImages[selectedCard.sysId] && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Back</Text>
                    <img
                      src={cardBackImages[selectedCard.sysId]}
                      alt={`${selectedCard.name} - Back`}
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
          setFrontFileList([]);
          setBackFileList([]);
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
            <Form.Item label="Front Image" style={{ marginBottom: 0 }}>
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                fileList={frontFileList}
                onChange={({ fileList: fl }) => setFrontFileList(fl)}
                accept="image/*"
                listType="picture"
              >
                <Button icon={<UploadOutlined />} size="small">
                  {editingCard?.hasFrontImage ? 'Replace Front' : 'Upload Front'}
                </Button>
              </Upload>
            </Form.Item>
            <Form.Item label="Back Image" style={{ marginBottom: 0 }}>
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                fileList={backFileList}
                onChange={({ fileList: fl }) => setBackFileList(fl)}
                accept="image/*"
                listType="picture"
              >
                <Button icon={<UploadOutlined />} size="small">
                  {editingCard?.hasBackImage ? 'Replace Back' : 'Upload Back'}
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
