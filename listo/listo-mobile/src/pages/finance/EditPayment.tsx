import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Picker,
  Toast,
  Switch,
  Skeleton,
} from 'antd-mobile';
import api from '@shared/services/api';
import type { Payment, PaymentMethod } from '@shared/types';

const EditPayment: React.FC = () => {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [methodPickerVisible, setMethodPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!paymentId) return;
    try {
      const [paymentRes, methodsRes] = await Promise.all([
        api.get(`/finance/payments/${paymentId}`),
        api.get('/finance/paymentmethods'),
      ]);
      const pmt = paymentRes.data as Payment;
      setPayment(pmt);
      setPaymentMethods(methodsRes.data.filter((pm: PaymentMethod) => !pm.isDeleted));

      form.setFieldsValue({
        amount: pmt.amount.toString(),
        paymentMethodSysId: pmt.paymentMethodSysId,
        description: pmt.description || '',
        confirmationNumber: pmt.confirmationNumber || '',
        adjustLedger: true,
      });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load payment' });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [paymentId, form, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!paymentId) return;
    const values = form.getFieldsValue();
    const paymentMethodSysId = form.getFieldValue('paymentMethodSysId');

    if (!values.amount || parseFloat(values.amount) <= 0) {
      Toast.show({ content: 'Please enter an amount' });
      return;
    }
    if (!paymentMethodSysId) {
      Toast.show({ content: 'Please select a payment method' });
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/finance/payments/${paymentId}`, {
        amount: parseFloat(values.amount),
        paymentMethodSysId,
        description: values.description || null,
        confirmationNumber: values.confirmationNumber || null,
        adjustLedger: !!values.adjustLedger,
      });
      Toast.show({ icon: 'success', content: 'Payment updated' });
      navigate(-1);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to update payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const methodColumns = [paymentMethods.map(pm => ({ label: pm.name, value: pm.sysId }))];
  const selectedMethodName = paymentMethods.find(pm => pm.sysId === form.getFieldValue('paymentMethodSysId'))?.name;
  const bankName = payment?.bankAccountName;

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(-1)}>Edit Payment</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={4} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate(-1)}
        right={
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
        }
      >
        Edit Payment
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' } as React.CSSProperties}>
        <Form.Header>Payment Details</Form.Header>

        <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            style={{ fontSize: 24, fontWeight: 600 }}

          />
        </Form.Item>

        {payment?.bankAccountSysId != null && (
          <>
            <Form.Item
              name="adjustLedger"
              label={`Adjust ${bankName} balance`}
              childElementPosition="right"
            >
              <Switch defaultChecked />
            </Form.Item>
          </>
        )}

        <Form.Item
          label="Payment Method"
          onClick={() => setMethodPickerVisible(true)}
        >
          <Picker
            columns={methodColumns}
            visible={methodPickerVisible}
            onClose={() => setMethodPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('paymentMethodSysId', val[0]);
              setMethodPickerVisible(false);
            }}
            value={form.getFieldValue('paymentMethodSysId') ? [form.getFieldValue('paymentMethodSysId')] : undefined}
          >
            {() => (
              <span style={{ color: selectedMethodName ? undefined : '#ccc' }}>
                {selectedMethodName || 'Select payment method'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="confirmationNumber" label="Confirmation #">
          <Input placeholder="Confirmation number (optional)" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input placeholder="Payment description (optional)" />
        </Form.Item>

      </Form>
    </>
  );
};

export default EditPayment;
