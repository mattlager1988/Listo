import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Card,
  List,
  Tag,
  Toast,
  Dialog,
  Skeleton,
  ErrorBlock,
  PullToRefresh,
  ActionSheet,
  Button,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { CyclePlan, CycleTransaction } from '@shared/types';

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  Pending: 'warning',
  Active: 'success',
  Completed: 'danger',
};

const txnStatusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  Confirmed: 'success',
  Planned: 'danger',
  Estimated: 'warning',
};

const CyclePlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<CyclePlan | null>(null);
  const [transactions, setTransactions] = useState<CycleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CycleTransaction | null>(null);
  const [txnSheetVisible, setTxnSheetVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const [planRes, txnRes] = await Promise.all([
        api.get(`/finance/cycleplans/${id}`),
        api.get(`/finance/cycletransactions/cycleplan/${id}`),
      ]);
      setPlan(planRes.data);
      setTransactions(txnRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const credits = useMemo(() => transactions.filter(t => t.transactionType === 'Credit'), [transactions]);
  const debits = useMemo(() => transactions.filter(t => t.transactionType === 'Debit'), [transactions]);
  const totalCredits = useMemo(() => credits.reduce((s, t) => s + t.amount, 0), [credits]);
  const totalDebits = useMemo(() => debits.reduce((s, t) => s + t.amount, 0), [debits]);

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/cycle')}>Cycle Plan</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <NavBar onBack={() => navigate('/cycle')}>Cycle Plan</NavBar>
        <ErrorBlock status="default" title="Plan not found" />
      </>
    );
  }

  const actionSheetActions: Action[] = [
    {
      text: 'Edit Plan',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/cycle/${plan.sysId}/edit`);
      },
    },
    {
      text: 'Discontinue',
      key: 'discontinue',
      danger: true,
      onClick: async () => {
        setActionSheetVisible(false);
        try {
          await api.post(`/finance/cycleplans/${plan.sysId}/discontinue`);
          Toast.show({ icon: 'success', content: 'Plan discontinued' });
          navigate('/cycle');
        } catch {
          Toast.show({ icon: 'fail', content: 'Failed to discontinue' });
        }
      },
    },
  ];

  const handleDeleteTransaction = async (txn: CycleTransaction) => {
    try {
      await api.delete(`/finance/cycletransactions/${txn.sysId}`);
      Toast.show({ icon: 'success', content: 'Transaction deleted' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete transaction' });
    }
  };

  const txnSheetActions: Action[] = selectedTransaction ? [
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => { setTxnSheetVisible(false); navigate(`/cycle/${id}/transaction/${selectedTransaction.sysId}/edit`); },
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: () => { setTxnSheetVisible(false); handleDeleteTransaction(selectedTransaction); },
    },
  ] : [];

  const daysTotal = dayjs(plan.endDate).diff(dayjs(plan.startDate), 'day') + 1;
  const daysElapsed = Math.max(0, dayjs().diff(dayjs(plan.startDate), 'day'));
  const daysRemaining = Math.max(0, dayjs(plan.endDate).diff(dayjs(), 'day'));

  const renderTransactionList = (items: CycleTransaction[], type: string) => (
    <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
      {items.map(txn => (
        <List.Item
          key={txn.sysId}
          onClick={() => { setSelectedTransaction(txn); setTxnSheetVisible(true); }}
          description={
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag
                color={txnStatusColors[txn.status]}
                style={{ fontSize: 10, padding: '0 4px' }}
              >
                {txn.status}
              </Tag>
              {txn.notes && (
                <span style={{ fontSize: 11, color: '#8c8c8c' }}>{txn.notes}</span>
              )}
            </div>
          }
          extra={
            <span style={{
              fontWeight: 600,
              fontSize: 14,
              color: type === 'Credit' ? '#52c41a' : '#ff4d4f',
            }}>
              {type === 'Debit' ? '-' : ''}${txn.amount.toFixed(2)}
            </span>
          }
        >
          {txn.name}
        </List.Item>
      ))}
    </List>
  );

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar
        onBack={() => navigate('/cycle')}
        right={
          <span
            onClick={() => setActionSheetVisible(true)}
            style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
          >
            More
          </span>
        }
      >
        {plan.cycleGoalName}
      </NavBar>

      <div style={{ padding: 12, paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#8c8c8c' }}>
              {dayjs(plan.startDate).format('MMM D')} – {dayjs(plan.endDate).format('MMM D, YYYY')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color={statusColors[plan.status]}>{plan.status}</Tag>
            <Tag color="processing">{daysRemaining}d left</Tag>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Income</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>${plan.amountIn.toFixed(0)}</div>
          </div>
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Expenses</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ff4d4f' }}>${plan.amountOut.toFixed(0)}</div>
          </div>
          <div style={{
            background: plan.balance >= 0 ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${plan.balance >= 0 ? '#b7eb8f' : '#ffccc7'}`,
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Balance</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: plan.balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
              ${plan.balance.toFixed(0)}
            </div>
          </div>
          <div style={{
            background: '#fafafa',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            padding: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Transactions</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#595959' }}>{transactions.length}</div>
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              {credits.length} in · {debits.length} out
            </div>
          </div>
        </div>

        {plan.notes && (
          <Card title="Notes" style={{ borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: '#595959' }}>{plan.notes}</div>
          </Card>
        )}

        {/* Credits */}
        <Card
          title="Credits"
          style={{ borderRadius: 8 }}
          extra={
            <span style={{ fontSize: 13, fontWeight: 600, color: '#52c41a' }}>
              ${totalCredits.toFixed(2)}
            </span>
          }
        >
          {credits.length > 0 ? (
            renderTransactionList(credits, 'Credit')
          ) : (
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No credits
            </div>
          )}
        </Card>

        {/* Debits */}
        <Card
          title="Debits"
          style={{ borderRadius: 8 }}
          extra={
            <span style={{ fontSize: 13, fontWeight: 600, color: '#ff4d4f' }}>
              ${totalDebits.toFixed(2)}
            </span>
          }
        >
          {debits.length > 0 ? (
            renderTransactionList(debits, 'Debit')
          ) : (
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No debits
            </div>
          )}
        </Card>
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 12px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        zIndex: 99,
      }}>
        <Button block color="primary" onClick={() => navigate(`/cycle/${id}/transaction/new`)}>
          Add Transaction
        </Button>
      </div>

      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />

      <ActionSheet
        visible={txnSheetVisible}
        actions={txnSheetActions}
        onClose={() => { setTxnSheetVisible(false); setSelectedTransaction(null); }}
        cancelText="Cancel"
      />
    </PullToRefresh>
  );
};

export default CyclePlanDetail;
