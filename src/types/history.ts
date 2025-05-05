// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'with-fee' | 'without-fee';
  input: number;
  feePercentage: number; // Added fee percentage used for calculation
  fee: number;
  result: number;
}
