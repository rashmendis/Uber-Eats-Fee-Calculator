
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'with-fee': Input is Desired Item Price (X), Result is Selling Price (SP = X / (1 - Fee%))
   * 'without-fee': Input is Selling Price (Inc. Fee), Result is Original Item Price (Input - Fee)
   */
  type: 'with-fee' | 'without-fee';
  /**
   * The value entered by the user.
   * If type is 'with-fee', this is the Desired Item Price (X).
   * If type is 'without-fee', this is the Selling Price (Including Fee).
   */
  input: number;
  feePercentage: number; // Added fee percentage used for calculation
  /**
   * The calculated fee amount.
   * If type is 'with-fee', Fee = Selling Price * Fee%.
   * If type is 'without-fee', Fee = Selling Price * Fee%.
   */
  fee: number;
  /**
   * The calculated result.
   * If type is 'with-fee', this is the Selling Price (SP).
   * If type is 'without-fee', this is the Original Item Price (Selling Price - Fee).
   */
  result: number;
  currencySymbol: string; // Added currency symbol used for calculation
}
