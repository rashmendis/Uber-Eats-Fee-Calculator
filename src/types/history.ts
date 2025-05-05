
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'selling-price': Calculates the Selling Price based on Desired Payout.
   * 'payout': Calculates the Payout based on Selling Price Before Discount.
   */
  type: 'selling-price' | 'payout';
  /**
   * The primary value entered by the user.
   * If type is 'selling-price', this is the Desired Payout (X) the seller wants to receive.
   * If type is 'payout', this is the Selling Price *before* any discount was applied.
   */
  input: number;
  feePercentage: number;
  discountPercentage: number; // Discount percentage applied (0-1)
  /**
   * The calculated fee amount.
   * If type is 'selling-price', fee is based on Selling Price *before* discount.
   * If type is 'payout', fee is based on Selling Price *after* discount (Final Price Customer Pays).
   */
  fee: number;
  /**
   * The calculated discount amount (based on Selling Price *before* discount).
   */
  discountAmount: number;
  /**
   * The calculated main result.
   * If type is 'selling-price', this is the Selling Price *before* discount (SP = X / (1 - Fee%)).
   * If type is 'payout', this is the Payout the seller receives (Price After Discount * (1 - Fee%)).
   */
  result: number;
  /**
   * The final price the customer pays.
   * If type is 'selling-price', this is SP Before Discount * (1 - Discount%).
   * If type is 'payout', this is SP Before Discount * (1 - Discount%).
   */
  finalPrice: number;
  currencySymbol: string;
}

