import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Picker,
  TextArea,
  Toast,
  Skeleton,
} from 'antd-mobile';
import api from '@shared/services/api';
import type { CycleTransaction } from '@shared/types';

const TYPE_COLUMNS = [
  [
    { label: 'Credit', value: 'Credit' },
    { label: 'Debit', value: 'Debit' },
  ],
];

const STATUS_COLUMNS = [
  [
    { label: 'Confirmed', value: 'Confirmed' },
    { label: 'Planned', value: 'Planned' },
    { label: 'Estimated', value: 'Estimated' },
  ],
];

const TransactionForm: React.FC = () => {
  const { id: planId, txnId } = useParams<{ id: string; txnId: string }>();
  const navigate = useNavigate();
  const isEditing = !!txnId;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  const fetchTransaction = useCallback(async () => {
    if (!txnId) return;
    setLoading(true);
    try {
      const response = await api.get(`/finance/cycletransactions/${txnId}`);
      const t = response.data as CycleTransaction;
      form.setFieldsValue({
        name: t.name,
        amount: t.amount.toString(),
        transactionType: t.transactionType,
        status: t.status,
        notes: t.notes,
      });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load transaction' });
      navigate(`/cycle/${planId}`);
    } finally {
      setLoading(false);
    }
  }, [txnId, form, navigate, planId]);

  useEffect(() => {
    if (isEditing) {
      fetchTransaction();
    } else {
      form.setFieldsValue({
        transactionType: 'Debit',
        status: 'Planned',
        amount: '0',
      });
    }
  }, [fetchTransaction, isEditing, form]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    const transactionType = form.getFieldValue('transactionType');
    const status = form.getFieldValue('status');

    if (!values.name) {
      Toast.show({ content: 'Please enter a name' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cyclePlanSysId: Number(planId),
        name: values.name,
        amount: parseFloat(values.amount) || 0,
        transactionType: transactionType || 'Debit',
        status: status || 'Planned',
        notes: values.notes || null,
      };

      if (isEditing) {
        await api.put(`/finance/cycletransactions/${txnId}`, payload);
        Toast.show({ icon: 'success', content: 'Transaction updated' });
      } else {
        await api.post('/finance/cycletransactions', payload);
        Toast.show({ icon: 'success', content: 'Transaction created' });
      }
      navigate(`/cycle/${planId}`);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save transaction' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = form.getFieldValue('transactionType');
  const selectedStatus = form.getFieldValue('status');

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(`/cycle/${planId}`)}>
          {isEditing ? 'Edit Transaction' : 'New Transaction'}
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate(`/cycle/${planId}`)}
        right={
          isEditing ? (
            <span
              onClick={handleSubmit}
              style={{
                fontSize: 14,
                color: submitting ? '#8c8c8c' : '#1890ff',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </span>
          ) : undefined
        }
      >
        {isEditing ? 'Edit Transaction' : 'New Transaction'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Transaction Details</Form.Header>

        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Rent, Groceries" />
        </Form.Item>

        <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            style={{ fontSize: 24, fontWeight: 600 }}
          />
        </Form.Item>

        <Form.Item
          label="Type"
          onClick={() => setTypePickerVisible(true)}
        >
          <Picker
            columns={TYPE_COLUMNS}
            visible={typePickerVisible}
            onClose={() => setTypePickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('transactionType', val[0]);
              setTypePickerVisible(false);
            }}
            value={selectedType ? [selectedType] : ['Debit']}
          >
            {() => (
              <span style={{
                color: selectedType === 'Credit' ? '#52c41a' : '#ff4d4f',
                fontWeight: 600,
              }}>
                {selectedType || 'Debit'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item
          label="Status"
          onClick={() => setStatusPickerVisible(true)}
        >
          <Picker
            columns={STATUS_COLUMNS}
            visible={statusPickerVisible}
            onClose={() => setStatusPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('status', val[0]);
              setStatusPickerVisible(false);
            }}
            value={selectedStatus ? [selectedStatus] : ['Planned']}
          >
            {() => (
              <span>{selectedStatus || 'Planned'}</span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Notes (optional)" rows={3} />
        </Form.Item>

        {!isEditing && (
          <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button
              block
              color="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
              style={{ borderRadius: 8 }}
            >
              Create
            </Button>
            <Button
              block
              size="large"
              onClick={() => navigate(`/cycle/${planId}`)}
              style={{ borderRadius: 8 }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Form>
    </>
  );
};

export default TransactionForm;
