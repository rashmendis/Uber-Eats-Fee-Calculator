
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'selling-price': Calculates the Selling Price (Before Discount) based on Desired Payout.
   * 'payout': Calculates the Total Payout based on Selling Price (Before Discount) and offers for one or more items.
   * NOTE: Payout calculation history is not currently saved.
   */
  type: 'selling-price' | 'payout';
  /**
   * The primary numeric value entered by the user as the basis for the calculation.
   * If type is 'selling-price', this is the Desired Payout the seller wants to receive.
   * If type is 'payout' (currently not stored), this would represent the list of item Selling Prices Before Discount.
   */
  input: number;
  feePercentage: number;
  /**
   * Discount percentage applied (0-1), referred to as "Offer" in the UI.
   */
  discountPercentage: number;
  /**
   * The calculated fee amount.
   * Fee is always calculated based on the Final Price (Customer Pays).
   */
  fee: number;
  /**
   * The calculated discount amount (based on Selling Price *before* discount).
   */
  discountAmount: number;
  /**
   * The primary calculated result.
   * If type is 'selling-price', this is the Selling Price *before* discount.
   * If type is 'payout', this would be the Total Payout the seller receives (currently not stored).
   */
  result: number;
  /**
   * The final price the customer pays (after discount).
   * Calculated as: Selling Price Before Discount * (1 - Discount %).
   */
  finalPrice: number;
  currencySymbol: string;
  /**
   * Optional array of items included in a 'payout' calculation.
   * Not currently used as payout history is not saved.
   */
  items?: Array<{
      sellingPrice: number;
      offerPercentage: number;
  }>;
}
