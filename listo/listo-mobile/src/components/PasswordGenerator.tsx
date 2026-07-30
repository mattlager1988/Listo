import React, { useState } from 'react';
import { Popup, Button, Slider, Stepper, Switch, List, ProgressBar, Toast } from 'antd-mobile';
import {
  DEFAULT_OPTIONS,
  MAX_LENGTH,
  MIN_LENGTH,
  estimateEntropy,
  generatePassword,
  hasCharacterSet,
  loadGeneratorOptions,
  saveGeneratorOptions,
  strengthFor,
  type PasswordGeneratorOptions,
} from '@shared/utils/passwordGenerator';

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

interface PasswordGeneratorProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the generated password when the user accepts it. */
  onUse: (password: string) => void;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ visible, onClose, onUse }) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(loadGeneratorOptions);
  const [password, setPassword] = useState('');
  const [lastVisible, setLastVisible] = useState(false);

  const noSetsSelected = !hasCharacterSet(options);

  const regenerate = (next: PasswordGeneratorOptions) => {
    setPassword(generatePassword(next));
  };

  // Start with a fresh suggestion each time the sheet is opened.
  if (visible !== lastVisible) {
    setLastVisible(visible);
    if (visible) regenerate(options);
  }

  // `commit: false` is used while a slider is being dragged — the option is applied
  // for display, but persisting and regenerating wait until the drag ends.
  const update = (changes: Partial<PasswordGeneratorOptions>, commit = true) => {
    const next = { ...options, ...changes };
    setOptions(next);
    if (commit) {
      saveGeneratorOptions(next);
      regenerate(next);
    }
  };

  const handleUse = () => {
    if (!password) return;
    onUse(password);
    onClose();
  };

  const entropy = estimateEntropy(options, password.length);
  const strength = strengthFor(entropy);

  const toggle = (
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    description?: string
  ) => (
    <List.Item
      key={label}
      description={description}
      extra={
        <Switch
          checked={checked}
          onChange={onChange}
          style={{ '--height': '22px', '--width': '40px' } as React.CSSProperties}
        />
      }
    >
      <span style={{ fontSize: 14 }}>{label}</span>
    </List.Item>
  );

  return (
    <Popup
      visible={visible}
      onMaskClick={onClose}
      position="bottom"
      bodyStyle={{
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        maxHeight: 'calc(85vh - env(safe-area-inset-top))',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '16px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Generate Password</div>

        <div
          onClick={() => password && copyToClipboard(password, 'Password')}
          style={{
            fontFamily: 'monospace',
            fontSize: 15,
            wordBreak: 'break-all',
            background: '#f5f5f5',
            borderRadius: 8,
            padding: '10px 12px',
            minHeight: 42,
            color: password ? '#333' : '#bbb',
          }}
        >
          {password || 'Select at least one character set'}
        </div>

        <div style={{ marginTop: 8 }}>
          <ProgressBar
            percent={strength.percent}
            style={{ '--fill-color': strength.color, '--track-width': '4px' } as React.CSSProperties}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#8c8c8c',
              marginTop: 4,
            }}
          >
            <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
            <span>{Math.round(entropy)} bits of entropy</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '4px 16px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 14,
            }}
          >
            <span>Length</span>
            <Stepper
              min={MIN_LENGTH}
              max={128}
              value={options.length}
              onChange={(value) => update({ length: value || DEFAULT_OPTIONS.length })}
              style={{ '--input-width': '38px' } as React.CSSProperties}
            />
          </div>
          <Slider
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={Math.min(options.length, MAX_LENGTH)}
            onChange={(value) =>
              update({ length: Array.isArray(value) ? value[0] : value }, false)
            }
            onAfterChange={(value) =>
              update({ length: Array.isArray(value) ? value[0] : value })
            }
            style={{ '--fill-color': '#1890ff' } as React.CSSProperties}
          />
        </div>

        <List header="Character Sets">
          {toggle('Uppercase', options.uppercase, (v) => update({ uppercase: v }), 'A-Z')}
          {toggle('Lowercase', options.lowercase, (v) => update({ lowercase: v }), 'a-z')}
          {toggle('Numbers', options.numbers, (v) => update({ numbers: v }), '0-9')}
          {toggle('Symbols', options.symbols, (v) => update({ symbols: v }), '!@#$%^&*')}
        </List>

        <List header="Rules">
          {toggle(
            'At least one of each type',
            options.requireEachType,
            (v) => update({ requireEachType: v })
          )}
          {toggle(
            'Avoid look-alikes',
            options.excludeAmbiguous,
            (v) => update({ excludeAmbiguous: v }),
            'I l 1 O 0'
          )}
          {toggle('No repeated characters', options.noRepeats, (v) => update({ noRepeats: v }))}
        </List>

        {noSetsSelected && (
          <div style={{ padding: '8px 16px 0', fontSize: 12, color: '#ff4d4f' }}>
            Select at least one character set.
          </div>
        )}
      </div>

      <div
        style={{
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Button
          size="large"
          onClick={() => regenerate(options)}
          disabled={noSetsSelected}
          style={{ borderRadius: 8, flexShrink: 0 }}
        >
          Regenerate
        </Button>
        <Button
          block
          color="primary"
          size="large"
          onClick={handleUse}
          disabled={!password}
          style={{ borderRadius: 8 }}
        >
          Use Password
        </Button>
      </div>
    </Popup>
  );
};

export default PasswordGenerator;
