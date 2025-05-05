
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'with-fee': Input is Desired Item Price (X), Result is Selling Price *before* discount.
   * 'without-fee': Input is Selling Price After Discount (Customer Price), Result is Original Item Price Seller Receives.
   */
  type: 'with-fee' | 'without-fee';
  /**
   * The primary value entered by the user.
   * If type is 'with-fee', this is the Desired Item Price (X) the seller wants to receive (before fee, before discount).
   * If type is 'without-fee', this is the Selling Price the customer pays (after any discount).
   */
  input: number;
  feePercentage: number;
  discountPercentage: number; // Discount percentage applied (0-1)
  /**
   * The calculated fee amount based on the Selling Price *before* discount.
   */
  fee: number;
  /**
   * The calculated discount amount.
   */
  discountAmount: number;
  /**
   * The calculated main result.
   * If type is 'with-fee', this is the Selling Price *before* discount (SP = X / (1 - Fee%)).
   * If type is 'without-fee', this is the Original Item Price the seller receives (SP_before_discount * (1 - Fee%)).
   */
  result: number;
  /**
   * The final price relevant to the context.
   * If type is 'with-fee', this is the Final Price the customer pays (Selling Price after discount).
   * If type is 'without-fee', this is the Original Selling Price *before* discount was applied (Customer Price / (1 - Discount %)).
   */
  finalPrice: number;
  currencySymbol: string;
}

