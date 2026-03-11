import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  List,
  PullToRefresh,
  SearchBar,
  Tag,
  Skeleton,
  ErrorBlock,
  Collapse,
  Button,
  Popup,
  Input,
  Toast,
  Dialog,
  Picker,
} from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { Account, BankAccount } from '@shared/types';
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

const BANK_ACCOUNT_COLORS = [
  { label: 'Green', value: '#f6ffed', border: '#b7eb8f' },
  { label: 'Blue', value: '#e6f4ff', border: '#91caff' },
  { label: 'Purple', value: '#f9f0ff', border: '#d3adf7' },
  { label: 'Orange', value: '#fff7e6', border: '#ffd591' },
  { label: 'Cyan', value: '#e6fffb', border: '#87e8de' },
  { label: 'Pink', value: '#fff0f6', border: '#ffadd2' },
  { label: 'Yellow', value: '#fffbe6', border: '#ffe58f' },
  { label: 'Gray', value: '#f5f5f5', border: '#d9d9d9' },
];

interface LedgerTransaction {
  sysId: number;
  bankAccountSysId: number;
  bankAccountName: string;
  transactionType: string;
  amount: number;
  description: string | null;
  paymentSysId: number | null;
  paymentAccountName: string | null;
  createTimestamp: string;
}

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const { openMenu } = useMenu();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnHold, setShowOnHold] = useState(false);

  // Bank transaction popup state
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [bankTransactions, setBankTransactions] = useState<LedgerTransaction[]>([]);
  const [txnPopupVisible, setTxnPopupVisible] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnSubmitting, setTxnSubmitting] = useState(false);
  const [txnTypePickerVisible, setTxnTypePickerVisible] = useState(false);
  const [txnType, setTxnType] = useState<string>('Deposit');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDescription, setTxnDescription] = useState('');

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [accountsRes, bankRes] = await Promise.all([
        api.get('/finance/accounts'),
        api.get('/finance/bankaccounts').catch(() => ({ data: [] })),
      ]);
      setAccounts(accountsRes.data);
      setBankAccounts(bankRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenBankTransactions = async (ba: BankAccount) => {
    setSelectedBankAccount(ba);
    setTxnPopupVisible(true);
    setTxnLoading(true);
    setTxnType('Deposit');
    setTxnAmount('');
    setTxnDescription('');
    try {
      const res = await api.get(`/finance/bankaccounts/${ba.sysId}/transactions`);
      setBankTransactions(res.data);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load transactions' });
    } finally {
      setTxnLoading(false);
    }
  };

  const handlePostTransaction = async () => {
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) {
      Toast.show({ content: 'Enter a valid amount' });
      return;
    }
    setTxnSubmitting(true);
    try {
      await api.post(`/finance/bankaccounts/${selectedBankAccount!.sysId}/transactions`, {
        bankAccountSysId: selectedBankAccount!.sysId,
        transactionType: txnType,
        amount,
        description: txnDescription || null,
      });
      // Refresh transactions and bank account balance
      const [txnRes, baRes] = await Promise.all([
        api.get(`/finance/bankaccounts/${selectedBankAccount!.sysId}/transactions`),
        api.get(`/finance/bankaccounts/${selectedBankAccount!.sysId}`),
      ]);
      setBankTransactions(txnRes.data);
      setSelectedBankAccount(baRes.data);
      setBankAccounts(prev => prev.map(b => b.sysId === baRes.data.sysId ? baRes.data : b));
      setTxnAmount('');
      setTxnDescription('');
      Toast.show({ icon: 'success', content: 'Transaction posted' });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to post transaction' });
    } finally {
      setTxnSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (txnId: number) => {
    const confirmed = await Dialog.confirm({
      content: 'Delete this transaction? This will reverse the balance change.',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/finance/bankaccounts/${selectedBankAccount!.sysId}/transactions/${txnId}`);
      const [txnRes, baRes] = await Promise.all([
        api.get(`/finance/bankaccounts/${selectedBankAccount!.sysId}/transactions`),
        api.get(`/finance/bankaccounts/${selectedBankAccount!.sysId}`),
      ]);
      setBankTransactions(txnRes.data);
      setSelectedBankAccount(baRes.data);
      setBankAccounts(prev => prev.map(b => b.sysId === baRes.data.sysId ? baRes.data : b));
      Toast.show({ icon: 'success', content: 'Transaction deleted' });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete transaction' });
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

  if (loading) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Accounts</NavBar>
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
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Accounts</NavBar>
        <ErrorBlock status="default" title="Unable to load accounts" description="Pull down to retry" />
      </>
    );
  }

  const txnTypeColumns = [[
    { label: 'Deposit', value: 'Deposit' },
    { label: 'Withdrawal', value: 'Withdrawal' },
  ]];

  return (
    <>
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
          Accounts
        </NavBar>

        {/* Bank Accounts Section */}
        {bankAccounts.length > 0 && (
          <div style={{ padding: '0 12px 8px', display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {bankAccounts.map(ba => {
              const colorConfig = BANK_ACCOUNT_COLORS.find(c => c.value === ba.color) || BANK_ACCOUNT_COLORS[0];
              return (
                <div
                  key={ba.sysId}
                  onClick={() => handleOpenBankTransactions(ba)}
                  style={{
                    background: colorConfig.value,
                    border: `1px solid ${colorConfig.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    minWidth: 150,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{ba.name}</span>
                    <Tag
                      color={ba.accountType === 'Checking' ? 'primary' : ba.accountType === 'HSA' ? 'purple' : 'success'}
                      style={{ fontSize: 10, padding: '0 4px', marginLeft: 'auto', '--border-radius': '4px' } as React.CSSProperties}
                    >
                      {ba.accountType}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: ba.balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                    ${ba.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {ba.accountNumber && (
                    <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                      ****{ba.accountNumber.slice(-4)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: '0 12px' }}>
          <SearchBar
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={setSearchTerm}
            style={{ marginBottom: 8 }}
          />
        </div>

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
                    <List.Item
                      key={account.sysId}
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
                  ))}
                </List>
              </Collapse.Panel>
            ))}
          </Collapse>
        )}

        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />

        <div style={{
          position: 'fixed',
          bottom: 'calc(50px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          padding: '8px 12px',
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
          zIndex: 99,
        }}>
          <Button block color="primary" onClick={() => navigate('/bills/new')}>
            Add Account
          </Button>
        </div>
      </PullToRefresh>

      {/* Bank Transactions Popup */}
      <Popup
        visible={txnPopupVisible}
        onMaskClick={() => {
          setTxnPopupVisible(false);
          setSelectedBankAccount(null);
          setBankTransactions([]);
        }}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, height: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {selectedBankAccount && (
          <>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedBankAccount.name}</span>
                <span
                  onClick={() => {
                    setTxnPopupVisible(false);
                    setSelectedBankAccount(null);
                    setBankTransactions([]);
                  }}
                  style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }}
                >
                  Close
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: selectedBankAccount.balance >= 0 ? '#52c41a' : '#ff4d4f',
                }}>
                  ${selectedBankAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Tag
                  color={selectedBankAccount.accountType === 'Checking' ? 'primary' : selectedBankAccount.accountType === 'HSA' ? 'purple' : 'success'}
                >
                  {selectedBankAccount.accountType}
                </Tag>
              </div>
            </div>

            {/* Post Transaction Form */}
            <div style={{ padding: 12, background: '#fafafa', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Post Transaction</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div
                  onClick={() => setTxnTypePickerVisible(true)}
                  style={{
                    flex: '0 0 auto',
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #e8e8e8',
                    background: '#fff',
                    fontSize: 13,
                    color: txnType === 'Deposit' ? '#52c41a' : '#ff4d4f',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {txnType === 'Deposit' ? '+ Deposit' : '- Withdrawal'}
                </div>
                <Picker
                  columns={txnTypeColumns}
                  visible={txnTypePickerVisible}
                  onClose={() => setTxnTypePickerVisible(false)}
                  onConfirm={val => {
                    setTxnType(val[0] as string);
                    setTxnTypePickerVisible(false);
                  }}
                  value={[txnType]}
                />
                <Input
                  placeholder="0.00"
                  type="number"
                  value={txnAmount}
                  onChange={setTxnAmount}
                  style={{
                    '--font-size': '14px',
                    flex: 1,
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    padding: '0 8px',
                    background: '#fff',
                  } as React.CSSProperties}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  placeholder="Description (optional)"
                  value={txnDescription}
                  onChange={setTxnDescription}
                  style={{
                    '--font-size': '13px',
                    flex: 1,
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    padding: '0 8px',
                    background: '#fff',
                  } as React.CSSProperties}
                />
                <Button
                  color="primary"
                  size="small"
                  loading={txnSubmitting}
                  onClick={handlePostTransaction}
                  style={{ flexShrink: 0 }}
                >
                  Post
                </Button>
              </div>
            </div>

            {/* Transaction History */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px 8px', fontWeight: 600, fontSize: 13, color: '#8c8c8c' }}>
                Transactions ({bankTransactions.length})
              </div>
              {txnLoading ? (
                <div style={{ padding: 16 }}>
                  <Skeleton.Paragraph lineCount={4} animated />
                </div>
              ) : bankTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#8c8c8c', fontSize: 13 }}>
                  No transactions recorded
                </div>
              ) : (
                bankTransactions.map(tx => (
                  <div
                    key={tx.sysId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: '1px solid #f5f5f5',
                      gap: 10,
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: tx.transactionType === 'Deposit' ? '#f6ffed' : '#fff1f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      flexShrink: 0,
                    }}>
                      {tx.transactionType === 'Deposit' ? (
                        <span style={{ color: '#52c41a' }}>+</span>
                      ) : (
                        <span style={{ color: '#ff4d4f' }}>-</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: tx.transactionType === 'Deposit' ? '#52c41a' : '#ff4d4f',
                        }}>
                          {tx.transactionType === 'Deposit' ? '+' : '-'}${tx.amount.toFixed(2)}
                        </span>
                        {tx.paymentSysId && (
                          <Tag color="primary" style={{ fontSize: 10, padding: '0 4px' }}>Payment</Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                        {dayjs(tx.createTimestamp).format('MM/DD/YYYY h:mm A')}
                        {tx.description && ` · ${tx.description}`}
                      </div>
                    </div>
                    {!tx.paymentSysId && (
                      <span
                        onClick={() => handleDeleteTransaction(tx.sysId)}
                        style={{ color: '#ff4d4f', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                      >
                        Delete
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Popup>
    </>
  );
};

export default Accounts;
