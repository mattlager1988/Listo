import React, { useState, useEffect, useCallback } from 'react';
import {
  NavBar,
  List,
  PullToRefresh,
  Toast,
  Dialog,
  Skeleton,
  ErrorBlock,
  ActionSheet,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { Payment } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';
import { UnorderedListOutline } from 'antd-mobile-icons';

const PendingPayments: React.FC = () => {
  const { openMenu } = useMenu();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

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

  const handleDeletePayment = async (payment: Payment) => {
    const confirmed = await Dialog.confirm({
      content: `Delete payment of $${payment.amount.toFixed(2)}?`,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/finance/payments/${payment.sysId}?reverseLedger=true`);
      Toast.show({ icon: 'success', content: 'Payment deleted' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete payment' });
    }
  };

  const actionSheetActions: Action[] = [
    {
      text: 'Complete Payment',
      key: 'complete',
      onClick: () => {
        if (selectedPayment) handleCompletePayment(selectedPayment.sysId);
      },
    },
    {
      text: 'Delete Payment',
      key: 'delete',
      danger: true,
      onClick: () => {
        if (selectedPayment) handleDeletePayment(selectedPayment);
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
                  {payment.dueDate && ` · Due ${dayjs(payment.dueDate).format('MMM D')}`}
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
          setSelectedPayment(null);
        }}
        cancelText="Cancel"
      />
    </PullToRefresh>
  );
};

export default PendingPayments;
