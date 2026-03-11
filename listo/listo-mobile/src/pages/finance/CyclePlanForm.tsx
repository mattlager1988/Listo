import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Picker,
  DatePicker,
  TextArea,
  Toast,
  Skeleton,
} from 'antd-mobile';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { CyclePlan, CycleGoal } from '@shared/types';

const STATUS_COLUMNS = [
  [
    { label: 'Pending', value: 'Pending' },
    { label: 'Active', value: 'Active' },
    { label: 'Completed', value: 'Completed' },
  ],
];

const CyclePlanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cycleGoals, setCycleGoals] = useState<CycleGoal[]>([]);

  const [goalPickerVisible, setGoalPickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const response = await api.get('/finance/cyclegoals');
      setCycleGoals(response.data.filter((g: CycleGoal) => !g.isDeleted));
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load goals' });
    }
  }, []);

  const fetchPlan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/finance/cycleplans/${id}`);
      const p = response.data as CyclePlan;
      form.setFieldsValue({
        cycleGoalSysId: p.cycleGoalSysId,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        amountIn: p.amountIn?.toString() || '0',
        amountOut: p.amountOut?.toString() || '0',
        notes: p.notes,
      });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load plan' });
      navigate('/cycle');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  const fetchDefaults = useCallback(async () => {
    if (isEditing) return;
    try {
      const response = await api.get('/finance/cycleplans');
      const plans = response.data as CyclePlan[];
      const sorted = [...plans]
        .filter(p => p.endDate)
        .sort((a, b) => dayjs(b.endDate).unix() - dayjs(a.endDate).unix());
      const prior = sorted[0];
      if (prior) {
        const start = dayjs(prior.endDate).add(1, 'day');
        const end = start.add(13, 'day');
        form.setFieldsValue({
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD'),
        });
      }
    } catch {
      // ignore
    }
  }, [isEditing, form]);

  useEffect(() => {
    fetchGoals();
    if (isEditing) {
      fetchPlan();
    } else {
      form.setFieldsValue({
        status: 'Pending',
        amountIn: '0',
        amountOut: '0',
      });
      fetchDefaults();
    }
  }, [fetchGoals, fetchPlan, fetchDefaults, isEditing, form]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    const cycleGoalSysId = form.getFieldValue('cycleGoalSysId');
    const status = form.getFieldValue('status');
    const startDate = form.getFieldValue('startDate');
    const endDate = form.getFieldValue('endDate');

    if (!cycleGoalSysId) {
      Toast.show({ content: 'Please select a cycle goal' });
      return;
    }
    if (!startDate || !endDate) {
      Toast.show({ content: 'Please select start and end dates' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        cycleGoalSysId,
        status: status || 'Pending',
        startDate,
        endDate,
        amountIn: parseFloat(values.amountIn) || 0,
        amountOut: parseFloat(values.amountOut) || 0,
        notes: values.notes || null,
      };

      if (isEditing) {
        await api.put(`/finance/cycleplans/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Plan updated' });
        navigate(`/cycle/${id}`);
      } else {
        const response = await api.post('/finance/cycleplans', payload);
        Toast.show({ icon: 'success', content: 'Plan created' });
        navigate(`/cycle/${response.data.sysId}`);
      }
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save plan' });
    } finally {
      setSubmitting(false);
    }
  };

  const goalColumns = [cycleGoals.map(g => ({ label: g.name, value: g.sysId }))];
  const selectedGoalName = cycleGoals.find(g => g.sysId === form.getFieldValue('cycleGoalSysId'))?.name;
  const selectedStatus = form.getFieldValue('status');

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/cycle')}>
          {isEditing ? 'Edit Plan' : 'New Plan'}
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={4} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate(isEditing ? `/cycle/${id}` : '/cycle')}
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
        {isEditing ? 'Edit Plan' : 'New Plan'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Plan Details</Form.Header>

        <Form.Item
          label="Cycle Goal"
          onClick={() => setGoalPickerVisible(true)}
        >
          <Picker
            columns={goalColumns}
            visible={goalPickerVisible}
            onClose={() => setGoalPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('cycleGoalSysId', val[0]);
              setGoalPickerVisible(false);
            }}
            value={form.getFieldValue('cycleGoalSysId') ? [form.getFieldValue('cycleGoalSysId')] : undefined}
          >
            {() => (
              <span style={{ color: selectedGoalName ? undefined : '#ccc' }}>
                {selectedGoalName || 'Select goal'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item
          label="Status"
          onClick={() => setStatusPickerVisible(true)}
        >
          <Picker
            columns={STATUS_COLUMNS}
            visible={statusPickerVisible}
            onClose={() => setStatusPickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('status', val[0]);
              setStatusPickerVisible(false);
            }}
            value={selectedStatus ? [selectedStatus] : ['Pending']}
          >
            {() => (
              <span>{selectedStatus || 'Pending'}</span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item
          label="Start Date"
          onClick={() => setStartDatePickerVisible(true)}
        >
          <DatePicker
            visible={startDatePickerVisible}
            onClose={() => setStartDatePickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('startDate', dayjs(val).format('YYYY-MM-DD'));
              setStartDatePickerVisible(false);
            }}
          >
            {() => {
              const startDate = form.getFieldValue('startDate');
              return (
                <span style={{ color: startDate ? undefined : '#ccc' }}>
                  {startDate ? dayjs(startDate).format('MMM D, YYYY') : 'Select date'}
                </span>
              );
            }}
          </DatePicker>
        </Form.Item>

        <Form.Item
          label="End Date"
          onClick={() => setEndDatePickerVisible(true)}
        >
          <DatePicker
            visible={endDatePickerVisible}
            onClose={() => setEndDatePickerVisible(false)}
            onConfirm={(val) => {
              form.setFieldValue('endDate', dayjs(val).format('YYYY-MM-DD'));
              setEndDatePickerVisible(false);
            }}
          >
            {() => {
              const endDate = form.getFieldValue('endDate');
              return (
                <span style={{ color: endDate ? undefined : '#ccc' }}>
                  {endDate ? dayjs(endDate).format('MMM D, YYYY') : 'Select date'}
                </span>
              );
            }}
          </DatePicker>
        </Form.Item>

        <Form.Header>Amounts</Form.Header>

        <Form.Item name="amountIn" label="Amount In">
          <Input type="number" inputMode="decimal" placeholder="0.00" />
        </Form.Item>

        <Form.Item name="amountOut" label="Amount Out">
          <Input type="number" inputMode="decimal" placeholder="0.00" />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea placeholder="Notes (optional)" rows={3} />
        </Form.Item>

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
              Create Plan
            </Button>
            <Button
              block
              size="large"
              onClick={() => navigate('/cycle')}
              style={{ borderRadius: 8 }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Form>
    </>
  );
};

export default CyclePlanForm;
