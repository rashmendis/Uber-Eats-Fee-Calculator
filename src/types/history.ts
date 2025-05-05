
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'with-fee': Input is Desired Item Price (X), Result is Selling Price *before* discount. Fee is calculated on SP before discount.
   * 'without-fee': Input is Selling Price *Before* Discount, Result is Item Price Seller Receives. Fee is calculated on SP *after* discount.
   */
  type: 'with-fee' | 'without-fee';
  /**
   * The primary value entered by the user.
   * If type is 'with-fee', this is the Desired Item Price (X) the seller wants to receive (before fee, before discount).
   * If type is 'without-fee', this is the Selling Price *before* any discount was applied.
   */
  input: number;
  feePercentage: number;
  discountPercentage: number; // Discount percentage applied (0-1)
  /**
   * The calculated fee amount.
   * If type is 'with-fee', fee is based on Selling Price *before* discount.
   * If type is 'without-fee', fee is based on Selling Price *after* discount (Final Price Customer Pays).
   */
  fee: number;
  /**
   * The calculated discount amount (based on Selling Price *before* discount).
   */
  discountAmount: number;
  /**
   * The calculated main result.
   * If type is 'with-fee', this is the Selling Price *before* discount (SP = X / (1 - Fee%)).
   * If type is 'without-fee', this is the Item Price the seller receives (Price After Discount * (1 - Fee%)).
   */
  result: number;
  /**
   * The final price the customer pays.
   * If type is 'with-fee', this is SP Before Discount * (1 - Discount%).
   * If type is 'without-fee', this is SP Before Discount * (1 - Discount%).
   */
  finalPrice: number;
  currencySymbol: string;
}
