import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  Tag,
  Skeleton,
  ErrorBlock,
  Button,
} from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

interface TrainingLog {
  sysId: number;
  date: string;
  description: string;
  hoursFlown: number;
  trainingTypeSysId: number;
  trainingTypeName: string;
  aircraftSysId: number | null;
  aircraftPlaneId: string | null;
  aircraftName: string | null;
}

interface Summary {
  totalHours: number;
  totalEntries: number;
  hoursByType: Record<string, number>;
}

interface Attachment {
  sysId: number;
  originalFileName: string;
  mimeType: string;
  entitySysId: number;
}

const Training: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attachmentMap, setAttachmentMap] = useState<Map<number, Attachment[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [logsRes, summaryRes, attachRes] = await Promise.all([
        api.get('/aviation/traininglogs'),
        api.get('/aviation/traininglogs/summary'),
        api.get('/documents?module=aviation&entityType=training_log'),
      ]);
      setLogs(logsRes.data);
      setSummary(summaryRes.data);

      const map = new Map<number, Attachment[]>();
      for (const doc of attachRes.data) {
        const existing = map.get(doc.entitySysId) || [];
        existing.push(doc);
        map.set(doc.entitySysId, existing);
      }
      setAttachmentMap(map);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedHoursByType = useMemo(() => {
    if (!summary?.hoursByType) return [];
    return Object.entries(summary.hoursByType)
      .sort(([, a], [, b]) => b - a);
  }, [summary]);

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Training
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
          <div style={{ height: 16 }} />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Training
        </NavBar>
        <ErrorBlock status="default" title="Unable to load training logs" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Training
      </NavBar>
      <PullToRefresh onRefresh={fetchData}>
        {/* Summary Metrics */}
        {summary && (
          <div style={{ padding: '12px 12px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{
                background: '#e6f4ff',
                border: '1px solid #91caff',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Total Hours</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>
                  {summary.totalHours.toFixed(1)}
                </div>
              </div>
              <div style={{
                background: '#fafafa',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>Total Entries</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#595959' }}>
                  {summary.totalEntries}
                </div>
              </div>
            </div>

            {/* Hours by Type Breakdown */}
            {sortedHoursByType.length > 0 && (
              <div style={{
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8, fontWeight: 600 }}>
                  Hours by Type
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sortedHoursByType.map(([type, hours]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>{type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          height: 6,
                          width: Math.max(20, (hours / summary.totalHours) * 120),
                          background: '#1677ff',
                          borderRadius: 3,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1677ff', minWidth: 40, textAlign: 'right' }}>
                          {hours.toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Training Logs List */}
        {logs.length === 0 ? (
          <ErrorBlock status="empty" title="No training logs" description="Tap the button below to log your first training" />
        ) : (
          <List style={{ '--border-top': 'none' }}>
            {logs.map(log => {
              const hasAttachments = (attachmentMap.get(log.sysId)?.length ?? 0) > 0;
              return (
                <List.Item
                  key={log.sysId}
                  onClick={() => navigate(`/aviation/training/${log.sysId}`)}
                  description={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12 }}>
                        {dayjs(log.date).format('MMM D, YYYY')}
                      </span>
                      {log.aircraftPlaneId && (
                        <>
                          <span style={{ color: '#d9d9d9' }}>|</span>
                          <span style={{ fontSize: 12 }}>
                            {log.aircraftPlaneId}
                          </span>
                        </>
                      )}
                      {hasAttachments && (
                        <Tag color="processing" style={{ fontSize: 10, padding: '0 4px', marginLeft: 2 }}>
                          {attachmentMap.get(log.sysId)!.length} file{attachmentMap.get(log.sysId)!.length > 1 ? 's' : ''}
                        </Tag>
                      )}
                    </div>
                  }
                  extra={
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1677ff' }}>
                      {log.hoursFlown.toFixed(1)}h
                    </span>
                  }
                  arrow
                >
                  <span style={{ fontSize: 14 }}>{log.trainingTypeName}</span>
                </List.Item>
              );
            })}
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
        <Button block color="primary" onClick={() => navigate('/aviation/training/new')}>
          Log Training
        </Button>
      </div>
    </>
  );
};

export default Training;
