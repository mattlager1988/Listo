import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  Card,
  Skeleton,
  ErrorBlock,
  Button,
} from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

interface PeriodLogRecord {
  sysId: number;
  entryTypeName: string;
  entryDate: string;
  notes: string | null;
}

interface PeriodEntry {
  sysId: number;
  startDate: string;
  preWeekStartDate: string | null;
  isStartDateEstimated: boolean;
  notes: string | null;
  entries: PeriodLogRecord[];
  createTimestamp: string;
  modifyTimestamp: string;
}

interface PeriodStats {
  lastPeriodDate: string | null;
  nextEstimatedDate: string | null;
  averageCycleDays: number | null;
  cycleCount: number;
}

const LizzyLogList: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PeriodEntry[]>([]);
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [entriesRes, statsRes] = await Promise.all([
        api.get('/lizzylog/periods'),
        api.get('/lizzylog/periods/stats'),
      ]);
      setEntries(entriesRes.data);
      setStats(statsRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navBar = (
    <NavBar
      back={null}
      left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
      style={{ '--height': '48px' }}
    >
      Lizzy Log
    </NavBar>
  );

  if (loading) {
    return (
      <>
        {navBar}
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
        {navBar}
        <ErrorBlock status="default" title="Unable to load Lizzy Log" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      {navBar}
      <PullToRefresh onRefresh={fetchData}>
        <div style={{ padding: 12 }}>
          <Card title="Prediction" style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Last Period</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {stats?.lastPeriodDate ? parseDate(stats.lastPeriodDate).format('MMM D, YYYY') : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Next Estimated</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#eb2f96' }}>
                  {stats?.nextEstimatedDate ? parseDate(stats.nextEstimatedDate).format('MMM D, YYYY') : '—'}
                </div>
              </div>
            </div>
            {!stats?.nextEstimatedDate && (
              <div style={{ textAlign: 'center', fontSize: 12, color: '#8c8c8c', marginTop: 8 }}>
                Not enough data yet — log 2+ periods for a prediction
              </div>
            )}
          </Card>
        </div>

        {entries.length === 0 ? (
          <ErrorBlock status="empty" title="No entries" description="Tap the button below to log your first period" />
        ) : (
          <List style={{ '--border-top': 'none' }}>
            {entries.map(entry => (
              <List.Item
                key={entry.sysId}
                onClick={() => navigate(`/lizzylog/${entry.sysId}`)}
                description={
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>
                      {entry.isStartDateEstimated && (
                        <span style={{ color: '#fa8c16' }}>est. · </span>
                      )}
                      {(entry.entries?.length ?? 0)} log record{(entry.entries?.length ?? 0) === 1 ? '' : 's'}
                      {entry.preWeekStartDate && (
                        <span> · pre-week {parseDate(entry.preWeekStartDate).format('MMM D')}</span>
                      )}
                    </div>
                    {entry.notes && (
                      <div style={{
                        fontSize: 12,
                        color: '#8c8c8c',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '70vw',
                      }}>
                        {entry.notes.substring(0, 80)}
                      </div>
                    )}
                  </div>
                }
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {parseDate(entry.startDate).format('MMM D, YYYY')}
                </span>
              </List.Item>
            ))}
          </List>
        )}
        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Fixed Add Button */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(50px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        padding: '8px 12px',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        zIndex: 99,
      }}>
        <Button block color="primary" onClick={() => navigate('/lizzylog/new')}>
          Add Entry
        </Button>
      </div>
    </>
  );
};

export default LizzyLogList;
