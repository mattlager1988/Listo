import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Toast,
  Skeleton,
  ErrorBlock,
  PullToRefresh,
  ActionSheet,
  Dialog,
  List,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';

interface PeriodEntry {
  sysId: number;
  startDate: string;
  painSeverity: number;
  mood: number;
  notes: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

const PeriodDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<PeriodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const fetchEntry = useCallback(async () => {
    if (!id) return;
    setError(false);
    try {
      const response = await api.get(`/lizzylog/periods/${id}`);
      setEntry(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const handleDelete = async () => {
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: 'Delete this entry? This cannot be undone.',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/lizzylog/periods/${id}`);
      Toast.show({ icon: 'success', content: 'Entry deleted' });
      navigate('/lizzylog');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete entry' });
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/lizzylog')}>Entry</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !entry) {
    return (
      <>
        <NavBar onBack={() => navigate('/lizzylog')}>Entry</NavBar>
        <ErrorBlock status="default" title="Entry not found" />
      </>
    );
  }

  const actionSheetActions: Action[] = [
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/lizzylog/${entry.sysId}/edit`);
      },
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <PullToRefresh onRefresh={fetchEntry}>
        <NavBar
          onBack={() => navigate('/lizzylog')}
          right={
            <span
              onClick={() => setActionSheetVisible(true)}
              style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
            >
              More
            </span>
          }
        >
          Entry
        </NavBar>

        <div style={{ padding: 12, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              {parseDate(entry.startDate).format('MMM D, YYYY')}
            </div>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Period start date</span>
          </div>

          <List style={{ '--border-top': 'none' }}>
            <List.Item extra={String(entry.painSeverity)}>Pain Severity</List.Item>
            <List.Item extra={String(entry.mood)}>Mood</List.Item>
          </List>

          {entry.notes && (
            <div>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Notes</div>
              <div style={{
                padding: 12,
                fontSize: 14,
                color: '#333',
                lineHeight: 1.6,
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
                whiteSpace: 'pre-wrap',
              }}>
                {entry.notes}
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>

      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />
    </>
  );
};

export default PeriodDetail;
