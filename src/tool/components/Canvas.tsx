'use client';

import React from 'react';
import { operandDisplays, resultText, stepsFor, summaryText } from '../types';
import {
  BASES,
  DEFAULT_STATE,
  OPS,
  WIDTHS,
  formatBases,
  maskValue,
  parseOperand,
  type BaseDisplays,
  type BitOp,
  type BitWidth,
  type NumBase,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function OperandField({
  label,
  value,
  onChangeState,
  testid,
}: {
  label: string;
  value: string;
  onChangeState: (next: string) => void;
  testid: string;
}) {
  return (
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeState(e.target.value)}
        data-testid={testid}
        className={inputClass}
        placeholder="e.g. 0xFF, 0b1010, 42"
      />
    </label>
  );
}

const rowKey: (keyof BaseDisplays)[] = ['dec', 'hex', 'bin', 'oct'];

function BaseLines({ displays, testPrefix }: { displays: BaseDisplays; testPrefix: string }) {
  const labels: Record<NumBase, string> = { dec: 'DEC', hex: 'HEX', bin: 'BIN', oct: 'OCT' };
  return (
    <div className="grid gap-1 font-mono text-xs" data-testid={`${testPrefix}-bases`}>
      {rowKey.map((key) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
            {labels[key]}
          </span>
          <span data-testid={`${testPrefix}-${key}`} className="text-gray-800 dark:text-gray-200">
            {displays[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

function BitGrid({
  value,
  bits,
  onToggle,
  testPrefix,
}: {
  value: bigint;
  bits: BitWidth;
  onToggle: (index: number) => void;
  testPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" data-testid={testPrefix}>
      {Array.from({ length: bits }, (_, i) => bits - 1 - i).map((index) => {
        const set = value >= 0n && (value >> BigInt(index)) % 2n === 1n;
        return (
          <button
            key={index}
            type="button"
            aria-pressed={set}
            aria-label={`Bit ${index}, ${set ? 'set' : 'clear'}`}
            onClick={() => onToggle(index)}
            data-testid={`${testPrefix}-bit-${index}`}
            className={`h-7 w-7 rounded border font-mono text-[10px] ${
              set
                ? 'border-violet-500 bg-violet-500 text-white dark:bg-violet-600'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {index}
          </button>
        );
      })}
    </div>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const result = resultText(state);
  const steps = stepsFor(state);
  const displays = operandDisplays(state);

  const a = parseOperand(state.a);
  const maskedA = a === null ? 0n : maskValue(a, state.bits);
  const b =
    state.op === 'not' ? null : parseOperand(state.b) === null ? null : parseOperand(state.b);
  const maskedB = b === null ? 0n : maskValue(b, state.bits);

  const handleToggle = (operand: 'a' | 'b', index: number) => {
    const current = parseOperand(state[operand]) ?? 0n;
    const next = (maskValue(current, state.bits) ^ (1n << BigInt(index))).toString(10);
    update({ [operand]: next } as Partial<ToolState>);
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="bitwise-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Bitwise operation"
        data-testid="op-tabs"
      >
        {OPS.map((op) => (
          <button
            key={op.value}
            type="button"
            role="tab"
            aria-selected={state.op === op.value}
            data-testid={`op-tab-${op.value}`}
            title={op.hint}
            onClick={() => update({ op: op.value as BitOp })}
            className={`rounded-md border px-3 py-1.5 text-xs font-mono font-medium ${
              state.op === op.value
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="operand-inputs">
        <div>
          <OperandField
            label="Operand A"
            value={state.a}
            onChangeState={(v) => update({ a: v })}
            testid="input-operand-a"
          />
          <BitGrid
            value={maskedA}
            bits={state.bits}
            onToggle={(i) => handleToggle('a', i)}
            testPrefix="bitgrid-a"
          />
        </div>
        {state.op !== 'not' ? (
          <div className="opacity-100" data-testid="operand-b-wrap">
            <OperandField
              label="Operand B (amount for shifts/rotates)"
              value={state.b}
              onChangeState={(v) => update({ b: v })}
              testid="input-operand-b"
            />
            <BitGrid
              value={maskedB}
              bits={state.bits}
              onToggle={(i) => handleToggle('b', i)}
              testPrefix="bitgrid-b"
            />
          </div>
        ) : (
          <div
            className="flex items-center text-xs text-gray-500 dark:text-gray-400"
            data-testid="operand-b-hidden"
          >
            NOT uses operand A only.
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Operand A
          </h3>
          {displays.a ? <BaseLines displays={displays.a} testPrefix="operand-a" /> : null}
        </div>
        {displays.b ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Operand B
            </h3>
            <BaseLines displays={displays.b} testPrefix="operand-b" />
          </div>
        ) : null}
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Result
        </span>
        <span className="flex items-center justify-center gap-2">
          <span className="block font-mono text-2xl font-bold" data-testid="result-main">
            {result ?? '—'}
          </span>
          {result ? <CopyButton value={result} testid="copy-result" /> : null}
        </span>
        {displays.result ? (
          <div className="mt-3 text-left">
            <BaseLines displays={displays.result} testPrefix="result" />
          </div>
        ) : null}
        <span
          className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
          data-testid="result-summary"
        >
          {result === null ? 'Enter valid operands' : summaryText(state)}
        </span>
        {result ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(result)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Step-by-step
        </h3>
        <ol className="space-y-1 text-xs text-gray-700 dark:text-gray-300" data-testid="steps-list">
          {steps.map((step, i) => (
            <li key={i} className="font-mono">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved calculations yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All calculations run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};

export { DEFAULT_STATE, WIDTHS, BASES, formatBases };
