import { describe, it, expect } from 'vitest';
import {
  parseOperand,
  maskValue,
  toSigned,
  applyOp,
  shiftRight,
  formatBases,
  opLabel,
  resultText,
  stepsFor,
  summaryText,
  shiftAmount,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  withToggledBit,
  bitwiseCalculatorTool,
} from '@/tool/tool-definition';
import { DEFAULT_STATE, MAX_HISTORY, type ToolState } from '@/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseOperand', () => {
  it('parses decimal, hex, binary and octal literals', () => {
    expect(parseOperand('42')).toBe(42n);
    expect(parseOperand('0xFF')).toBe(255n);
    expect(parseOperand('0b1010')).toBe(10n);
    expect(parseOperand('0o17')).toBe(15n);
  });

  it('parses signed values', () => {
    expect(parseOperand('-5')).toBe(-5n);
    expect(parseOperand('+7')).toBe(7n);
  });

  it('rejects invalid input', () => {
    expect(parseOperand('')).toBeNull();
    expect(parseOperand('  ')).toBeNull();
    expect(parseOperand('abc')).toBeNull();
    expect(parseOperand('1.5')).toBeNull();
    expect(parseOperand('0b12')).toBeNull();
    expect(parseOperand('0xZZ')).toBeNull();
    expect(parseOperand('12,5')).toBeNull();
    expect(parseOperand('--5')).toBeNull();
    expect(parseOperand('0b')).toBeNull();
  });
});

describe('maskValue and toSigned', () => {
  it('masks values into the bit width (overflow wrap)', () => {
    expect(maskValue(255n, 8)).toBe(255n);
    expect(maskValue(256n, 8)).toBe(0n);
    expect(maskValue(300n, 8)).toBe(44n);
    expect(maskValue(65535n, 16)).toBe(65535n);
    expect(maskValue(65536n, 16)).toBe(0n);
    expect(maskValue(1n << 32n, 32)).toBe(0n);
    expect(maskValue((1n << 64n) + 5n, 64)).toBe(5n);
  });

  it('wraps negative values two-complement style', () => {
    expect(maskValue(-1n, 8)).toBe(255n);
    expect(maskValue(-128n, 8)).toBe(128n);
    expect(maskValue(-129n, 8)).toBe(127n);
  });

  it('interprets two-complement signed values', () => {
    expect(toSigned(255n, 8)).toBe(-1n);
    expect(toSigned(128n, 8)).toBe(-128n);
    expect(toSigned(127n, 8)).toBe(127n);
    expect(toSigned(0xffffn, 16)).toBe(-1n);
  });
});

describe('AND/OR/XOR correctness across bit widths', () => {
  it('computes logical ops on masked operands', () => {
    expect(applyOp('and', 12n, 10n, 8).value).toBe(8n);
    expect(applyOp('or', 12n, 10n, 8).value).toBe(14n);
    expect(applyOp('xor', 12n, 10n, 8).value).toBe(6n);
  });

  it('masks operands per width', () => {
    // 300 & 0xF0 style: operands wrap first
    expect(applyOp('and', 300n, 0b1111_0000n, 8).value).toBe(44n & 0b1111_0000n);
    expect(applyOp('or', 0xffn, 1n, 8).value).toBe(255n);
    expect(applyOp('or', 0xffffn, 1n, 16).value).toBe(0xffffn);
    expect(applyOp('xor', 0xffffffffn, 0xffffffffn, 32).value).toBe(0n);
    const big = (1n << 64n) - 1n;
    expect(applyOp('and', big, big, 64).value).toBe(big);
  });

  it('nots all bits within width', () => {
    expect(applyOp('not', 0n, 0n, 8).value).toBe(255n);
    expect(applyOp('not', 0n, 0n, 16).value).toBe(0xffffn);
    expect(applyOp('not', 0x0fn, 0n, 8).value).toBe(0xf0n);
    expect(applyOp('not', 0n, 0n, 64).value).toBe((1n << 64n) - 1n);
  });
});

