import React, { useState, useEffect } from 'react';
import {
  Collapse,
  Form,
  Input,
  InputNumber,
  Button,
  message,
  Spin,
  Space,
  Typography,
  Alert,
} from 'antd';
import { SaveOutlined, LockOutlined } from '@ant-design/icons';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

const { Text } = Typography;

interface Setting {
  sysId: number;
  key: string;
  value: string | null;
  category: string;
  displayName: string;
  description: string | null;
  valueType: string;
  isSensitive: boolean;
  sortOrder: number;
}

interface SettingCategory {
  category: string;
  settings: Setting[];
}

const ListoSettings: React.FC = () => {
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      setCategories(response.data);

      // Initialize form values
      const values: Record<string, string | number | null> = {};
      response.data.forEach((category: SettingCategory) => {
        category.settings.forEach((setting: Setting) => {
          values[setting.key] = setting.valueType === 'int'
            ? (setting.value ? parseInt(setting.value, 10) : null)
            : setting.value;
        });
      });
      form.setFieldsValue(values);
      setChangedKeys(new Set());
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string) => {
    setChangedKeys(prev => new Set(prev).add(key));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();

      // Only send changed values, and skip masked sensitive values
      const settings: Record<string, string | null> = {};
      changedKeys.forEach(key => {
        const value = values[key];
        // Skip if it's the masked placeholder
        if (value === '********') return;
        settings[key] = value?.toString() ?? null;
      });

      if (Object.keys(settings).length === 0) {
        message.info('No changes to save');
        setSaving(false);
        return;
      }

      await api.post('/admin/settings/bulk', { settings });
      message.success('Settings saved successfully');
      setChangedKeys(new Set());
      // Refresh to get updated masked values
      fetchSettings();
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderSettingField = (setting: Setting) => {
    const commonProps = {
      onChange: () => handleFieldChange(setting.key),
    };

    if (setting.isSensitive) {
      return (
        <Input.Password
          {...commonProps}
          placeholder="Enter value to change"
          prefix={<LockOutlined />}
        />
      );
    }

    switch (setting.valueType) {
      case 'int':
        return (
          <InputNumber
            {...commonProps}
            style={{ width: '100%' }}
            min={0}
          />
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        actions={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={changedKeys.size === 0}
          >
            Save Changes
          </Button>
        }
      />

      <Alert
        message="Application Settings"
        description="These settings are stored in the database and can be changed without redeploying the application. Sensitive values like API keys are encrypted."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form form={form} layout="vertical">
        <Collapse
          defaultActiveKey={categories.map(c => c.category)}
          items={categories.map(category => ({
            key: category.category,
            label: category.category,
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {category.settings.map(setting => (
                  <Form.Item
                    key={setting.key}
                    name={setting.key}
                    label={
                      <Space>
                        <span>{setting.displayName}</span>
                        {setting.isSensitive && <LockOutlined style={{ color: '#999' }} />}
                      </Space>
                    }
                    help={<Text type="secondary">{setting.description}</Text>}
                  >
                    {renderSettingField(setting)}
                  </Form.Item>
                ))}
              </Space>
            ),
          }))}
        />
      </Form>
    </div>
  );
};

export default ListoSettings;
