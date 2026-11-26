export type BitOp = 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr' | 'rotl' | 'rotr';

export type BitWidth = 8 | 16 | 32 | 64;

export type NumBase = 'dec' | 'hex' | 'bin' | 'oct';

export interface HistoryEntry {
  /** Short human readable description of the calculation. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active bitwise operation. */
  op: BitOp;
  /** Operand A, parsed with base prefixes (0b, 0x, 0o) or plain decimal. */
  a: string;
  /** Operand B (shift/rotate amount for shift ops). */
  b: string;
  /** Selected bit width. */
  bits: BitWidth;
  /** Interpret results as two-complement signed values. */
  signed: boolean;
  /** Saved calculation history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  op: 'and',
  a: '12',
  b: '10',
  bits: 8,
  signed: false,
  history: [],
};

export const MAX_HISTORY = 20;

export const OPS: { value: BitOp; label: string; hint: string }[] = [
  { value: 'and', label: 'AND', hint: 'bitwise AND of A and B' },
  { value: 'or', label: 'OR', hint: 'bitwise OR of A and B' },
  { value: 'xor', label: 'XOR', hint: 'bitwise XOR of A and B' },
  { value: 'not', label: 'NOT', hint: 'bitwise complement of A' },
  { value: 'shl', label: 'SHL', hint: 'shift A left by B bits' },
  { value: 'shr', label: 'SHR', hint: 'shift A right by B bits (sign-extends when signed)' },
  { value: 'rotl', label: 'ROL', hint: 'rotate A left by B bits' },
  { value: 'rotr', label: 'ROR', hint: 'rotate A right by B bits' },
];

export const WIDTHS: BitWidth[] = [8, 16, 32, 64];

export const BASES: { value: NumBase; label: string }[] = [
  { value: 'dec', label: 'Decimal' },
  { value: 'hex', label: 'Hex' },
  { value: 'bin', label: 'Binary' },
  { value: 'oct', label: 'Octal' },
];

/** Number of bits used by a width. */
export function bitCount(bits: BitWidth): bigint {
  return BigInt(bits);
}

/** Modulus 2^bits as a BigInt. */
export function modulus(bits: BitWidth): bigint {
  return 1n << bitCount(bits);
}

/** Inclusive mask (2^bits - 1) as a BigInt. */
export function maskOf(bits: BitWidth): bigint {
  return modulus(bits) - 1n;
}

const PREFIX_RE = /^([+-]?)((?:0b[01]+)|(?:0x[0-9a-fA-F]+)|(?:0o[0-7]+)|\d+)$/u;

/** Parse an operand in any supported base (0b, 0x, 0o or decimal), with optional sign. */
export function parseOperand(input: string): bigint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match: RegExpExecArray | null = PREFIX_RE.exec(trimmed);
  if (!match) return null;
  const groups = match as unknown as [string, string, string];
  const sign = groups[1] === '-' ? -1n : 1n;
  const literal: string = groups[2];
  let value: bigint;
  if (literal.startsWith('0b')) {
    value = bigFromDigits(literal.slice(2), 2);
  } else if (literal.startsWith('0x')) {
    value = bigFromDigits(literal.slice(2), 16);
  } else if (literal.startsWith('0o')) {
    value = bigFromDigits(literal.slice(2), 8);
  } else {
    value = BigInt(literal);
  }
  return sign * value;
}

/** Parse digits in an arbitrary base into a BigInt without precision loss. */
function bigFromDigits(digits: string, radix: number): bigint {
  let result = 0n;
  for (const ch of digits.toLowerCase()) {
    const digit = parseInt(ch, radix);
    result = result * BigInt(radix) + BigInt(digit);
  }
  return result;
}

/**
 * Mask a (possibly negative) BigInt into the requested bit width using
 * two-complement wrap-around; returns an unsigned value in [0, 2^bits).
 */
export function maskValue(value: bigint, bits: BitWidth): bigint {
  const m = modulus(bits);
  const wrapped = ((value % m) + m) % m;
  return wrapped & maskOf(bits);
}

/** Interpret an unsigned bit pattern as a two-complement signed value. */
export function toSigned(value: bigint, bits: BitWidth): bigint {
  const half = modulus(bits) >> 1n;
  const masked = maskValue(value, bits);
  return masked >= half ? masked - modulus(bits) : masked;
}

/** Shift/rotate amounts wrap modulo the bit width. */
export function shiftAmount(value: bigint, bits: BitWidth): bigint {
  return maskValue(value, bits) % bitCount(bits);
}

export interface BitwiseResult {
  /** Unsigned result bit pattern inside the selected width. */
  value: bigint;
  /** Human-readable expression, e.g. "0x0C AND 0x0A". */
  expression: string;
}

