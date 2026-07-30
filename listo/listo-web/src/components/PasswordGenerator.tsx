import React, { useState } from 'react';
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Popover,
  Progress,
  Slider,
  Tooltip,
  message,
} from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
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
} from '../utils/passwordGenerator';

interface PasswordGeneratorProps {
  /** Called with the generated password when the user accepts it. */
  onUse: (password: string) => void;
  /** Trigger element. Defaults to a small text button. */
  children?: React.ReactNode;
}

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onUse, children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PasswordGeneratorOptions>(loadGeneratorOptions);
  const [password, setPassword] = useState('');

  const noSetsSelected = !hasCharacterSet(options);

  const regenerate = (next: PasswordGeneratorOptions) => {
    setPassword(generatePassword(next));
  };

  const update = (changes: Partial<PasswordGeneratorOptions>) => {
    const next = { ...options, ...changes };
    setOptions(next);
    saveGeneratorOptions(next);
    regenerate(next);
  };

  const handleOpenChange = (next: boolean) => {
    // Start with a fresh suggestion each time the generator is opened.
    if (next) regenerate(options);
    setOpen(next);
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    message.success('Password copied to clipboard');
  };

  const handleUse = () => {
    if (!password) return;
    onUse(password);
    setOpen(false);
  };

  const entropy = estimateEntropy(options, password.length);
  const strength = strengthFor(entropy);

  const content = (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input
        readOnly
        value={password}
        placeholder="Select at least one character set"
        style={{ fontFamily: 'monospace', fontSize: 13 }}
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />

      <div>
        <Progress
          percent={strength.percent}
          strokeColor={strength.color}
          showInfo={false}
          size="small"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8c8c8c' }}>
          <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
          <span>{Math.round(entropy)} bits of entropy</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>Length</span>
        <Slider
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          value={options.length}
          onChange={(value) => update({ length: value })}
          style={{ flex: 1, margin: 0 }}
        />
        <InputNumber
          size="small"
          min={MIN_LENGTH}
          max={128}
          value={options.length}
          onChange={(value) => update({ length: value ?? DEFAULT_OPTIONS.length })}
          style={{ width: 62 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <Checkbox
          checked={options.uppercase}
          onChange={(e) => update({ uppercase: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Uppercase (A-Z)</span>
        </Checkbox>
        <Checkbox
          checked={options.lowercase}
          onChange={(e) => update({ lowercase: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Lowercase (a-z)</span>
        </Checkbox>
        <Checkbox
          checked={options.numbers}
          onChange={(e) => update({ numbers: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Numbers (0-9)</span>
        </Checkbox>
        <Checkbox
          checked={options.symbols}
          onChange={(e) => update({ symbols: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Symbols (!@#$)</span>
        </Checkbox>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Checkbox
          checked={options.requireEachType}
          onChange={(e) => update({ requireEachType: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Include at least one of each type</span>
        </Checkbox>
        <Checkbox
          checked={options.excludeAmbiguous}
          onChange={(e) => update({ excludeAmbiguous: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>Avoid look-alike characters (I l 1 O 0)</span>
        </Checkbox>
        <Checkbox
          checked={options.noRepeats}
          onChange={(e) => update({ noRepeats: e.target.checked })}
        >
          <span style={{ fontSize: 12 }}>No repeated characters</span>
        </Checkbox>
      </div>

      {noSetsSelected && (
        <span style={{ fontSize: 11, color: '#ff4d4f' }}>Select at least one character set.</span>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Button
          size="small"
          type="primary"
          onClick={handleUse}
          disabled={!password}
          style={{ flex: 1 }}
        >
          Use Password
        </Button>
        <Tooltip title="Regenerate">
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => regenerate(options)}
            disabled={noSetsSelected}
          />
        </Tooltip>
        <Tooltip title="Copy">
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} disabled={!password} />
        </Tooltip>
      </div>
    </div>
  );

  return (
    <Popover
      title="Generate Password"
      content={content}
      open={open}
      onOpenChange={handleOpenChange}
      trigger="click"
      placement="bottomRight"
    >
      {children ?? (
        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }}>
          Generate
        </Button>
      )}
    </Popover>
  );
};

export default PasswordGenerator;