describe('shift and rotate operations', () => {
  it('shifts left within width', () => {
    expect(applyOp('shl', 1n, 4n, 8).value).toBe(16n);
    expect(applyOp('shl', 128n, 1n, 8).value).toBe(0n); // overflow drops out
  });

  it('shifts right unsigned without sign extension', () => {
    expect(applyOp('shr', 16n, 2n, 8).value).toBe(4n);
    expect(applyOp('shr', 0xffn, 4n, 8).value).toBe(0x0fn);
  });

  it('shifts right with sign extension for signed values', () => {
    // -16 (0xF0 in 8-bit) >> 2 => -4 (0xFC)
    expect(shiftRight(0xf0n, 2n, 8, true)).toBe(0xfcn);
    // Unsigned variant is a logical shift
    expect(shiftRight(0xf0n, 2n, 8, false)).toBe(0x3cn);
    // -1 >> any amount stays -1 (all ones)
    expect(shiftRight(0xffn, 7n, 8, true)).toBe(0xffn);
    expect(shiftRight(0xffffn, 8n, 16, true)).toBe(0xffffn);
  });

  it('wraps shift amounts modulo bit width', () => {
    expect(shiftAmount(8n, 8)).toBe(0n);
    expect(shiftAmount(9n, 8)).toBe(1n);
    expect(shiftAmount(70n, 64)).toBe(6n);
  });

  it('shifts by zero and by full width are no-ops', () => {
    expect(applyOp('shl', 0xabn, 0n, 8).value).toBe(0xabn);
    expect(applyOp('shr', 0xabn, 8n, 8).value).toBe(0xabn); // 8 mod 8 = 0
  });

  it('rotates left and right', () => {
    expect(applyOp('rotl', 0b1000_0001n, 1n, 8).value).toBe(0b0000_0011n);
    expect(applyOp('rotr', 0b0000_0011n, 1n, 8).value).toBe(0b1000_0001n);
    expect(applyOp('rotl', 0b1000_0001n, 8n, 8).value).toBe(0b1000_0001n); // full rotation
    expect(applyOp('rotr', 0x01n, 1n, 8).value).toBe(0x80n);
  });

  it('handles shift amounts beyond width', () => {
    expect(applyOp('shl', 1n, 300n, 8).value).toBe(16n); // 300 mod 8 = 4
  });
});

describe('bit-width overflow masking', () => {
  it('results never exceed the selected width', () => {
    const cases: ToolState['bits'][] = [8, 16, 32, 64];
    for (const bits of cases) {
      const mask = (1n << BigInt(bits)) - 1n;
      const r = applyOp('or', mask, mask, bits);
      expect(r.value).toBe(mask);
      expect(r.value >> BigInt(bits)).toBe(0n);
    }
  });

  it('shifting a full-width value wraps', () => {
    expect(applyOp('shl', 0x7fn, 1n, 8).value).toBe(0xfen);
    expect(applyOp('shl', 0xfen, 1n, 8).value).toBe(0x1fcn & 0xffn);
  });
});

describe('signed interpretation toggle', () => {
  it('shows signed decimal for high-bit results', () => {
    const signed = formatBases(0xffn, 8, true);
    const unsigned = formatBases(0xffn, 8, false);
    expect(signed.dec).toBe('-1');
    expect(unsigned.dec).toBe('255');
    expect(signed.hex).toBe('0xFF');
  });

  it('formats multi-base display consistently', () => {
    const b = formatBases(255n, 8, false);
    expect(b.dec).toBe('255');
    expect(b.hex).toBe('0xFF');
    expect(b.bin).toBe('0b1111 1111');
    expect(b.oct).toBe('0o377');
  });

  it('pads hex/bin/oct to width', () => {
    const b = formatBases(1n, 16, false);
    expect(b.hex).toBe('0x0001');
    expect(b.oct).toBe('0o000001');
  });
});

describe('resultText and steps', () => {
  it('returns null for invalid operands', () => {
    expect(resultText(state({ a: 'nope' }))).toBeNull();
    expect(resultText(state({ b: '' }))).toBeNull();
    expect(resultText(state({ a: '' }))).toBeNull();
  });

  it('formats results without operand B for NOT', () => {
    expect(summaryText(state({ op: 'not', a: '0x0F' }))).toContain('NOT');
    expect(resultText(state({ op: 'not', a: '0x0F' }))).toContain('240');
  });

  it('summarizes valid calculations', () => {
    expect(summaryText(state({ op: 'and', a: '12', b: '10' }))).toContain('AND');
    expect(summaryText(state({ op: 'xor', a: '12', b: '10' }))).toContain('6');
  });

  it('produces step explanations', () => {
    const steps = stepsFor(state({ op: 'and', a: '0xFF', b: '0x0F' }));
    expect(steps.length).toBeGreaterThan(2);
    expect(stepsFor(state({ a: 'zz' })).length).toBeGreaterThan(0);
    expect(stepsFor(state({ op: 'not', a: '0xFF', b: 'invalid' })).length).toBeGreaterThan(0);
  });
});

