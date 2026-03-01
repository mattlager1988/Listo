import React from 'react';
import { Typography, Card, Row, Col, Empty } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import PageHeader from '../components/PageHeader';

const { Text, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  return (
    <div>
      <PageHeader title="Dashboard" />
      <Paragraph type="secondary" style={{ marginTop: -16, marginBottom: 24 }}>
        Welcome to Listo! Your personal life management platform.
      </Paragraph>

      <Card style={{ marginTop: 24 }}>
        <Empty
          image={<AppstoreOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={
            <div>
              <Text strong>No modules installed yet</Text>
              <br />
              <Text type="secondary">
                Modules will appear here as they are added to Listo.
              </Text>
            </div>
          }
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Coming Soon" size="small">
            <Text type="secondary">Financial Management</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Coming Soon" size="small">
            <Text type="secondary">Task Management</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Coming Soon" size="small">
            <Text type="secondary">Calendar</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
