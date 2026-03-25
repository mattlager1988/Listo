import React, { useState, useEffect, useCallback } from 'react';
import {
  NavBar,
  List,
  PullToRefresh,
  Toast,
  Skeleton,
  ErrorBlock,
  ActionSheet,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import { parseDate } from '@shared/utils/format';
import { useNavigate } from 'react-router-dom';
import api from '@shared/services/api';
import type { Payment } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';
import { UnorderedListOutline } from 'antd-mobile-icons';

const PendingPayments: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get('/finance/payments/pending');
      setPayments(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCompletePayment = async (paymentId: number) => {
    try {
      await api.post(`/finance/payments/${paymentId}/complete`);
      Toast.show({ icon: 'success', content: 'Payment completed' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to complete payment' });
    }
  };

  const deletePayment = async (payment: Payment, reverseLedger: boolean) => {
    try {
      await api.delete(`/finance/payments/${payment.sysId}?reverseLedger=${reverseLedger}`);
      Toast.show({ icon: 'success', content: reverseLedger ? 'Payment deleted and ledger reversed' : 'Payment deleted' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete payment' });
    }
  };

  const actionSheetActions: Action[] = [
    {
      text: 'Edit Payment',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        if (selectedPayment) navigate(`/pending/${selectedPayment.sysId}/edit`);
      },
    },
    {
      text: 'Complete Payment',
      key: 'complete',
      onClick: () => {
        setActionSheetVisible(false);
        if (selectedPayment) handleCompletePayment(selectedPayment.sysId);
      },
    },
    {
      text: 'Delete Payment',
      key: 'delete',
      danger: true,
      onClick: () => {
        setActionSheetVisible(false);
        setDeleteSheetVisible(true);
      },
    },
  ];

  if (loading) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Pending</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Pending</NavBar>
        <ErrorBlock status="default" title="Unable to load payments" description="Pull down to retry" />
      </>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Pending
      </NavBar>

      {payments.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.9 }}>
            {payments.length} payment{payments.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>
            ${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </span>
        </div>
      )}

      {payments.length === 0 ? (
        <ErrorBlock
          status="empty"
          title="No pending payments"
          description="Post a payment from an account to see it here"
        />
      ) : (
        <List>
          {payments.map(payment => (
            <List.Item
              key={payment.sysId}
              onClick={() => {
                setSelectedPayment(payment);
                setActionSheetVisible(true);
              }}
              description={
                <span>
                  {payment.paymentMethodName}
                  {payment.dueDate && ` · Due ${parseDate(payment.dueDate).format('MMM D')}`}
                </span>
              }
              extra={
                <span style={{ fontWeight: 600 }}>${payment.amount.toFixed(2)}</span>
              }
            >
              {payment.accountName}
            </List.Item>
          ))}
        </List>
      )}

      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => {
          setActionSheetVisible(false);
        }}
        cancelText="Cancel"
      />

      <ActionSheet
        visible={deleteSheetVisible}
        actions={
          selectedPayment?.bankAccountSysId
            ? [
                {
                  text: 'Delete & Reverse Balance',
                  key: 'reverse',
                  danger: true,
                  description: `Restore $${selectedPayment.amount.toFixed(2)} to ${selectedPayment.bankAccountName}`,
                  onClick: () => { setDeleteSheetVisible(false); deletePayment(selectedPayment, true); },
                },
                {
                  text: 'Delete Only',
                  key: 'keep',
                  danger: true,
                  description: 'Keep bank balance as-is',
                  onClick: () => { setDeleteSheetVisible(false); deletePayment(selectedPayment, false); },
                },
              ]
            : [
                {
                  text: 'Delete Payment',
                  key: 'delete',
                  danger: true,
                  onClick: () => { if (selectedPayment) { setDeleteSheetVisible(false); deletePayment(selectedPayment, false); } },
                },
              ]
        }
        onClose={() => setDeleteSheetVisible(false)}
        cancelText="Cancel"
      />
    </PullToRefresh>
  );
};

export default PendingPayments;
