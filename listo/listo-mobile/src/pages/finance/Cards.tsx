import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  NavBar,
  PullToRefresh,
  Skeleton,
  ErrorBlock,
  Popup,
  Toast,
} from 'antd-mobile';
import { UnorderedListOutline, PictureOutline } from 'antd-mobile-icons';
import api from '@shared/services/api';
import type { AccountCard } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';

const Cards: React.FC = () => {
  const { openMenu } = useMenu();
  const [cards, setCards] = useState<AccountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Detail popup state
  const [selectedCard, setSelectedCard] = useState<AccountCard | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(null);
  const [backImageUrl, setBackImageUrl] = useState<string | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get('/finance/cards');
      setCards(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const cleanupBlobUrls = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setFrontImageUrl(null);
    setBackImageUrl(null);
  };

  const handleCardTap = async (card: AccountCard) => {
    setSelectedCard(card);
    setPopupVisible(true);
    cleanupBlobUrls();

    if (card.hasFrontImage || card.hasBackImage) {
      setImagesLoading(true);
      try {
        const promises: Promise<void>[] = [];
        if (card.hasFrontImage) {
          promises.push(
            api.get(`/finance/accounts/${card.accountSysId}/cards/${card.sysId}/image/front`, { responseType: 'blob' })
              .then(res => {
                const url = URL.createObjectURL(res.data);
                blobUrlsRef.current.push(url);
                setFrontImageUrl(url);
              })
          );
        }
        if (card.hasBackImage) {
          promises.push(
            api.get(`/finance/accounts/${card.accountSysId}/cards/${card.sysId}/image/back`, { responseType: 'blob' })
              .then(res => {
                const url = URL.createObjectURL(res.data);
                blobUrlsRef.current.push(url);
                setBackImageUrl(url);
              })
          );
        }
        await Promise.all(promises);
      } catch {
        // Images failed to load, non-critical
      } finally {
        setImagesLoading(false);
      }
    }
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
    setSelectedCard(null);
    cleanupBlobUrls();
  };

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        Toast.show({ content: `${label} copied` });
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      Toast.show({ content: `${label} copied` });
    }
  };

  // Group cards by account name
  const grouped = cards.reduce<Record<string, AccountCard[]>>((acc, card) => {
    const key = card.accountName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(card);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped);

  if (loading) {
    return (
      <>
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Cards</NavBar>
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
        <NavBar back={null} left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />} style={{ '--height': '48px' }}>Cards</NavBar>
        <ErrorBlock status="default" title="Unable to load cards" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={fetchData}>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Cards
        </NavBar>

        {cards.length === 0 ? (
          <ErrorBlock
            status="empty"
            title="No cards found"
            description="Add cards from account details"
          />
        ) : (
          <div style={{ padding: '0 12px 12px' }}>
            {groupNames.map(accountName => (
              <div key={accountName} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', padding: '8px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {accountName}
                </div>
                {grouped[accountName].map(card => (
                  <div
                    key={card.sysId}
                    onClick={() => handleCardTap(card)}
                    style={{
                      background: '#fff',
                      border: '1px solid #e8e8e8',
                      borderRadius: 10,
                      padding: '14px 16px',
                      marginBottom: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {card.hasFrontImage ? (
                      <div style={{
                        width: 48,
                        height: 32,
                        borderRadius: 4,
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        <PictureOutline style={{ fontSize: 18, color: '#bfbfbf' }} />
                      </div>
                    ) : (
                      <div style={{
                        width: 48,
                        height: 32,
                        borderRadius: 4,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{card.name}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        {card.cardNumber || 'No number'}
                        {card.expirationDate && <span> · Exp {card.expirationDate}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 'calc(50px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Card Detail Popup */}
      <Popup
        visible={popupVisible}
        onMaskClick={handleClosePopup}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {selectedCard && (
          <>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedCard.name}</span>
                <span
                  onClick={handleClosePopup}
                  style={{ color: '#8c8c8c', cursor: 'pointer', fontSize: 14 }}
                >
                  Close
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{selectedCard.accountName}</div>
            </div>

            {/* Details */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {/* Card Number */}
              {selectedCard.cardNumberFull && (
                <DetailRow
                  label="Card Number"
                  value={selectedCard.cardNumberFull}
                  onCopy={() => copyToClipboard(selectedCard.cardNumberFull!, 'Card number')}
                />
              )}

              {/* Expiration */}
              {selectedCard.expirationDate && (
                <DetailRow
                  label="Expiration"
                  value={selectedCard.expirationDate}
                  onCopy={() => copyToClipboard(selectedCard.expirationDate!, 'Expiration')}
                />
              )}

              {/* CVV */}
              {selectedCard.cvv && (
                <DetailRow
                  label="CVV"
                  value={selectedCard.cvv}
                  onCopy={() => copyToClipboard(selectedCard.cvv!, 'CVV')}
                />
              )}

              {/* Phone */}
              {selectedCard.phoneNumber && (
                <DetailRow
                  label="Phone"
                  value={selectedCard.phoneNumber}
                  onCopy={() => copyToClipboard(selectedCard.phoneNumber!, 'Phone')}
                />
              )}

              {/* Images */}
              {(selectedCard.hasFrontImage || selectedCard.hasBackImage) && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8c8c8c', marginBottom: 8, textTransform: 'uppercase' }}>
                    Card Images
                  </div>
                  {imagesLoading ? (
                    <Skeleton.Paragraph lineCount={3} animated />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {frontImageUrl && (
                        <div>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Front</div>
                          <img
                            src={frontImageUrl}
                            alt="Card front"
                            style={{ width: '100%', borderRadius: 8, border: '1px solid #e8e8e8' }}
                          />
                        </div>
                      )}
                      {backImageUrl && (
                        <div>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>Back</div>
                          <img
                            src={backImageUrl}
                            alt="Card back"
                            style={{ width: '100%', borderRadius: 8, border: '1px solid #e8e8e8' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </Popup>
    </>
  );
};

const DetailRow: React.FC<{ label: string; value: string; onCopy: () => void }> = ({ label, value, onCopy }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
    <div>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, fontFamily: 'monospace' }}>{value}</div>
    </div>
    <span
      onClick={onCopy}
      style={{ color: '#1890ff', fontSize: 13, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}
    >
      Copy
    </span>
  </div>
);

export default Cards;
