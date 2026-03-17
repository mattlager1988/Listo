import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Picker,
  Toast,
  Skeleton,
  DatePicker,
} from 'antd-mobile';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import RichTextEditor from '../../components/RichTextEditor';

interface TrainingType {
  sysId: number;
  name: string;
}

interface Aircraft {
  sysId: number;
  planeId: string;
  name: string;
}

const TrainingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [aircraftPickerVisible, setAircraftPickerVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedAircraftId, setSelectedAircraftId] = useState<number | null>(null);
  const [description, setDescription] = useState('');

  const fetchLookups = useCallback(async () => {
    try {
      const [typesRes, aircraftRes] = await Promise.all([
        api.get('/aviation/trainingtypes'),
        api.get('/aviation/aircraft'),
      ]);
      setTrainingTypes(typesRes.data.filter((t: TrainingType & { isDeleted?: boolean }) => !t.isDeleted));
      setAircraft(aircraftRes.data.filter((a: Aircraft & { isDeleted?: boolean }) => !a.isDeleted));
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load options' });
    }
  }, []);

  const fetchLog = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/aviation/traininglogs/${id}`);
      const log = response.data;
      form.setFieldsValue({
        hoursFlown: log.hoursFlown.toString(),
      });
      setDescription(log.description || '');
      setSelectedDate(new Date(log.date));
      setSelectedTypeId(log.trainingTypeSysId);
      setSelectedAircraftId(log.aircraftSysId);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load training log' });
      navigate('/aviation/training');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    fetchLookups();
    if (isEditing) {
      fetchLog();
    } else {
      form.setFieldsValue({ hoursFlown: '0' });
    }
  }, [fetchLookups, fetchLog, isEditing, form]);

  const getTypeName = (typeId: number | null) => {
    if (!typeId) return '';
    return trainingTypes.find(t => t.sysId === typeId)?.name || '';
  };

  const getAircraftLabel = (aircraftId: number | null) => {
    if (!aircraftId) return 'None';
    const a = aircraft.find(ac => ac.sysId === aircraftId);
    return a ? `${a.planeId} - ${a.name}` : '';
  };

  const typeColumns = [
    trainingTypes.map(t => ({ label: t.name, value: t.sysId })),
  ];

  const aircraftColumns = [
    [
      { label: 'None', value: 0 },
      ...aircraft.map(a => ({ label: `${a.planeId} - ${a.name}`, value: a.sysId })),
    ],
  ];

  const handleSubmit = async () => {
    const values = form.getFieldsValue();

    if (!selectedTypeId) {
      Toast.show({ content: 'Please select a training type' });
      return;
    }

    const hours = parseFloat(values.hoursFlown);
    if (isNaN(hours) || hours < 0) {
      Toast.show({ content: 'Please enter valid hours' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: dayjs(selectedDate).format('YYYY-MM-DD'),
        description: description || '',
        hoursFlown: hours,
        trainingTypeSysId: selectedTypeId,
        aircraftSysId: selectedAircraftId || null,
      };

      if (isEditing) {
        await api.put(`/aviation/traininglogs/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Training log updated' });
        navigate(`/aviation/training/${id}`);
      } else {
        await api.post('/aviation/traininglogs', payload);
        Toast.show({ icon: 'success', content: 'Training log created' });
        navigate('/aviation/training');
      }
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save training log' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate(isEditing ? `/aviation/training/${id}` : '/aviation/training')}>
          {isEditing ? 'Edit Training Log' : 'Log Training'}
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
        onBack={() => navigate(isEditing ? `/aviation/training/${id}` : '/aviation/training')}
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
        {isEditing ? 'Edit Training Log' : 'Log Training'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Training Details</Form.Header>

        <Form.Item
          label="Date"
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
          label="Training Type"
          onClick={() => setTypePickerVisible(true)}
        >
          <Picker
            columns={typeColumns}
            visible={typePickerVisible}
            onClose={() => setTypePickerVisible(false)}
            onConfirm={(val) => {
              setSelectedTypeId(val[0] as number);
              setTypePickerVisible(false);
            }}
            value={selectedTypeId ? [selectedTypeId] : []}
          >
            {() => (
              <span style={{ color: selectedTypeId ? undefined : '#ccc' }}>
                {selectedTypeId ? getTypeName(selectedTypeId) : 'Select training type'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="hoursFlown" label="Hours" rules={[{ required: true }]}>
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            style={{ fontSize: 24, fontWeight: 600 }}
          />
        </Form.Item>

        <Form.Item
          label="Aircraft"
          onClick={() => setAircraftPickerVisible(true)}
        >
          <Picker
            columns={aircraftColumns}
            visible={aircraftPickerVisible}
            onClose={() => setAircraftPickerVisible(false)}
            onConfirm={(val) => {
              const value = val[0] as number;
              setSelectedAircraftId(value === 0 ? null : value);
              setAircraftPickerVisible(false);
            }}
            value={selectedAircraftId ? [selectedAircraftId] : [0]}
          >
            {() => (
              <span style={{ color: selectedAircraftId ? undefined : '#8c8c8c' }}>
                {getAircraftLabel(selectedAircraftId)}
              </span>
            )}
          </Picker>
        </Form.Item>

        <div style={{ padding: '0 12px' }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Description</div>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Describe your training activity (optional)"
          />
        </div>

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
              onClick={() => navigate('/aviation/training')}
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

export default TrainingForm;
