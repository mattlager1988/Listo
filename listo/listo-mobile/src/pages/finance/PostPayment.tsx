import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Picker,
  Toast,
  Card,
  Tag,
  Skeleton,
} from 'antd-mobile';
import api from '@shared/services/api';
import type { Account, PaymentMethod, BankAccount } from '@shared/types';

const PostPayment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form] = Form.useForm();
  const [account, setAccount] = useState<Account | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [methodPickerVisible, setMethodPickerVisible] = useState(false);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [accountRes, methodsRes, banksRes] = await Promise.all([
        api.get(`/finance/accounts/${id}`),
        api.get('/finance/paymentmethods'),
        api.get('/finance/bankaccounts'),
      ]);
      const acct = accountRes.data as Account;
      setAccount(acct);
      setPaymentMethods(methodsRes.data.filter((pm: PaymentMethod) => !pm.isDeleted));
      setBankAccounts(banksRes.data.filter((ba: BankAccount) => !ba.isDiscontinued));

      // Pre-fill form
      form.setFieldsValue({
        amount: acct.amountDue > 0 ? acct.amountDue.toString() : '',
        paymentMethodSysId: acct.defaultPaymentMethodSysId,
        bankAccountSysId: acct.defaultBankAccountSysId,
      });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load data' });
      navigate('/bills');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    if (!values.amount || parseFloat(values.amount) <= 0) {
      Toast.show({ content: 'Please enter an amount' });
      return;
    }
    if (!values.paymentMethodSysId) {
      Toast.show({ content: 'Please select a payment method' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/payments', {
        accountSysId: Number(id),
        amount: parseFloat(values.amount),
        paymentMethodSysId: values.paymentMethodSysId,
        bankAccountSysId: values.bankAccountSysId || null,
        description: values.description || null,
        confirmationNumber: values.confirmationNumber || null,
      });
      Toast.show({ icon: 'success', content: 'Payment posted' });
      navigate(`/bills/${id}`);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to post payment' });
    } finally {
      setSubmitting(false);
    }
  };

  const methodColumns = [paymentMethods.map(pm => ({ label: pm.name, value: pm.sysId }))];
  const bankColumns = [
    [{ label: 'None', value: 0 }, ...bankAccounts.map(ba => ({ label: `${ba.name} ($${ba.balance.toFixed(0)})`, value: ba.sysId }))],
  ];

  const selectedMethodName = paymentMethods.find(pm => pm.sysId === form.getFieldValue('paymentMethodSysId'))?.name;
  const selectedBankName = bankAccounts.find(ba => ba.sysId === form.getFieldValue('bankAccountSysId'))?.name;

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(`/bills/${id}`)}>Post Payment</NavBar>
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
        onBack={() => navigate(`/bills/${id}`)}
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
            {submitting ? 'Posting...' : 'Post'}
          </span>
        }
      >
        Post Payment
      </NavBar>

      {/* Account Summary */}
      {account && (
        <Card style={{ margin: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{account.name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{account.accountTypeName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Amount Due</div>
              <div style={{
                fontSize: 18,
                fontWeight: 600,
                color: account.amountDue > 0 ? '#ff4d4f' : '#52c41a',
              }}>
                ${account.amountDue.toFixed(2)}
              </div>
            </div>
          </div>
          {account.autoPay && (
            <Tag color="success" style={{ marginTop: 8 }}>Auto Pay Enabled</Tag>
          )}
        </Card>
      )}

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Payment Details</Form.Header>

        <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
          <Input type="number" inputMode="decimal" placeholder="0.00" style={{ fontSize: 24, fontWeight: 600 }} />
        </Form.Item>

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

        <Form.Item
          label="Bank Account"
          onClick={() => setBankPickerVisible(true)}
        >
          <Picker
            columns={bankColumns}
            visible={bankPickerVisible}
            onClose={() => setBankPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('bankAccountSysId', val[0] === 0 ? null : val[0]);
              setBankPickerVisible(false);
            }}
            value={form.getFieldValue('bankAccountSysId') ? [form.getFieldValue('bankAccountSysId')] : [0]}
          >
            {() => (
              <span style={{ color: selectedBankName ? undefined : '#ccc' }}>
                {selectedBankName || 'None (optional)'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input placeholder="Payment description (optional)" />
        </Form.Item>

        <Form.Item name="confirmationNumber" label="Confirmation #">
          <Input placeholder="Confirmation number (optional)" />
        </Form.Item>

        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            block
            color="primary"
            size="large"
            loading={submitting}
            onClick={handleSubmit}
            style={{ borderRadius: 8 }}
          >
            Post Payment
          </Button>
          <Button
            block
            size="large"
            onClick={() => navigate(`/bills/${id}`)}
            style={{ borderRadius: 8 }}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </>
  );
};

export default PostPayment;
