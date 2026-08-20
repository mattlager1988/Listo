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
  Tag,
  Button,
  Popup,
  Form,
  Selector,
  DatePicker,
  TextArea,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';

interface PeriodLogRecord {
  sysId: number;
  periodLogSysId: number;
  entryTypeSysId: number;
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

interface PeriodLogEntryType {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

const PeriodDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<PeriodEntry | null>(null);
  const [entryTypes, setEntryTypes] = useState<PeriodLogEntryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Log-record editor
  const [recordPopupVisible, setRecordPopupVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PeriodLogRecord | null>(null);
  const [recordType, setRecordType] = useState<number | null>(null);
  const [recordDate, setRecordDate] = useState<Date>(new Date());
  const [recordDatePickerVisible, setRecordDatePickerVisible] = useState(false);
  const [recordNotes, setRecordNotes] = useState<string>('');
  const [savingRecord, setSavingRecord] = useState(false);

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

  const fetchEntryTypes = useCallback(async () => {
    try {
      const response = await api.get('/lizzylog/entrytypes');
      setEntryTypes(response.data);
    } catch {
      // Types are supplemental
    }
  }, []);

  useEffect(() => {
    fetchEntry();
    fetchEntryTypes();
  }, [fetchEntry, fetchEntryTypes]);

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

  const openAddRecord = () => {
    setEditingRecord(null);
    setRecordType(null);
    setRecordDate(entry ? parseDate(entry.startDate).toDate() : new Date());
    setRecordNotes('');
    setRecordPopupVisible(true);
  };

  const openEditRecord = (record: PeriodLogRecord) => {
    setEditingRecord(record);
    setRecordType(record.entryTypeSysId);
    setRecordDate(parseDate(record.entryDate).toDate());
    setRecordNotes(record.notes || '');
    setRecordPopupVisible(true);
  };

  const handleSaveRecord = async () => {
    if (!entry) return;
    if (!recordType) {
      Toast.show({ content: 'Please select a type' });
      return;
    }
    setSavingRecord(true);
    try {
      const payload = {
        entryTypeSysId: recordType,
        entryDate: dayjs(recordDate).format('YYYY-MM-DD'),
        notes: recordNotes.trim() || null,
      };
      if (editingRecord) {
        await api.put(`/lizzylog/entries/${editingRecord.sysId}`, payload);
        Toast.show({ icon: 'success', content: 'Log record updated' });
      } else {
        await api.post('/lizzylog/entries', { periodLogSysId: entry.sysId, ...payload });
        Toast.show({ icon: 'success', content: 'Log record added' });
      }
      setRecordPopupVisible(false);
      await fetchEntry();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      Toast.show({ icon: 'fail', content: e.response?.data?.message || 'Failed to save log record' });
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (record: PeriodLogRecord) => {
    const confirmed = await Dialog.confirm({ content: 'Delete this log record?' });
    if (!confirmed) return;
    try {
      await api.delete(`/lizzylog/entries/${record.sysId}`);
      Toast.show({ icon: 'success', content: 'Log record deleted' });
      await fetchEntry();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete log record' });
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

  const typeOptions = entryTypes
    // Keep the currently-selected type visible even if it was later discontinued.
    .filter(t => !t.isDeleted || t.sysId === editingRecord?.entryTypeSysId)
    .map(t => ({ label: t.name, value: t.sysId }));

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
              {entry.isStartDateEstimated && (
                <Tag color="warning" style={{ marginLeft: 8, verticalAlign: 'middle' }}>estimated</Tag>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Period start date</span>
          </div>

          <List style={{ '--border-top': 'none' }}>
            <List.Item extra={entry.preWeekStartDate ? parseDate(entry.preWeekStartDate).format('MMM D, YYYY') : '—'}>
              Pre-Week Start
            </List.Item>
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

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 14, color: '#666' }}>Log Records</div>
              <Button size="mini" color="primary" fill="outline" onClick={openAddRecord}>
                Add
              </Button>
            </div>
            {entry.entries && entry.entries.length > 0 ? (
              <List>
                {entry.entries.map(record => (
                  <List.Item
                    key={record.sysId}
                    onClick={() => openEditRecord(record)}
                    description={record.notes || undefined}
                    extra={
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecord(record);
                        }}
                        style={{ fontSize: 13, color: '#ff3141' }}
                      >
                        Delete
                      </span>
                    }
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{record.entryTypeName}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c', marginLeft: 8 }}>
                      {parseDate(record.entryDate).format('MMM D, YYYY')}
                    </span>
                  </List.Item>
                ))}
              </List>
            ) : (
              <div style={{
                padding: 12,
                fontSize: 13,
                color: '#8c8c8c',
                background: '#fff',
                border: '1px solid #e8e8e8',
                borderRadius: 8,
              }}>
                No log records yet
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />

      {/* Log-record editor */}
      <Popup
        visible={recordPopupVisible}
        onMaskClick={() => setRecordPopupVisible(false)}
        onClose={() => setRecordPopupVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          {editingRecord ? 'Edit Log Record' : 'Add Log Record'}
        </div>

        <Form layout="vertical" style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
          <Form.Item label="Type">
            {typeOptions.length > 0 ? (
              <Selector
                options={typeOptions}
                value={recordType != null ? [recordType] : []}
                onChange={(val) => { if (val.length) setRecordType(val[0]); }}
              />
            ) : (
              <span style={{ fontSize: 13, color: '#8c8c8c' }}>
                No types yet — add them in Admin → List Manager (web).
              </span>
            )}
          </Form.Item>

          <Form.Item label="Date" onClick={() => setRecordDatePickerVisible(true)}>
            <span style={{ fontSize: 15 }}>{dayjs(recordDate).format('MMM D, YYYY')}</span>
            <DatePicker
              visible={recordDatePickerVisible}
              onClose={() => setRecordDatePickerVisible(false)}
              onConfirm={(val) => { setRecordDate(val); setRecordDatePickerVisible(false); }}
              value={recordDate}
            />
          </Form.Item>

          <Form.Item label="Notes">
            <TextArea placeholder="Optional notes" rows={3} value={recordNotes} onChange={setRecordNotes} />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button block color="primary" loading={savingRecord} onClick={handleSaveRecord} style={{ borderRadius: 8 }}>
            {editingRecord ? 'Update' : 'Add'}
          </Button>
          <Button block onClick={() => setRecordPopupVisible(false)} style={{ borderRadius: 8 }}>
            Cancel
          </Button>
        </div>
      </Popup>
    </>
  );
};

export default PeriodDetail;
