import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Picker,
  Switch,
  TextArea,
  DatePicker,
  Toast,
  Skeleton,
} from 'antd-mobile';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { Account, ListItem } from '@shared/types';

const ACCOUNT_FLAGS = [
  [
    { label: 'Standard', value: 'Standard' },
    { label: 'Static', value: 'Static' },
    { label: 'Alert', value: 'Alert' },
    { label: 'On Hold', value: 'OnHold' },
  ],
];

const AccountForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<ListItem[]>([]);
  const [accountOwners, setAccountOwners] = useState<ListItem[]>([]);
  const [account, setAccount] = useState<Account | null>(null);

  // Picker visibility
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);
  const [flagPickerVisible, setFlagPickerVisible] = useState(false);
  const [dueDatePickerVisible, setDueDatePickerVisible] = useState(false);

  const fetchLists = useCallback(async () => {
    try {
      const [typesRes, ownersRes] = await Promise.all([
        api.get('/finance/accounttypes'),
        api.get('/finance/accountowners'),
      ]);
      setAccountTypes(typesRes.data.filter((t: ListItem) => !t.isDeleted));
      setAccountOwners(ownersRes.data.filter((o: ListItem) => !o.isDeleted));
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load form data' });
    }
  }, []);

  const fetchAccount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/finance/accounts/${id}`);
      setAccount(response.data);
      const a = response.data as Account;
      form.setFieldsValue({
        name: a.name,
        accountTypeSysId: a.accountTypeSysId,
        accountOwnerSysId: a.accountOwnerSysId,
        amountDue: a.amountDue?.toString() || '0',
        dueDate: a.dueDate || null,
        accountNumber: a.accountNumber,
        phoneNumber: a.phoneNumber,
        webAddress: a.webAddress,
        username: a.username,
        password: a.password,
        notes: a.notes,
        accountFlag: a.accountFlag,
        autoPay: a.autoPay,
        resetAmountDue: a.resetAmountDue,
      });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load account' });
      navigate('/bills');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    fetchLists();
    if (isEditing) {
      fetchAccount();
    } else {
      form.setFieldsValue({
        accountFlag: 'Standard',
        autoPay: false,
        resetAmountDue: false,
        amountDue: '0',
      });
    }
  }, [fetchLists, fetchAccount, isEditing, form]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    const accountTypeSysId = form.getFieldValue('accountTypeSysId');
    const accountOwnerSysId = form.getFieldValue('accountOwnerSysId');
    const accountFlag = form.getFieldValue('accountFlag');
    const dueDate = form.getFieldValue('dueDate');

    if (!values.name?.trim()) {
      Toast.show({ content: 'Please enter an account name' });
      return;
    }
    if (!accountTypeSysId) {
      Toast.show({ content: 'Please select an account type' });
      return;
    }
    if (!accountOwnerSysId) {
      Toast.show({ content: 'Please select an owner' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        accountTypeSysId,
        accountOwnerSysId,
        amountDue: parseFloat(values.amountDue) || 0,
        dueDate: dueDate || null,
        accountNumber: values.accountNumber || null,
        phoneNumber: values.phoneNumber || null,
        webAddress: values.webAddress || null,
        username: values.username || null,
        password: values.password || null,
        notes: values.notes || null,
        accountFlag: accountFlag || 'Standard',
        autoPay: values.autoPay || false,
        resetAmountDue: values.resetAmountDue || false,
      };

      if (isEditing) {
        await api.put(`/finance/accounts/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Account updated' });
        navigate(`/bills/${id}`);
      } else {
        await api.post('/finance/accounts', payload);
        Toast.show({ icon: 'success', content: 'Account created' });
        navigate('/bills');
      }
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save account' });
    } finally {
      setSubmitting(false);
    }
  };

  // Build picker columns
  const typeColumns = [accountTypes.map(t => ({ label: t.name, value: t.sysId }))];
  const ownerColumns = [accountOwners.map(o => ({ label: o.name, value: o.sysId }))];

  const selectedTypeName = accountTypes.find(t => t.sysId === form.getFieldValue('accountTypeSysId'))?.name;
  const selectedOwnerName = accountOwners.find(o => o.sysId === form.getFieldValue('accountOwnerSysId'))?.name;
  const selectedFlagName = form.getFieldValue('accountFlag') === 'OnHold' ? 'On Hold' : form.getFieldValue('accountFlag');

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/bills')}>
          {isEditing ? 'Edit Account' : 'New Account'}
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={6} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate(isEditing ? `/bills/${id}` : '/bills')}
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
        {isEditing ? 'Edit Account' : 'New Account'}
      </NavBar>

      <Form
        form={form}
        layout="vertical"
        style={{ '--border-top': 'none' }}
        initialValues={isEditing && account ? undefined : {
          accountFlag: 'Standard',
          autoPay: false,
          resetAmountDue: false,
          amountDue: '0',
        }}
      >
        <Form.Header>Basic Info</Form.Header>

        <Form.Item name="name" label="Account Name" rules={[{ required: true, message: 'Name is required' }]}>
          <Input placeholder="e.g. Electric Company" />
        </Form.Item>

        <Form.Item
          label="Account Type"
          onClick={() => setTypePickerVisible(true)}
        >
          <Picker
            columns={typeColumns}
            visible={typePickerVisible}
            onClose={() => setTypePickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('accountTypeSysId', val[0]);
              setTypePickerVisible(false);
            }}
            value={form.getFieldValue('accountTypeSysId') ? [form.getFieldValue('accountTypeSysId')] : undefined}
          >
            {() => (
              <span style={{ color: selectedTypeName ? undefined : '#ccc' }}>
                {selectedTypeName || 'Select type'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item
          label="Owner"
          onClick={() => setOwnerPickerVisible(true)}
        >
          <Picker
            columns={ownerColumns}
            visible={ownerPickerVisible}
            onClose={() => setOwnerPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('accountOwnerSysId', val[0]);
              setOwnerPickerVisible(false);
            }}
            value={form.getFieldValue('accountOwnerSysId') ? [form.getFieldValue('accountOwnerSysId')] : undefined}
          >
            {() => (
              <span style={{ color: selectedOwnerName ? undefined : '#ccc' }}>
                {selectedOwnerName || 'Select owner'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Header>Billing</Form.Header>

        <Form.Item name="amountDue" label="Amount Due">
          <Input type="number" inputMode="decimal" placeholder="0.00" />
        </Form.Item>

        <Form.Item
          label="Due Date"
          onClick={() => setDueDatePickerVisible(true)}
        >
          <DatePicker
            visible={dueDatePickerVisible}
            onClose={() => setDueDatePickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('dueDate', dayjs(val).format('YYYY-MM-DD'));
              setDueDatePickerVisible(false);
            }}
          >
            {() => {
              const dueDate = form.getFieldValue('dueDate');
              return (
                <span style={{ color: dueDate ? undefined : '#ccc' }}>
                  {dueDate ? dayjs(dueDate).format('MMM D, YYYY') : 'Select date'}
                </span>
              );
            }}
          </DatePicker>
        </Form.Item>

        <Form.Item
          label="Flag"
          onClick={() => setFlagPickerVisible(true)}
        >
          <Picker
            columns={ACCOUNT_FLAGS}
            visible={flagPickerVisible}
            onClose={() => setFlagPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('accountFlag', val[0]);
              setFlagPickerVisible(false);
            }}
            value={form.getFieldValue('accountFlag') ? [form.getFieldValue('accountFlag')] : ['Standard']}
          >
            {() => (
              <span>{selectedFlagName || 'Standard'}</span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="autoPay" label="Auto Pay" childElementPosition="right">
          <Switch />
        </Form.Item>

        <Form.Item name="resetAmountDue" label="Reset Amount After Payment" childElementPosition="right">
          <Switch />
        </Form.Item>

        <Form.Header>Account Details</Form.Header>

        <Form.Item name="accountNumber" label="Account Number">
          <Input placeholder="Account number" />
        </Form.Item>

        <Form.Item name="phoneNumber" label="Phone">
          <Input type="tel" placeholder="Phone number" />
        </Form.Item>

        <Form.Item name="webAddress" label="Website">
          <Input type="url" placeholder="https://..." />
        </Form.Item>

        <Form.Item name="username" label="Username">
          <Input placeholder="Username" autoComplete="off" />
        </Form.Item>

        <Form.Item name="password" label="Password">
          <Input type="password" placeholder="Password" autoComplete="off" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Notes" rows={3} />
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
              Create Account
            </Button>
            <Button
              block
              size="large"
              onClick={() => navigate('/bills')}
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

export default AccountForm;
