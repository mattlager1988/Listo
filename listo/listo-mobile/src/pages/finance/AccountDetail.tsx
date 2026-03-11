import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Card,
  List,
  Button,
  Tag,
  Toast,
  Dialog,
  Skeleton,
  ErrorBlock,
  PullToRefresh,
  ActionSheet,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { Account, Payment } from '@shared/types';

const flagColors: Record<string, string> = {
  Standard: 'default',
  Alert: 'danger',
  Static: 'primary',
  OnHold: 'warning',
};

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const [accountRes, paymentsRes] = await Promise.all([
        api.get(`/finance/accounts/${id}`),
        api.get(`/finance/payments/account/${id}`),
      ]);
      setAccount(accountRes.data);
      setPayments(paymentsRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDiscontinue = async () => {
    if (!account) return;
    const confirmed = await Dialog.confirm({
      content: `Discontinue "${account.name}"?`,
    });
    if (!confirmed) return;
    try {
      await api.post(`/finance/accounts/${account.sysId}/discontinue`);
      Toast.show({ icon: 'success', content: 'Account discontinued' });
      navigate('/bills');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to discontinue' });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    // Use textarea fallback for mobile browser compatibility
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      Toast.show({ content: `${label} copied` });
    } catch {
      Toast.show({ icon: 'fail', content: 'Copy failed' });
    }
    document.body.removeChild(textarea);
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/bills')}>Account</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !account) {
    return (
      <>
        <NavBar onBack={() => navigate('/bills')}>Account</NavBar>
        <ErrorBlock status="default" title="Account not found" />
      </>
    );
  }

  const completedPayments = payments.filter(p => p.status === 'Completed');

  const actionSheetActions: Action[] = [
    { text: 'Edit Account', key: 'edit', onClick: () => navigate(`/bills/${account.sysId}/edit`) },
    ...(account.webAddress ? [{
      text: 'Open Website',
      key: 'launch',
      onClick: () => {
        if (account.password) {
          copyToClipboard(account.password, 'Password');
        }
        const url = account.webAddress!.startsWith('http') ? account.webAddress! : `https://${account.webAddress!}`;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    }] : []),
    ...(account.username ? [{
      text: 'Copy Username',
      key: 'username',
      onClick: () => copyToClipboard(account.username!, 'Username'),
    }] : []),
    ...(account.password ? [{
      text: 'Copy Password',
      key: 'password',
      onClick: () => copyToClipboard(account.password!, 'Password'),
    }] : []),
    {
      text: 'Discontinue',
      key: 'discontinue',
      danger: true,
      onClick: handleDiscontinue,
    },
  ];

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar
        onBack={() => navigate('/bills')}
        right={
          <span
            onClick={() => setActionSheetVisible(true)}
            style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
          >
            More
          </span>
        }
      >
        {account.name}
      </NavBar>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Account Summary Card */}
        <Card style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{account.name}</div>
              <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
                {account.accountTypeName} · {account.accountOwnerName}
              </div>
            </div>
            <Tag color={flagColors[account.accountFlag]}>
              {account.accountFlag === 'OnHold' ? 'On Hold' : account.accountFlag}
            </Tag>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 16,
            padding: '12px 0',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Amount Due</div>
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                color: account.amountDue > 0 ? '#ff4d4f' : '#52c41a',
              }}>
                ${account.amountDue.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Due Date</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {account.dueDate ? dayjs(account.dueDate).format('MMM D') : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Last Paid</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {account.lastPaymentDate
                  ? `$${account.lastPaymentAmount?.toFixed(0)} · ${dayjs(account.lastPaymentDate).format('MM/DD')}`
                  : '—'
                }
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {account.autoPay && <Tag color="success">Auto Pay</Tag>}
            {account.resetAmountDue && <Tag color="processing">Reset Due</Tag>}
            {account.webAddress && <Tag color="default">Has Website</Tag>}
            {account.username && <Tag color="default">Has Login</Tag>}
          </div>

          {account.notes && (
            <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid #f0f0f0', color: '#595959', fontSize: 13 }}>
              {account.notes}
            </div>
          )}
        </Card>

        {/* Post Payment Button */}
        <Button
          color="primary"
          size="large"
          block
          style={{ borderRadius: 8 }}
          onClick={() => navigate(`/bills/${account.sysId}/pay`)}
        >
          Post Payment
        </Button>

        {/* Account Info */}
        {(account.phoneNumber || account.webAddress || account.accountNumber) && (
          <Card title="Account Info" style={{ borderRadius: 8 }}>
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {account.accountNumber && (
                <List.Item
                  description="Account Number"
                  onClick={() => copyToClipboard(account.accountNumber!, 'Account number')}
                >
                  ···{account.accountNumber.slice(-4)}
                </List.Item>
              )}
              {account.phoneNumber && (
                <List.Item
                  description="Phone"
                  onClick={() => window.open(`tel:${account.phoneNumber}`, '_self')}
                >
                  {account.phoneNumber}
                </List.Item>
              )}
              {account.webAddress && (
                <List.Item
                  description="Website"
                  onClick={() => window.open(account.webAddress!, '_blank')}
                >
                  {account.webAddress.replace(/^https?:\/\//, '').slice(0, 30)}
                </List.Item>
              )}
            </List>
          </Card>
        )}

        {/* Payment History */}
        <Card
          title="Payment History"
          style={{ borderRadius: 8 }}
          extra={
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              {completedPayments.length} payment{completedPayments.length !== 1 ? 's' : ''}
            </span>
          }
        >
          {completedPayments.length > 0 ? (
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {completedPayments.slice(0, 10).map(payment => (
                <List.Item
                  key={payment.sysId}
                  description={
                    <span>
                      {payment.paymentMethodName}
                      {payment.completedDate && ` · ${dayjs(payment.completedDate).format('MMM D, YYYY')}`}
                      {payment.confirmationNumber && ` · #${payment.confirmationNumber}`}
                    </span>
                  }
                  extra={
                    <span style={{ fontWeight: 600 }}>${payment.amount.toFixed(2)}</span>
                  }
                >
                  {payment.description || 'Payment'}
                  {payment.bankAccountName && (
                    <Tag style={{ marginLeft: 4, fontSize: 10 }}>{payment.bankAccountName}</Tag>
                  )}
                </List.Item>
              ))}
              {completedPayments.length > 10 && (
                <List.Item>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                    +{completedPayments.length - 10} more payments
                  </span>
                </List.Item>
              )}
            </List>
          ) : (
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No payment history
            </div>
          )}
        </Card>
      </div>

      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />

    </PullToRefresh>
  );
};

export default AccountDetail;
