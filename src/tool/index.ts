export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  bitwiseCalculatorTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  withToggledBit,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { OPS, WIDTHS, BASES, MODES, isState } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
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
  historyText,
} from './types';
export type { BitOp, BitWidth, NumBase, BaseDisplays, HistoryEntry, ToolState } from './types';
