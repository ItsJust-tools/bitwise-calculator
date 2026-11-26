import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  historyText,
  maskValue,
  opLabel,
  resultText,
  stepsFor,
  summaryText,
  type BitOp,
  type BitWidth,
  type HistoryEntry,
  type ToolState,
} from './types';

const VALID_OPS: BitOp[] = ['and', 'or', 'xor', 'not', 'shl', 'shr', 'rotl', 'rotr'];
const VALID_WIDTHS: BitWidth[] = [8, 16, 32, 64];

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function opOr(value: unknown, fallback: BitOp): BitOp {
  return VALID_OPS.includes(value as BitOp) ? (value as BitOp) : fallback;
}

function widthOr(value: unknown, fallback: BitWidth): BitWidth {
  return VALID_WIDTHS.includes(value as BitWidth) ? (value as BitWidth) : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    op: state.op,
    a: state.a,
    b: state.b,
    bits: state.bits,
    signed: state.signed,
    history: state.history,
  });
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected bitwise calculator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    op: opOr(v.op, DEFAULT_STATE.op),
    a: stringOr(v.a, DEFAULT_STATE.a),
    b: stringOr(v.b, DEFAULT_STATE.b),
    bits: widthOr(v.bits, DEFAULT_STATE.bits),
    signed: typeof v.signed === 'boolean' ? v.signed : DEFAULT_STATE.signed,
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Toggle a single bit in an operand string (by bit index within the width). */
export function withToggledBit(state: ToolState, operand: 'a' | 'b', index: number): ToolState {
  const raw = state[operand];
  let value: bigint | null;
  try {
    const cleaned = raw.trim() === '' ? '0' : raw.trim();
    value = BigInt(0);
    // Reuse parseOperand semantics via re-import to avoid duplication.
    const parsed = parseOperandSafe(cleaned);
    value = parsed === null ? null : maskValue(parsed, state.bits);
  } catch {
    value = null;
  }
  if (value === null) value = 0n;
  const flipped = value ^ (1n << BigInt(Math.max(0, Math.min(state.bits - 1, index))));
  return { ...state, [operand]: flipped.toString(10) } as ToolState;
}

function parseOperandSafe(input: string): bigint | null {
  // Local light parser mirroring types.parseOperand for state editing.
  const match = /^([+-]?)((?:0b[01]+)|(?:0x[0-9a-fA-F]+)|(?:0o[0-7]+)|\d+)$/.exec(input.trim());
  if (!match) return null;
  const s = match[1] ?? '';
  const lit = match[2] ?? '0';
  return (s === '-' ? -1n : 1n) * BigInt(lit);
}

export const bitwiseCalculatorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { historyText, resultText, stepsFor, summaryText, opLabel };
