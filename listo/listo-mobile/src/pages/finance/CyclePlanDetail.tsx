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
      onClick: () => navigate(`/cycle/${plan.sysId}/edit`),
    },
    {
      text: 'Discontinue',
      key: 'discontinue',
      danger: true,
      onClick: async () => {
        const confirmed = await Dialog.confirm({ content: 'Discontinue this cycle plan?' });
        if (!confirmed) return;
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

  const daysTotal = dayjs(plan.endDate).diff(dayjs(plan.startDate), 'day') + 1;
  const daysElapsed = Math.max(0, dayjs().diff(dayjs(plan.startDate), 'day'));
  const daysRemaining = Math.max(0, dayjs(plan.endDate).diff(dayjs(), 'day'));

  const renderTransactionList = (items: CycleTransaction[], type: string) => (
    <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
      {items.map(txn => (
        <List.Item
          key={txn.sysId}
          onClick={() => navigate(`/cycle/${id}/transaction/${txn.sysId}/edit`)}
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
        {/* Plan Summary Card */}
        <Card style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{plan.cycleGoalName}</div>
              <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
                {dayjs(plan.startDate).format('MMM D')} - {dayjs(plan.endDate).format('MMM D, YYYY')}
              </div>
            </div>
            <Tag color={statusColors[plan.status]}>{plan.status}</Tag>
          </div>

          {/* Financial Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 16,
            padding: '12px 0',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>In</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a' }}>
                ${plan.amountIn.toFixed(0)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Out</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#ff4d4f' }}>
                ${plan.amountOut.toFixed(0)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Balance</div>
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                color: plan.balance >= 0 ? '#52c41a' : '#ff4d4f',
              }}>
                ${plan.balance.toFixed(0)}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Days</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>
                {daysElapsed}/{daysTotal}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Tag color="processing" style={{ fontSize: 12 }}>
                {daysRemaining} days remaining
              </Tag>
            </div>
          </div>

          {/* Transaction Totals */}
          {(totalCredits > 0 || totalDebits > 0) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid #f0f0f0',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Credits ({credits.length})</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#52c41a' }}>
                  ${totalCredits.toFixed(2)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>Debits ({debits.length})</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#ff4d4f' }}>
                  ${totalDebits.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {plan.notes && (
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #f0f0f0', color: '#595959', fontSize: 13 }}>
              {plan.notes}
            </div>
          )}
        </Card>

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
    </PullToRefresh>
  );
};

export default CyclePlanDetail;
