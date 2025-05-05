
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'with-fee': Input is Item Price, Result is Total Price (Input + Fee)
   * 'without-fee': Input is Total Price, Result is Price After Removing Fee (Input - Fee)
   */
  type: 'with-fee' | 'without-fee';
  input: number;
  feePercentage: number; // Added fee percentage used for calculation
  fee: number;
  result: number;
  currencySymbol: string; // Added currency symbol used for calculation
}

