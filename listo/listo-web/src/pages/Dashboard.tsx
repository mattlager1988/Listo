import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  return (
    <div>
      <Title level={2}>Dashboard</Title>
      <Paragraph type="secondary">
        Welcome to Listo! Your personal life management platform.
      </Paragraph>
    </div>
  );
};

export default Dashboard;
