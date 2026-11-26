import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: 'bitwise-calculator',
  name: 'Bitwise Calculator',
  version: '1.0.0',
  description:
    'Interactive bitwise operations calculator supporting AND, OR, XOR, NOT, shifts with multi-base display.',
  exportFormats: ['json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: { brand: 'Bitwise Calculator', icon: '🔀' },
};

export default toolConfig;
