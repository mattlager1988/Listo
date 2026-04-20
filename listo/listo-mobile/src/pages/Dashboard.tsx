import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar, Card, Grid, List, PullToRefresh, Tag, Skeleton, ErrorBlock } from 'antd-mobile';
import { parseDate } from '@shared/utils/format';
import { UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { DashboardSummary, PendingPayment } from '@shared/types';
import { useMenu } from '../contexts/MenuContext';

const getBankBalanceColor = (balance: number) => {
  return balance >= 100 ? '#3f8600' : '#cf1322';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/finance/payments/pending'),
      ]);
      setData(summaryRes.data);
      setPendingPayments(paymentsRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Dashboard</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
          <div style={{ height: 16 }} />
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={4} animated />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Dashboard</NavBar>
        <ErrorBlock
          status="default"
          title="Unable to load dashboard"
          description="Pull down to retry"
        />
      </>
    );
  }

  const cyclePlan = data.activeCyclePlan;

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Dashboard</NavBar>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Bank Accounts */}
        {data.bankAccounts.length > 0 && (
          <Card title="Bank Accounts" style={{ borderRadius: 8 }}>
            <Grid columns={2} gap={8}>
              {data.bankAccounts.map(acct => (
                <Grid.Item key={acct.sysId}>
                  <div style={{
                    background: acct.color || '#fafafa',
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      {acct.name}
                    </div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: getBankBalanceColor(acct.balance),
                    }}>
                      ${acct.balance.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                      {acct.accountType}
                    </div>
                  </div>
                </Grid.Item>
              ))}
            </Grid>
          </Card>
        )}

        {/* Active Cycle Plan */}
        {cyclePlan ? (
          <Card
            title="Cycle Plan"
            style={{ borderRadius: 8 }}
            extra={
              <a onClick={() => navigate(`/cycle/${cyclePlan.sysId}`)} style={{ fontSize: 13 }}>
                Details
              </a>
            }
          >
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{cyclePlan.cycleGoalName}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                {parseDate(cyclePlan.startDate).format('MMM D')} - {parseDate(cyclePlan.endDate).format('MMM D, YYYY')}
              </div>
            </div>
            <Grid columns={3} gap={8}>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>In</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
                    ${cyclePlan.amountIn.toFixed(0)}
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Out</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>
                    ${cyclePlan.amountOut.toFixed(0)}
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Balance</div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: cyclePlan.balance >= 0 ? '#52c41a' : '#ff4d4f',
                  }}>
                    ${cyclePlan.balance.toFixed(0)}
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Credits</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
                    ${cyclePlan.totalCredits.toFixed(0)}
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Debits</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#ff4d4f' }}>
                    ${cyclePlan.totalDebits.toFixed(0)}
                  </div>
                </div>
              </Grid.Item>
              <Grid.Item>
                <div style={{ textAlign: 'center', background: '#fafafa', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>Days Left</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
                    {cyclePlan.daysRemaining}
                  </div>
                </div>
              </Grid.Item>
            </Grid>
          </Card>
        ) : (
          <Card title="Cycle Plan" style={{ borderRadius: 8 }}>
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No active cycle plan
            </div>
          </Card>
        )}

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <Card
            title="Pending Payments"
            style={{ borderRadius: 8 }}
            extra={
              <a onClick={() => navigate('/pending')} style={{ fontSize: 13 }}>
                Details
              </a>
            }
          >
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {pendingPayments.slice(0, 5).map(p => (
                <List.Item
                  key={p.sysId}
                  description={p.dueDate ? `Due ${parseDate(p.dueDate).format('MMM D')}` : undefined}
                  extra={
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      ${p.amount.toFixed(2)}
                    </span>
                  }
                >
                  {p.accountName}
                </List.Item>
              ))}
            </List>
            {pendingPayments.length > 5 && (
              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                <a onClick={() => navigate('/bills')} style={{ fontSize: 13 }}>
                  View all {pendingPayments.length} payments
                </a>
              </div>
            )}
          </Card>
        )}

        {/* Sober Days */}
        <Card title="Sober Days" style={{ borderRadius: 8 }}>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#3f8600', lineHeight: 1 }}>
              {dayjs().diff(dayjs('2024-08-31'), 'day') + 1}
            </div>
          </div>
        </Card>

        {/* Upcoming Bills */}
        {data.upcomingBills.length > 0 ? (
          <Card
            title="Upcoming Bills"
            style={{ borderRadius: 8 }}
            extra={
              <a onClick={() => navigate('/bills')} style={{ fontSize: 13 }}>
                View All
              </a>
            }
          >
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {data.upcomingBills.slice(0, 5).map(bill => (
                <List.Item
                  key={bill.sysId}
                  onClick={() => navigate('/bills')}
                  description={
                    <span>
                      {parseDate(bill.dueDate).format('MMM D')}
                      {bill.autoPay && (
                        <Tag color="success" style={{ marginLeft: 4, fontSize: 10 }}>Auto</Tag>
                      )}
                      {bill.accountFlag === 'Alert' && (
                        <Tag color="danger" style={{ marginLeft: 4, fontSize: 10 }}>Alert</Tag>
                      )}
                    </span>
                  }
                  extra={
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      ${bill.amountDue.toFixed(2)}
                    </span>
                  }
                  arrow={false}
                >
                  {bill.accountName}
                </List.Item>
              ))}
            </List>
          </Card>
        ) : (
          <Card title="Upcoming Bills" style={{ borderRadius: 8 }}>
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No bills due in the next 14 days
            </div>
          </Card>
        )}
      </div>
    </PullToRefresh>
  );
};

export default Dashboard;
