import {
  OPS,
  WIDTHS,
  BASES,
  type BitOp,
  type BitWidth,
  type NumBase,
  type ToolState,
} from './types';

export const MODES = OPS;
export { OPS, WIDTHS, BASES };
export type { BitOp, BitWidth, NumBase, ToolState };

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.op === 'string' && typeof v.a === 'string' && typeof v.b === 'string';
}
