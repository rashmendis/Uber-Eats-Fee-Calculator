
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'with-fee': Input is Item Price, Result is Total Price (Input + Fee)
   * 'without-fee': Input is Total Price (Inc. Fee), Result is Original Item Price (Input - Fee)
   */
  type: 'with-fee' | 'without-fee';
  /**
   * The value entered by the user.
   * If type is 'with-fee', this is the Item Price.
   * If type is 'without-fee', this is the Total Price (Including Fee).
   */
  input: number;
  feePercentage: number; // Added fee percentage used for calculation
  /**
   * The calculated fee amount based on the input and feePercentage.
   */
  fee: number;
  /**
   * The calculated result.
   * If type is 'with-fee', this is the Total Price (Item Price + Fee).
   * If type is 'without-fee', this is the Original Item Price (Total Price - Fee).
   */
  result: number;
  currencySymbol: string; // Added currency symbol used for calculation
}
