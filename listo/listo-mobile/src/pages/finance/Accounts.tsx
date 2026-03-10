import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  List,
  SwipeAction,
  PullToRefresh,
  SearchBar,
  FloatingBubble,
  Tag,
  Skeleton,
  ErrorBlock,
  Toast,
  Collapse,
} from 'antd-mobile';
import { AddOutline, UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { Account, Payment } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';

const FLAG_ORDER = ['Standard', 'Static', 'Alert', 'OnHold'];
const FLAG_DISPLAY_NAMES: Record<string, string> = {
  Standard: 'Standard',
  Static: 'Static',
  Alert: 'Alert',
  OnHold: 'On Hold',
};

const flagColors: Record<string, string> = {
  Standard: '#d9d9d9',
  Alert: '#ff4d4f',
  Static: '#1677ff',
  OnHold: '#faad14',
};

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnHold, setShowOnHold] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [accountsRes, pendingRes] = await Promise.all([
        api.get('/finance/accounts'),
        api.get('/finance/payments/pending'),
      ]);
      setAccounts(accountsRes.data);
      setPendingPayments(pendingRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLaunch = (account: Account) => {
    if (account.password) {
      navigator.clipboard.writeText(account.password).then(
        () => Toast.show({ content: 'Password copied' }),
        () => {}
      );
    }
    if (account.webAddress) {
      window.open(account.webAddress, '_blank', 'noopener,noreferrer');
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(a => {
    if (!showOnHold && a.accountFlag === 'OnHold') return false;
    if (searchTerm) {
      return a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.accountTypeName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // Group by flag
  const groups = FLAG_ORDER
    .filter(flag => flag !== 'OnHold' || showOnHold)
    .map(flag => {
      const flagAccounts = filteredAccounts.filter(a => a.accountFlag === flag);
      const total = flagAccounts.reduce((sum, a) => sum + a.amountDue, 0);
      return { flag, accounts: flagAccounts, total };
    })
    .filter(g => g.accounts.length > 0);

  // Pending payment count by account
  const pendingByAccount = new Map<number, number>();
  pendingPayments.forEach(p => {
    pendingByAccount.set(p.accountSysId, (pendingByAccount.get(p.accountSysId) || 0) + 1);
  });

  if (loading) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Bills</NavBar>
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
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Bills</NavBar>
        <ErrorBlock status="default" title="Unable to load accounts" description="Pull down to retry" />
      </>
    );
  }

  const getSwipeActions = (account: Account) => {
    const actions: { key: string; text: string; color: 'primary' | 'warning' | 'danger' | 'default' | 'light'; onClick: () => void }[] = [];

    actions.push({
      key: 'pay',
      text: 'Pay',
      color: 'primary',
      onClick: () => navigate(`/bills/${account.sysId}/pay`),
    });

    actions.push({
      key: 'edit',
      text: 'Edit',
      color: 'warning',
      onClick: () => navigate(`/bills/${account.sysId}/edit`),
    });

    if (account.webAddress) {
      actions.push({
        key: 'launch',
        text: 'Go',
        color: 'default',
        onClick: () => handleLaunch(account),
      });
    }

    return actions;
  };

  return (
    <PullToRefresh onRefresh={fetchData}>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
        right={
          <span
            onClick={() => setShowOnHold(!showOnHold)}
            style={{
              fontSize: 12,
              color: showOnHold ? '#1890ff' : '#8c8c8c',
              cursor: 'pointer',
            }}
          >
            {showOnHold ? 'Hide Held' : 'Show Held'}
          </span>
        }
      >
        Bills
      </NavBar>

      <div style={{ padding: '0 12px' }}>
        <SearchBar
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={setSearchTerm}
          style={{ marginBottom: 8 }}
        />
      </div>

      {/* Pending Payments Banner */}
      {pendingPayments.length > 0 && (
        <div style={{
          margin: '0 12px 8px',
          background: '#fffbe6',
          border: '1px solid #ffe58f',
          borderRadius: 8,
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {pendingPayments.length} pending payment{pendingPayments.length > 1 ? 's' : ''}
          </span>
          <Tag color="warning" style={{ fontSize: 13, fontWeight: 600 }}>
            ${pendingPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </Tag>
        </div>
      )}

      {groups.length === 0 ? (
        <ErrorBlock
          status="empty"
          title="No accounts found"
          description={searchTerm ? 'Try a different search term' : 'Add your first account'}
        />
      ) : (
        <Collapse defaultActiveKey={FLAG_ORDER}>
          {groups.map(group => (
            <Collapse.Panel
              key={group.flag}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: flagColors[group.flag],
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {FLAG_DISPLAY_NAMES[group.flag]} ({group.accounts.length})
                  </span>
                  <span style={{ color: '#1677ff', fontSize: 13, marginLeft: 'auto' }}>
                    ${group.total.toFixed(2)}
                  </span>
                </div>
              }
            >
              <List style={{ '--border-top': 'none' }}>
                {group.accounts.map(account => (
                  <SwipeAction
                    key={account.sysId}
                    rightActions={getSwipeActions(account)}
                  >
                    <List.Item
                      onClick={() => navigate(`/bills/${account.sysId}`)}
                      arrow={false}
                      description={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span>{account.accountTypeName}</span>
                          {account.dueDate && (
                            <span> · Due {dayjs(account.dueDate).format('MMM D')}</span>
                          )}
                          {account.autoPay && (
                            <Tag color="success" style={{ fontSize: 10, padding: '0 4px' }}>Auto</Tag>
                          )}
                          {(pendingByAccount.get(account.sysId) || 0) > 0 && (
                            <Tag color="warning" style={{ fontSize: 10, padding: '0 4px' }}>Pending</Tag>
                          )}
                        </div>
                      }
                      extra={
                        <span style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: account.amountDue > 0 ? '#ff4d4f' : '#52c41a',
                        }}>
                          ${account.amountDue.toFixed(2)}
                        </span>
                      }
                    >
                      {account.name}
                    </List.Item>
                  </SwipeAction>
                ))}
              </List>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}

      <FloatingBubble
        style={{
          '--initial-position-bottom': '76px',
          '--initial-position-right': '16px',
          '--edge-distance': '16px',
          '--size': '48px',
          '--background': '#1890ff',
        }}
        onClick={() => navigate('/bills/new')}
      >
        <AddOutline fontSize={24} color="#fff" />
      </FloatingBubble>
    </PullToRefresh>
  );
};

export default Accounts;
