// Secure password generation. Keep in sync with shared/utils/passwordGenerator.ts
// (listo-mobile consumes that copy via the @shared alias).

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';

/** Characters that are easily confused with one another in most fonts. */
const AMBIGUOUS = 'Il1O0o5S2Z8B';

const STORAGE_KEY = 'passwordGeneratorOptions';

export interface PasswordGeneratorOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  noRepeats: boolean;
  requireEachType: boolean;
}

export const DEFAULT_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  noRepeats: false,
  requireEachType: true,
};

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 64;

/** Unbiased random integer in [0, max) using the Web Crypto API. */
const randomInt = (max: number): number => {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
};

const pick = (chars: string): string => chars[randomInt(chars.length)];

/** Returns the character sets enabled by the given options, after exclusions. */
const buildPools = (options: PasswordGeneratorOptions): string[] => {
  const sets: string[] = [];
  if (options.lowercase) sets.push(LOWERCASE);
  if (options.uppercase) sets.push(UPPERCASE);
  if (options.numbers) sets.push(NUMBERS);
  if (options.symbols) sets.push(SYMBOLS);

  return sets
    .map(set =>
      options.excludeAmbiguous
        ? [...set].filter(c => !AMBIGUOUS.includes(c)).join('')
        : set
    )
    .filter(set => set.length > 0);
};

export const hasCharacterSet = (options: PasswordGeneratorOptions): boolean =>
  options.lowercase || options.uppercase || options.numbers || options.symbols;

export const generatePassword = (options: PasswordGeneratorOptions): string => {
  const pools = buildPools(options);
  if (pools.length === 0) return '';

  const fullPool = pools.join('');
  // Without repeats the password can never be longer than the pool itself.
  const length = options.noRepeats
    ? Math.min(options.length, fullPool.length)
    : options.length;

  const used = new Set<string>();
  const chars: string[] = [];

  const take = (from: string): boolean => {
    const available = options.noRepeats
      ? [...from].filter(c => !used.has(c)).join('')
      : from;
    if (available.length === 0) return false;
    const c = pick(available);
    used.add(c);
    chars.push(c);
    return true;
  };

  if (options.requireEachType) {
    for (const pool of pools) {
      if (chars.length >= length) break;
      take(pool);
    }
  }

  while (chars.length < length) {
    if (!take(fullPool)) break;
  }

  // Shuffle so the required-type characters aren't always up front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

/** Approximate entropy in bits for a password drawn from these options. */
export const estimateEntropy = (
  options: PasswordGeneratorOptions,
  length: number
): number => {
  const pools = buildPools(options);
  if (pools.length === 0 || length === 0) return 0;
  const poolSize = pools.join('').length;

  if (options.noRepeats) {
    let bits = 0;
    for (let i = 0; i < Math.min(length, poolSize); i++) {
      bits += Math.log2(poolSize - i);
    }
    return bits;
  }

  return length * Math.log2(poolSize);
};

export interface PasswordStrength {
  label: string;
  color: string;
  percent: number;
}

export const strengthFor = (bits: number): PasswordStrength => {
  const percent = Math.min(100, Math.round((bits / 128) * 100));
  if (bits < 40) return { label: 'Weak', color: '#ff4d4f', percent };
  if (bits < 60) return { label: 'Fair', color: '#faad14', percent };
  if (bits < 80) return { label: 'Strong', color: '#52c41a', percent };
  return { label: 'Very Strong', color: '#237804', percent };
};

export const loadGeneratorOptions = (): PasswordGeneratorOptions => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_OPTIONS, ...JSON.parse(saved) };
  } catch {
    // Ignore malformed saved preferences.
  }
  return DEFAULT_OPTIONS;
};

export const saveGeneratorOptions = (options: PasswordGeneratorOptions): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // Preferences are a convenience only.
  }
};
