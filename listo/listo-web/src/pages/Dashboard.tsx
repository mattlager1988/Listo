import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Tag, Button, Spin, message, Space, Tooltip } from 'antd';
import {
  BankOutlined,
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  HolderOutlined,
  ColumnWidthOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';

const parseDate = (date: string) => dayjs(date.substring(0, 10));

import api from '../services/api';


interface BankAccountSummary {
  sysId: number;
  name: string;
  accountType: string;
  balance: number;
  color: string | null;
}

interface CyclePlanSummary {
  sysId: number;
  startDate: string;
  endDate: string;
  cycleGoalName: string;
  amountIn: number;
  amountOut: number;
  balance: number;
  daysRemaining: number;
  totalCredits: number;
  totalDebits: number;
}

interface UpcomingBill {
  sysId: number;
  accountName: string;
  amountDue: number;
  dueDate: string;
  autoPay: boolean;
  accountFlag: string;
}

interface TrainingTypeHours {
  trainingType: string;
  hours: number;
}

interface AviationSummary {
  totalDualHours: number;
  totalSoloHours: number;
  lastTrainingDate: string | null;
  hoursByTypeLast30Days: TrainingTypeHours[];
}

interface DashboardSummary {
  bankAccounts: BankAccountSummary[];
  activeCyclePlan: CyclePlanSummary | null;
  upcomingBills: UpcomingBill[];
  aviationStats: AviationSummary | null;
}

interface PendingPayment {
  sysId: number;
  accountSysId: number;
  amount: number;
  description: string | null;
  dueDate: string | null;
  accountName: string;
}

type WidgetId = 'bank-accounts' | 'upcoming-bills' | 'cycle-plan' | 'pending-payments' | 'flight-training';

type WidgetWidth = 'full' | 'half';

interface WidgetConfig {
  id: WidgetId;
  width: WidgetWidth;
}

const defaultWidgetLayout: WidgetConfig[] = [
  { id: 'bank-accounts', width: 'full' },
  { id: 'upcoming-bills', width: 'half' },
  { id: 'pending-payments', width: 'half' },
  { id: 'cycle-plan', width: 'half' },
  { id: 'flight-training', width: 'half' },
];

interface SortableWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isLocked: boolean;
  width: WidgetWidth;
  onToggleWidth: () => void;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children, isLocked, width, onToggleWidth }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isLocked });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: width === 'full' ? '100%' : 'calc(50% - 8px)',
    flexShrink: 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ position: 'relative' }}>
        {!isLocked && (
          <>
            <div
              {...attributes}
              {...listeners}
              style={{
                position: 'absolute',
                top: 8,
                left: -24,
                cursor: 'grab',
                padding: '4px 8px',
                zIndex: 10,
                color: '#8c8c8c',
              }}
            >
              <HolderOutlined />
            </div>
            <Tooltip title={width === 'full' ? 'Make half width' : 'Make full width'}>
              <Button
                type="text"
                size="small"
                icon={<ColumnWidthOutlined />}
                onClick={onToggleWidth}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  zIndex: 10,
                  color: '#8c8c8c',
                }}
              />
            </Tooltip>
          </>
        )}
        {children}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetLayout, setWidgetLayout] = useState<WidgetConfig[]>(defaultWidgetLayout);
  const [isLocked, setIsLocked] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/finance/payments/pending'),
      ]);
      setData(summaryRes.data);
      setPendingPayments(paymentsRes.data);
    } catch {
      message.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLayout = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/layout');
      const saved = JSON.parse(response.data.layoutJson);
      // Handle both old format (array of IDs) and new format (array of WidgetConfig)
      if (Array.isArray(saved) && saved.length > 0) {
        if (typeof saved[0] === 'string') {
          // Old format - convert to new
          const converted: WidgetConfig[] = (saved as WidgetId[]).map(id => ({
            id,
            width: 'full' as WidgetWidth,
          }));
          setWidgetLayout(converted);
        } else {
          setWidgetLayout(saved as WidgetConfig[]);
        }
      }
    } catch {
      // No saved layout, use defaults
    }
  }, []);

  const saveLayout = useCallback(async (layout: WidgetConfig[]) => {
    try {
      await api.put('/dashboard/layout', {
        layoutJson: JSON.stringify(layout),
      });
    } catch {
      message.error('Failed to save layout');
    }
  }, []);

  const debouncedSave = useCallback((layout: WidgetConfig[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveLayout(layout);
    }, 500);
  }, [saveLayout]);

  useEffect(() => {
    fetchDashboard();
    fetchLayout();
  }, [fetchDashboard, fetchLayout]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setWidgetLayout((items) => {
          const oldIndex = items.findIndex(w => w.id === active.id);
          const newIndex = items.findIndex(w => w.id === over.id);
          const newLayout = arrayMove(items, oldIndex, newIndex);
          debouncedSave(newLayout);
          return newLayout;
        });
      }
    },
    [debouncedSave]
  );

  const handleToggleWidth = useCallback((widgetId: WidgetId) => {
    setWidgetLayout((items) => {
      const newLayout = items.map(w =>
        w.id === widgetId
          ? { ...w, width: (w.width === 'full' ? 'half' : 'full') as WidgetWidth }
          : w
      );
      debouncedSave(newLayout);
      return newLayout;
    });
  }, [debouncedSave]);

  const upcomingBillsColumns = [
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 80,
      render: (date: string) => parseDate(date).format('MMM D'),
    },
    {
      title: 'Amount',
      dataIndex: 'amountDue',
      key: 'amountDue',
      width: 90,
      align: 'right' as const,
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: '',
      key: 'flags',
      width: 100,
      render: (_: unknown, record: UpcomingBill) => (
        <Space size={4}>
          {record.autoPay && <Tag color="green">Auto</Tag>}
          {record.accountFlag === 'Alert' && <Tag color="red">Alert</Tag>}
        </Space>
      ),
    },
  ];

  const pendingPaymentsColumns = [
    {
      title: 'Account',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 80,
      render: (date: string | null) => date ? parseDate(date).format('MMM D') : '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 90,
      align: 'right' as const,
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
  ];

  const getBankBalanceColor = (balance: number) => {
    return balance >= 100 ? '#3f8600' : '#cf1322';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Card>
          <p>Unable to load dashboard data.</p>
          <Button onClick={fetchDashboard}>Retry</Button>
        </Card>
      </div>
    );
  }

  const chartData = data.aviationStats?.hoursByTypeLast30Days || [];

  const trainingTypeColors: Record<string, string> = {
    'Dual Flight Training': '#1890ff',
    'Solo Flight Training': '#52c41a',
    'Ground School': '#faad14',
    'Simulator': '#722ed1',
  };

  const flightHoursChartConfig = {
    data: chartData,
    xField: 'trainingType',
    yField: 'hours',
    color: (d: { trainingType: string }) => trainingTypeColors[d.trainingType] || '#8c8c8c',
    style: {
      radiusTopLeft: 4,
      radiusTopRight: 4,
    },
    label: {
      text: (d: { hours: number }) => d.hours > 0 ? d.hours.toFixed(1) : '',
      position: 'inside' as const,
      style: {
        fill: '#ffffff',
        fontSize: 12,
      },
    },
    axis: {
      x: {
        labelFontSize: 11,
      },
      y: {
        labelFontSize: 11,
        labelFormatter: (v: number) => `${v}h`,
      },
    },
    legend: false as const,
    height: 180,
  };

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'bank-accounts':
        return (
          <Card title="Bank Accounts" size="small">
            <Row gutter={[16, 16]}>
              {data.bankAccounts.map((account) => (
                <Col xs={24} sm={12} lg={6} key={account.sysId}>
                  <Card size="small">
                    <Statistic
                      title={account.name}
                      value={account.balance}
                      precision={2}
                      prefix={<BankOutlined style={{ color: getBankBalanceColor(account.balance) }} />}
                      valueStyle={{ color: getBankBalanceColor(account.balance) }}
                    />
                    <div style={{ marginTop: 4, color: '#8c8c8c', fontSize: 12 }}>
                      {account.accountType}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        );

      case 'upcoming-bills':
        return (
          <Card
            title="Upcoming Bills"
            size="small"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/finance/accounts')}>
                View All
              </Button>
            }
          >
            {data.upcomingBills.length > 0 ? (
              <Table
                dataSource={data.upcomingBills.slice(0, 5)}
                columns={upcomingBillsColumns}
                pagination={false}
                size="small"
                rowKey="sysId"
                onRow={() => ({
                  onClick: () => navigate('/finance/accounts'),
                  style: { cursor: 'pointer' },
                })}
              />
            ) : (
              <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
                No bills due in the next 14 days
              </p>
            )}
          </Card>
        );

      case 'cycle-plan':
        return data.activeCyclePlan ? (
          <Card
            title={`Active Cycle Plan - ${parseDate(data.activeCyclePlan.startDate).format('MMM D')} - ${parseDate(data.activeCyclePlan.endDate).format('MMM D, YYYY')}`}
            size="small"
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => navigate(`/finance/cycleplans/${data.activeCyclePlan!.sysId}`)}
              >
                View Details
              </Button>
            }
          >
            <Row gutter={12}>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Balance"
                    value={data.activeCyclePlan.balance}
                    precision={2}
                    prefix="$"
                    valueStyle={{
                      fontSize: 18,
                      color: data.activeCyclePlan.balance >= 0 ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Days Left"
                    value={data.activeCyclePlan.daysRemaining}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Goal"
                    value={data.activeCyclePlan.cycleGoalName}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Card>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>Transactions</div>
              {(data.activeCyclePlan.totalCredits > 0 || data.activeCyclePlan.totalDebits > 0) ? (
                <Column
                  data={[
                    { type: 'Credits', amount: data.activeCyclePlan.totalCredits },
                    { type: 'Debits', amount: data.activeCyclePlan.totalDebits },
                  ]}
                  xField="type"
                  yField="amount"
                  colorField="type"
                  scale={{ color: { range: ['#52c41a', '#ff4d4f'] } }}
                  style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                  label={{
                    text: (d: { amount: number }) => d.amount > 0 ? `$${d.amount.toFixed(0)}` : '',
                    position: 'inside' as const,
                    style: { fill: '#ffffff', fontSize: 12 },
                  }}
                  axis={{
                    x: { labelFontSize: 11 },
                    y: { labelFontSize: 11, labelFormatter: (v: number) => `$${v}` },
                  }}
                  legend={false as const}
                  height={180}
                />
              ) : (
                <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
                  No transactions yet
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card title="Cycle Plan" size="small">
            <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
              No active cycle plan
            </p>
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={() => navigate('/finance/cycleplans')}>
                View Cycle Plans
              </Button>
            </div>
          </Card>
        );

      case 'pending-payments':
        return (
          <Card
            title="Pending Payments"
            size="small"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/finance/accounts')}>
                View All
              </Button>
            }
          >
            {pendingPayments.length > 0 ? (
              <Table
                dataSource={pendingPayments.slice(0, 5)}
                columns={pendingPaymentsColumns}
                pagination={false}
                size="small"
                rowKey="sysId"
              />
            ) : (
              <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
                No pending payments
              </p>
            )}
          </Card>
        );

      case 'flight-training':
        return data.aviationStats ? (
          <Card
            title="Flight Training"
            size="small"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/aviation/training')}>
                View Log
              </Button>
            }
          >
            <Row gutter={12}>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Total Dual"
                    value={data.aviationStats.totalDualHours}
                    precision={1}
                    suffix="hrs"
                    valueStyle={{ fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Total Solo"
                    value={data.aviationStats.totalSoloHours}
                    precision={1}
                    suffix="hrs"
                    valueStyle={{ fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Statistic
                    title="Last Flight"
                    value={
                      data.aviationStats.lastTrainingDate
                        ? parseDate(data.aviationStats.lastTrainingDate).format('MMM D')
                        : 'N/A'
                    }
                    valueStyle={{ fontSize: 14 }}
                  />
                </Card>
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>Last 30 Days</div>
              {chartData.length > 0 ? (
                <Column {...flightHoursChartConfig} />
              ) : (
                <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
                  No training in the last 30 days
                </p>
              )}
            </div>
          </Card>
        ) : (
          <Card title="Flight Training" size="small">
            <p style={{ color: '#8c8c8c', textAlign: 'center', margin: '16px 0' }}>
              No flight training logs recorded
            </p>
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={() => navigate('/aviation/training')}>
                Start Logging
              </Button>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Space>
          <Tooltip title={isLocked ? 'Unlock to rearrange widgets' : 'Lock layout'}>
            <Button
              type="text"
              icon={isLocked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => setIsLocked(!isLocked)}
            />
          </Tooltip>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={fetchDashboard}
          />
        </Space>
      </div>

      <div style={{ paddingLeft: isLocked ? 0 : 24 }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgetLayout.map(w => w.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {widgetLayout.map((widget) => (
                <SortableWidget
                  key={widget.id}
                  id={widget.id}
                  isLocked={isLocked}
                  width={widget.width}
                  onToggleWidth={() => handleToggleWidth(widget.id)}
                >
                  {renderWidget(widget.id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default Dashboard;
