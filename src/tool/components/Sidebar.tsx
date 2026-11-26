'use client';

import React from 'react';
import { OPS } from '../types';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange?: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="bitwise-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Operations</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {OPS.map((op) => (
            <li key={op.value} className="flex justify-between gap-2">
              <span className="font-mono">{op.label}</span>
              <span className="text-right text-gray-500 dark:text-gray-400">{op.hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Input bases</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Operands accept <code className="font-mono">0b1010</code> (binary),{' '}
          <code className="font-mono">0xFF</code> (hex), <code className="font-mono">0o17</code>{' '}
          (octal) or plain decimal. Results show in decimal, hex, binary and octal at once.
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Bit grid editing</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Click any numbered bit cell to toggle it without carries — edits wrap inside the selected{' '}
          {state.bits}-bit width.
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>C</kbd> — Copy result
          </li>
          <li>
            <kbd>S</kbd> — Save result to history
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current operands and options;
          open it to restore this calculation.
        </p>
      </div>
    </div>
  );
};
