
// src/types/history.ts

export interface HistoryEntry {
  id: string;
  timestamp: number;
  /**
   * 'selling-price': Calculates the Selling Price (Before Discount) based on Desired Payout.
   * 'payout': Calculates the Total Payout based on Selling Price (Before Discount) and offers for one or more items.
   */
  type: 'selling-price' | 'payout';
  /**
   * The primary numeric value entered by the user as the basis for the calculation.
   * If type is 'selling-price', this is the Desired Payout the seller wants to receive.
   * If type is 'payout', this represents the Sum of Selling Prices Before Discount for all items.
   */
  input: number;
  feePercentage: number;
  /**
   * Discount percentage applied (0-1), referred to as "Offer" in the UI.
   * For 'payout' type, this is an approximate overall discount percentage.
   */
  discountPercentage: number;
  /**
   * The calculated fee amount.
   * Fee is always calculated based on the Final Price (Customer Pays) for 'selling-price'.
   * For 'payout', this is the Total Fee Amount calculated on the Subtotal (Customer Pays).
   */
  fee: number;
  /**
   * The calculated discount amount (based on Selling Price *before* discount).
   * For 'payout', this is the Total Discount Amount across all items.
   */
  discountAmount: number;
  /**
   * The primary calculated result.
   * If type is 'selling-price', this is the Selling Price *before* discount.
   * If type is 'payout', this is the Total Payout the seller receives.
   */
  result: number;
  /**
   * The final price the customer pays (after discount).
   * For 'selling-price', calculated as: Selling Price Before Discount * (1 - Discount %).
   * For 'payout', this represents the Subtotal (Customer Pays) across all items.
   */
  finalPrice: number;
  currencySymbol: string;
  /**
   * Optional array of items included in a 'payout' calculation.
   * Not currently used in the saved history structure to keep it simple.
   */
  items?: Array<{
      sellingPrice: number;
      offerPercentage: number;
  }>;
}
