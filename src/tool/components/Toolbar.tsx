'use client';

import React from 'react';
import { WIDTHS, type BitWidth, type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="Bit width selector">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Width</span>
        {WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            aria-pressed={state.bits === width}
            data-testid={`width-${width}`}
            onClick={() => onChange({ ...state, bits: width as BitWidth })}
            className={`rounded-md border px-2.5 py-1.5 text-xs font-mono font-medium ${
              state.bits === width
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {width}
          </button>
        ))}
        <label
          className="ml-2 flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300"
          data-testid="signed-toggle-wrap"
        >
          <input
            type="checkbox"
            checked={state.signed}
            onChange={(e) => onChange({ ...state, signed: e.target.checked })}
            data-testid="signed-toggle"
            className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          Signed (two&apos;s complement)
        </label>
      </div>
      <div className="flex items-center gap-2" role="group" aria-label="Bitwise tool controls">
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
          >
            Copy result
          </button>
        ) : null}
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="btn-clear-history"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear history
          </button>
        ) : null}
      </div>
    </div>
  );
};
