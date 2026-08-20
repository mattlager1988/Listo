import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  TextArea,
  Button,
  Switch,
  Toast,
  Skeleton,
  DatePicker,
} from 'antd-mobile';
import dayjs from 'dayjs';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';

const PeriodForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [preWeekPickerVisible, setPreWeekPickerVisible] = useState(false);
  const [preWeekDate, setPreWeekDate] = useState<Date | null>(null);
  const [isEstimated, setIsEstimated] = useState<boolean>(true);

  const fetchEntry = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/lizzylog/periods/${id}`);
      const entry = response.data;
      setSelectedDate(parseDate(entry.startDate).toDate());
      setPreWeekDate(entry.preWeekStartDate ? parseDate(entry.preWeekStartDate).toDate() : null);
      setIsEstimated(!!entry.isStartDateEstimated);
      form.setFieldsValue({ notes: entry.notes || '' });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load entry' });
      navigate('/lizzylog');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    if (isEditing) {
      fetchEntry();
    }
  }, [fetchEntry, isEditing]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();

    setSubmitting(true);
    try {
      const payload = {
        startDate: dayjs(selectedDate).format('YYYY-MM-DD'),
        preWeekStartDate: preWeekDate ? dayjs(preWeekDate).format('YYYY-MM-DD') : null,
        isStartDateEstimated: isEstimated,
        notes: values.notes?.trim() || null,
      };

      if (isEditing) {
        await api.put(`/lizzylog/periods/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Entry updated' });
        navigate(`/lizzylog/${id}`);
      } else {
        await api.post('/lizzylog/periods', payload);
        Toast.show({ icon: 'success', content: 'Entry created' });
        navigate('/lizzylog');
      }
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save entry' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(isEditing ? `/lizzylog/${id}` : '/lizzylog')}>
          {isEditing ? 'Edit Entry' : 'New Entry'}
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate(isEditing ? `/lizzylog/${id}` : '/lizzylog')}
        right={
          isEditing ? (
            <span
              onClick={handleSubmit}
              style={{
                fontSize: 14,
                color: submitting ? '#8c8c8c' : '#1890ff',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </span>
          ) : undefined
        }
      >
        {isEditing ? 'Edit Entry' : 'New Entry'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Period Details</Form.Header>

        <Form.Item
          label="Pre-Week Start"
          onClick={() => setPreWeekPickerVisible(true)}
          extra={
            preWeekDate ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setPreWeekDate(null);
                }}
                style={{ fontSize: 13, color: '#1890ff' }}
              >
                Clear
              </span>
            ) : undefined
          }
        >
          <span style={{ fontSize: 15, color: preWeekDate ? undefined : '#8c8c8c' }}>
            {preWeekDate ? dayjs(preWeekDate).format('MMM D, YYYY') : 'Not set (optional)'}
          </span>
          <DatePicker
            visible={preWeekPickerVisible}
            onClose={() => setPreWeekPickerVisible(false)}
            onConfirm={(val) => {
              setPreWeekDate(val);
              setPreWeekPickerVisible(false);
            }}
            value={preWeekDate ?? undefined}
          />
        </Form.Item>

        <Form.Item
          label="Period Start Date"
          onClick={() => setDatePickerVisible(true)}
        >
          <span style={{ fontSize: 15 }}>
            {dayjs(selectedDate).format('MMM D, YYYY')}
          </span>
          <DatePicker
            visible={datePickerVisible}
            onClose={() => setDatePickerVisible(false)}
            onConfirm={(val) => {
              setSelectedDate(val);
              setDatePickerVisible(false);
            }}
            value={selectedDate}
          />
        </Form.Item>

        <Form.Item
          label="Start date is estimated"
          extra={<Switch checked={isEstimated} onChange={setIsEstimated} />}
        />

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Optional notes" rows={4} />
        </Form.Item>
      </Form>

      {!isEditing && (
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            block
            color="primary"
            size="large"
            loading={submitting}
            onClick={handleSubmit}
            style={{ borderRadius: 8 }}
          >
            Create
          </Button>
          <Button
            block
            size="large"
            onClick={() => navigate('/lizzylog')}
            style={{ borderRadius: 8 }}
          >
            Cancel
          </Button>
        </div>
      )}
    </>
  );
};

export default PeriodForm;