describe('opLabel', () => {
  it('humanizes ops', () => {
    expect(opLabel('and')).toBe('AND');
    expect(opLabel('rotl')).toBe('ROL');
    expect(opLabel('rotr')).toBe('ROR');
    expect(opLabel('not')).toBe('NOT');
  });
});

describe('serialize/deserialize and URL round-trip', () => {
  it('round-trips full state', () => {
    const s = state({ op: 'xor', a: '0xFF', b: '7', bits: 16, signed: true, history: [] });
    expect(roundTrips(s)).toBe(true);
  });

  it('round-trips state with history', () => {
    const s = withHistory(state({ op: 'or' }), 'OR: 15 (0x0F)', new Date('2026-01-01T00:00:00Z'));
    expect(s.history).toHaveLength(1);
    expect(roundTrips(s)).toBe(true);
  });

  it('repairs invalid payloads with defaults', () => {
    const repaired = deserializeState({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data).toEqual({
        ...DEFAULT_STATE,
        op: 'and',
        a: DEFAULT_STATE.a,
        b: DEFAULT_STATE.b,
        bits: 8,
        signed: false,
        history: [],
      });
    }
  });

  it('drops unknown ops/widths and caps history', () => {
    const repaired = deserializeState({
      op: 'nand',
      bits: 7,
      signed: 'yes',
      a: 5,
      b: {},
      history: Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
        text: `t${i}`,
        createdAt: '2026-01-01T00:00:0${i % 10}.000Z'.replace('${i % 10}', String(i % 10)),
      })),
    });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.op).toBe('and');
      expect(repaired.data.bits).toBe(8);
      expect(repaired.data.signed).toBe(false);
      expect(repaired.data.a).toBe(DEFAULT_STATE.a);
      expect(repaired.data.history).toHaveLength(MAX_HISTORY);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState(42).success).toBe(false);
  });

  it('exposes serialize output as JSON', () => {
    const out = serializeState(state({ op: 'shl', a: '1', b: '3' }));
    expect(JSON.parse(out)).toMatchObject({ op: 'shl', a: '1', b: '3', bits: 8 });
  });

  it('registers with the core tool contract', async () => {
    expect(bitwiseCalculatorTool.id).toBe('bitwise-calculator');
    expect(bitwiseCalculatorTool.name).toBe('Bitwise Calculator');
    expect(bitwiseCalculatorTool.serialize(state({ op: 'xor' }))).toBeTypeOf('string');
    const exporters = bitwiseCalculatorTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const png = await exporters[0]!.loader();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });
});

describe('bit toggling grid state updates', () => {
  it('toggles bits on operand A', () => {
    const next = withToggledBit(state({ a: '0' }), 'a', 0);
    expect(next.a).toBe('1');
    const next2 = withToggledBit(next, 'a', 0);
    expect(next2.a).toBe('0');
  });

  it('toggles high bits within width', () => {
    const next = withToggledBit(state({ a: '0', bits: 8 }), 'a', 7);
    expect(next.a).toBe('128');
  });

  it('toggles bit on operand B independently', () => {
    const next = withToggledBit(state({ a: '5', b: '0' }), 'b', 2);
    expect(next.a).toBe('5');
    expect(next.b).toBe('4');
  });

  it('falls back to 0 for unparseable input', () => {
    const next = withToggledBit(state({ a: 'xyz' }), 'a', 3);
    expect(next.a).toBe('8');
  });

  it('clamps out-of-range indices into the width', () => {
    const next = withToggledBit(state({ a: '0', bits: 8 }), 'a', 99);
    expect(next.a).toBe('128'); // clamped to bit 7
  });
});

describe('withHistory caps and orders newest first', () => {
  it('caps entries at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]!.text).toBe(`entry ${MAX_HISTORY + 2}`);
  });
});
