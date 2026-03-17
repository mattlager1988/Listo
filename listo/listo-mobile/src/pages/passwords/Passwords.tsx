import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  SearchBar,
  Skeleton,
  ErrorBlock,
  Button,
  ActionSheet,
  Dialog,
  Toast,
  Popup,
  Collapse,
  Tag,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import {
  UnorderedListOutline,
  EyeOutline,
  EyeInvisibleOutline,
} from 'antd-mobile-icons';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import { useMenu } from '../../contexts/MenuContext';

interface PasswordEntry {
  sysId: number;
  title: string;
  url: string | null;
  username: string | null;
  password: string | null;
  notes: string | null;
  categorySysId: number | null;
  categoryName: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

const copyToClipboard = (text: string, label: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    Toast.show({ content: `${label} copied` });
  } catch {
    Toast.show({ icon: 'fail', content: 'Copy failed' });
  }
  document.body.removeChild(textarea);
};

const Passwords: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PasswordEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<PasswordEntry | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get('/passwords/passwordentries');
      setEntries(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const grouped = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    const filtered = search
      ? entries.filter(e =>
          e.title.toLowerCase().includes(search) ||
          e.url?.toLowerCase().includes(search) ||
          e.username?.toLowerCase().includes(search) ||
          e.categoryName?.toLowerCase().includes(search)
        )
      : entries;

    const byCategory = new Map<string, PasswordEntry[]>();
    for (const entry of filtered) {
      const cat = entry.categoryName ?? 'Uncategorized';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(entry);
    }

    return [...byCategory.entries()].sort(([a], [b]) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
  }, [entries, searchText]);

  const handleDelete = async (entry: PasswordEntry) => {
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${entry.title}"? This cannot be undone.`,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/passwords/passwordentries/${entry.sysId}`);
      Toast.show({ icon: 'success', content: 'Password deleted' });
      fetchEntries();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete' });
    }
  };

  const handleLaunch = (entry: PasswordEntry) => {
    setActionSheetVisible(false);
    if (entry.password) {
      copyToClipboard(entry.password, 'Password');
    }
    const url = entry.url!.startsWith('http') ? entry.url! : `https://${entry.url!}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionSheetActions: Action[] = selectedEntry ? [
    {
      text: 'View Details',
      key: 'view',
      onClick: () => {
        setActionSheetVisible(false);
        setPasswordVisible(false);
        setViewingEntry(selectedEntry);
      },
    },
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        navigate(`/passwords/${selectedEntry.sysId}/edit`);
      },
    },
    ...(selectedEntry.username ? [{
      text: 'Copy Username',
      key: 'username',
      onClick: () => { setActionSheetVisible(false); copyToClipboard(selectedEntry.username!, 'Username'); },
    }] : []),
    ...(selectedEntry.password ? [{
      text: 'Copy Password',
      key: 'password',
      onClick: () => { setActionSheetVisible(false); copyToClipboard(selectedEntry.password!, 'Password'); },
    }] : []),
    ...(selectedEntry.url ? [{
      text: 'Launch & Copy Password',
      key: 'launch',
      onClick: () => handleLaunch(selectedEntry),
    }] : []),
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: () => handleDelete(selectedEntry),
    },
  ] : [];

  const navBar = (
    <NavBar
      back={null}
      left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
      style={{ '--height': '48px' } as React.CSSProperties}
    >
      Passwords
    </NavBar>
  );

  if (loading) {
    return (
      <>
        {navBar}
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {navBar}
        <ErrorBlock status="default" title="Unable to load passwords" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      {navBar}
      <div style={{ padding: '8px 12px 0' }}>
        <SearchBar
          placeholder="Search passwords..."
          value={searchText}
          onChange={setSearchText}
          style={{ '--background': '#f5f5f5' } as React.CSSProperties}
        />
      </div>
      <PullToRefresh onRefresh={fetchEntries}>
        {entries.length === 0 ? (
          <ErrorBlock status="empty" title="No passwords" description="Tap the button below to add your first password" />
        ) : grouped.length === 0 ? (
          <ErrorBlock status="empty" title="No results" description="Try a different search term" />
        ) : (
          <Collapse defaultActiveKey={grouped.map(([cat]) => cat)}>
            {grouped.map(([category, items]) => (
              <Collapse.Panel
                key={category}
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {category} <span style={{ fontWeight: 400, color: '#8c8c8c' }}>({items.length})</span>
                  </span>
                }
              >
                <List style={{ '--border-top': 'none', '--border-bottom': 'none' } as React.CSSProperties}>
                  {items.map(entry => (
                    <List.Item
                      key={entry.sysId}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setActionSheetVisible(true);
                      }}
                      description={
                        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {entry.url && (
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '65vw',
                            }}>
                              {entry.url}
                            </div>
                          )}
                          {entry.username && (
                            <div>{entry.username}</div>
                          )}
                        </div>
                      }
                    >
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{entry.title}</span>
                    </List.Item>
                  ))}
                </List>
              </Collapse.Panel>
            ))}
          </Collapse>
        )}
        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Fixed Add Button */}
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
        <Button block color="primary" onClick={() => navigate('/passwords/new')}>
          Add Password
        </Button>
      </div>

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => { setActionSheetVisible(false); setSelectedEntry(null); }}
        cancelText="Cancel"
      />

      {/* View Details Popup */}
      <Popup
        visible={!!viewingEntry}
        onMaskClick={() => setViewingEntry(null)}
        position="bottom"
        bodyStyle={{
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          maxHeight: 'calc(80vh - env(safe-area-inset-top))',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {viewingEntry && (
          <>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0e0e0' }} />
              </div>
              <div style={{
                padding: '4px 16px 12px',
                borderBottom: '1px solid #f0f0f0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{viewingEntry.title}</span>
                  <span
                    onClick={() => setViewingEntry(null)}
                    style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14, flexShrink: 0, marginLeft: 12 }}
                  >
                    Close
                  </span>
                </div>
                {viewingEntry.categoryName && (
                  <Tag color="primary" fill="outline" style={{ marginTop: 4 }}>{viewingEntry.categoryName}</Tag>
                )}
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {/* URL */}
              {viewingEntry.url && (
                <DetailRow
                  label="URL"
                  value={viewingEntry.url}
                  onCopy={() => copyToClipboard(viewingEntry.url!, 'URL')}
                  onLaunch={() => {
                    const url = viewingEntry.url!.startsWith('http') ? viewingEntry.url! : `https://${viewingEntry.url!}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                />
              )}
              {/* Username */}
              {viewingEntry.username && (
                <DetailRow
                  label="Username"
                  value={viewingEntry.username}
                  onCopy={() => copyToClipboard(viewingEntry.username!, 'Username')}
                />
              )}
              {/* Password */}
              {viewingEntry.password && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Password</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontFamily: passwordVisible ? 'inherit' : 'monospace', flex: 1 }}>
                      {passwordVisible ? viewingEntry.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </span>
                    <span
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      style={{ color: '#1890ff', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}
                    >
                      {passwordVisible ? <EyeInvisibleOutline /> : <EyeOutline />}
                    </span>
                    <span
                      onClick={() => copyToClipboard(viewingEntry.password!, 'Password')}
                      style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}
                    >
                      Copy
                    </span>
                  </div>
                </div>
              )}
              {/* Notes */}
              {viewingEntry.notes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {viewingEntry.notes}
                  </div>
                </div>
              )}
              {/* Timestamps */}
              <div style={{ fontSize: 12, color: '#bfbfbf', marginTop: 24 }}>
                Created {dayjs(viewingEntry.createTimestamp).format('MMM D, YYYY')}
                {viewingEntry.modifyTimestamp !== viewingEntry.createTimestamp && (
                  <> · Modified {dayjs(viewingEntry.modifyTimestamp).format('MMM D, YYYY')}</>
                )}
              </div>
            </div>
          </>
        )}
      </Popup>
    </>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  onCopy: () => void;
  onLaunch?: () => void;
}> = ({ label, value, onCopy, onLaunch }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontSize: 14,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
      <span
        onClick={onCopy}
        style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
      >
        Copy
      </span>
      {onLaunch && (
        <span
          onClick={onLaunch}
          style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
        >
          Open
        </span>
      )}
    </div>
  </div>
);

export default Passwords;
