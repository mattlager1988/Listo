import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const Settings: React.FC = () => {
  return (
    <div>
      <Title level={2}>Settings</Title>
      <p>Settings and MFA setup coming in Phase 7.</p>
    </div>
  );
};

export default Settings;