/** Compute the active bitwise operation on masked operands. */
export function applyOp(op: BitOp, a: bigint, b: bigint, bits: BitWidth): BitwiseResult {
  const A = maskValue(a, bits);
  const B = maskValue(b, bits);
  const mask = maskOf(bits);
  let value: bigint;
  switch (op) {
    case 'and':
      value = A & B;
      break;
    case 'or':
      value = A | B;
      break;
    case 'xor':
      value = A ^ B;
      break;
    case 'not':
      value = ~A & mask;
      break;
    case 'shl':
      value = (A << shiftAmount(B, bits)) & mask;
      break;
    case 'shr':
      value = shiftRightSigned(A, shiftAmount(B, bits));
      break;
    case 'rotl': {
      const n = shiftAmount(B, bits);
      value = n === 0n ? A : ((A << n) | (A >> (bitCount(bits) - n))) & mask;
      break;
    }
    case 'rotr': {
      const n = shiftAmount(B, bits);
      value = n === 0n ? A : ((A >> n) | (A << (bitCount(bits) - n))) & mask;
      break;
    }
  }
  return { value: maskValue(value, bits), expression: `${op.toUpperCase()} result` };
}

/** Right shift inside applyOp: unsigned bit pattern shifts logically (top bit not set). */
function shiftRightSigned(a: bigint, n: bigint): bigint {
  return a >> n;
}

/** Right shift with optional two-complement sign extension. */
export function shiftRight(a: bigint, amount: bigint, bits: BitWidth, signed: boolean): bigint {
  const A = maskValue(a, bits);
  const n = shiftAmount(amount, bits);
  if (!signed) return A >> n;
  return maskValue(toSigned(A, bits) >> n, bits);
}

export interface BaseDisplays {
  dec: string;
  hex: string;
  bin: string;
  oct: string;
}

/** Simultaneous decimal/hex/binary/octal display of a result value. */
export function formatBases(value: bigint, bits: BitWidth, signed: boolean): BaseDisplays {
  const masked = maskValue(value, bits);
  const hexWidth = bits / 4;
  const octWidth = Math.ceil(bits / 3);
  const signedValue = signed ? toSigned(masked, bits) : masked;
  return {
    dec: signedValue.toString(10),
    hex: '0x' + masked.toString(16).toUpperCase().padStart(hexWidth, '0'),
    bin:
      '0b' +
      masked
        .toString(2)
        .padStart(bits, '0')
        .replace(/(.{4})(?=.)/g, '$1 '),
    oct: '0o' + masked.toString(8).padStart(octWidth, '0'),
  };
}

const OP_SYMBOLS: Record<BitOp, string> = {
  and: 'AND',
  or: 'OR',
  xor: 'XOR',
  not: 'NOT',
  shl: 'SHL',
  shr: 'SHR',
  rotl: 'ROL',
  rotr: 'ROR',
};

export function opLabel(op: BitOp): string {
  return OP_SYMBOLS[op];
}

/** Human-readable result summary for the active operation, or null when inputs are invalid. */
export function resultText(state: ToolState): string | null {
  const a = parseOperand(state.a);
  if (a === null) return null;
  if (state.op !== 'not') {
    const b = parseOperand(state.b);
    if (b === null) return null;
    const result = applyOp(state.op, a, b, state.bits);
    const bases = formatBases(result.value, state.bits, state.signed);
    return `${bases.dec} (${bases.hex})`;
  }
  const result = applyOp(state.op, a, 0n, state.bits);
  const bases = formatBases(result.value, state.bits, state.signed);
  return `${bases.dec} (${bases.hex})`;
}

export interface OperandLines {
  a: BaseDisplays | null;
  b: BaseDisplays | null;
  result: BaseDisplays | null;
}

/** Multi-base display lines for operands and result. */
export function operandDisplays(state: ToolState): OperandLines {
  const a = parseOperand(state.a);
  const b = state.op === 'not' ? null : parseOperand(state.b);
  const result = resultText(state);
  const toDisplays = (value: bigint): BaseDisplays =>
    formatBases(maskValue(value, state.bits), state.bits, state.signed);
  return {
    a: a === null ? null : toDisplays(a),
    b: b === null ? null : toDisplays(b),
    result:
      result === null
        ? null
        : formatBases(
            applyOp(state.op, a ?? 0n, b ?? 0n, state.bits).value,
            state.bits,
            state.signed
          ),
  };
}

/** One line per step explaining the active operation. */
export function stepsFor(state: ToolState): string[] {
  const a = parseOperand(state.a);
  if (a === null) return ['Enter a valid operand A (supports 0b, 0x, 0o and decimal).'];
  if (state.op !== 'not') {
    const b = parseOperand(state.b);
    if (b === null) return ['Enter a valid operand B (supports 0b, 0x, 0o and decimal).'];
  }
  const b = state.op === 'not' ? 0n : (parseOperand(state.b) ?? 0n);
  const { value, expression } = applyOp(state.op, a, b, state.bits);
  const bases = formatBases(value, state.bits, state.signed);
  return [
    `Mask operands to ${state.bits}-bit two-complement range.`,
    `A = ${formatBases(maskValue(a, state.bits), state.bits, state.signed).hex}, ${
      state.op === 'not'
        ? ''
        : `B = ${formatBases(maskValue(b, state.bits), state.bits, state.signed).hex}`
    }`,
    `Apply ${expression}.`,
    `Result: ${bases.bin} = ${bases.hex} = ${bases.dec} (${state.signed ? 'signed' : 'unsigned'})`,
  ];
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const result = resultText(state);
  const label = opLabel(state.op);
  return result === null ? `${label}: enter valid operands` : `${label}: ${result}`;
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.op === 'string' && typeof v.a === 'string' && typeof v.b === 'string';
}

export { OPS as MODES };
