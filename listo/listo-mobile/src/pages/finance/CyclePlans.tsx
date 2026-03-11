import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  List,
  Card,
  Tag,
  PullToRefresh,
  Skeleton,
  ErrorBlock,
  FloatingBubble,
} from 'antd-mobile';
import { AddOutline, UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { CyclePlan } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';

const statusColors: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  Pending: 'warning',
  Active: 'success',
  Completed: 'danger',
};

const CyclePlans: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [cyclePlans, setCyclePlans] = useState<CyclePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const response = await api.get('/finance/cycleplans');
      setCyclePlans(response.data);
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
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Cycle Plans</NavBar>
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
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Cycle Plans</NavBar>
        <ErrorBlock status="default" title="Unable to load cycle plans" description="Pull down to retry" />
      </>
    );
  }

  // Split into active/pending and completed
  const activePlans = cyclePlans.filter(p => p.status === 'Active' || p.status === 'Pending');
  const completedPlans = cyclePlans.filter(p => p.status === 'Completed');

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Cycle Plans</NavBar>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Active / Pending Plans */}
        {activePlans.length > 0 ? (
          <Card title="Active & Pending" style={{ borderRadius: 8 }}>
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {activePlans.map(plan => (
                <List.Item
                  key={plan.sysId}
                  onClick={() => navigate(`/cycle/${plan.sysId}`)}
                  description={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>
                        {dayjs(plan.startDate).format('MMM D')} - {dayjs(plan.endDate).format('MMM D, YYYY')}
                      </span>
                      <Tag color={statusColors[plan.status]} style={{ fontSize: 10, padding: '0 4px' }}>
                        {plan.status}
                      </Tag>
                    </div>
                  }
                  extra={
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: plan.balance >= 0 ? '#52c41a' : '#ff4d4f',
                      }}>
                        ${plan.balance.toFixed(0)}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>balance</div>
                    </div>
                  }
                >
                  {plan.cycleGoalName}
                </List.Item>
              ))}
            </List>
          </Card>
        ) : (
          <Card title="Active & Pending" style={{ borderRadius: 8 }}>
            <div style={{ textAlign: 'center', color: '#8c8c8c', padding: '12px 0' }}>
              No active cycle plans
            </div>
          </Card>
        )}

        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <Card
            title="Completed"
            style={{ borderRadius: 8 }}
            extra={
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                {completedPlans.length} plan{completedPlans.length !== 1 ? 's' : ''}
              </span>
            }
          >
            <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
              {completedPlans.slice(0, 10).map(plan => (
                <List.Item
                  key={plan.sysId}
                  onClick={() => navigate(`/cycle/${plan.sysId}`)}
                  description={
                    <span>
                      {dayjs(plan.startDate).format('MMM D')} - {dayjs(plan.endDate).format('MMM D, YYYY')}
                    </span>
                  }
                  extra={
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: plan.balance >= 0 ? '#52c41a' : '#ff4d4f',
                      }}>
                        ${plan.balance.toFixed(0)}
                      </div>
                    </div>
                  }
                >
                  {plan.cycleGoalName}
                </List.Item>
              ))}
              {completedPlans.length > 10 && (
                <List.Item>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                    +{completedPlans.length - 10} more plans
                  </span>
                </List.Item>
              )}
            </List>
          </Card>
        )}
      </div>

      <FloatingBubble
        style={{
          '--initial-position-bottom': '76px',
          '--initial-position-right': '16px',
          '--edge-distance': '16px',
          '--size': '48px',
          '--background': '#1890ff',
        }}
        onClick={() => navigate('/cycle/new')}
      >
        <AddOutline fontSize={24} color="#fff" />
      </FloatingBubble>
    </PullToRefresh>
  );
};

export default CyclePlans;
