
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Tag, Info, Calculator, CircleDollarSign, HandCoins, ReceiptText, PlusCircle, Trash2, Hash, Minus } from 'lucide-react'; // Added Minus
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history';
import { HISTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE, DEFAULT_CURRENCY_SYMBOL, MAX_HISTORY_LENGTH } from '@/lib/constants';
import type { SettingsData } from '@/types/settings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import HistoryView from '@/components/history-view'; // Import HistoryView

// Interface for a single item in the Payout Calculator
interface PayoutItem {
  id: string;
  sellingPrice: string;
  offerOption: string; // '0', '20', '30', '40', '50', '75', 'custom'
  customOffer: string; // Custom percentage value
}

// Function to add history entry directly to localStorage
const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
  // Ensure this code only runs on the client
  if (typeof window === 'undefined') return;

  // Allow both types now
  // if (entry.type !== 'selling-price') return;

  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    const currentHistory: HistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];

    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Avoid adding exact duplicate of the most recent entry based on key properties
    if (currentHistory.length > 0) {
      const lastEntry = currentHistory[0];
      let isDuplicate = false;
      if (lastEntry.type === newEntry.type) {
        if (newEntry.type === 'selling-price') {
           isDuplicate = lastEntry.input === newEntry.input &&
                         lastEntry.result === newEntry.result &&
                         lastEntry.feePercentage === newEntry.feePercentage &&
                         lastEntry.discountPercentage === newEntry.discountPercentage &&
                         lastEntry.finalPrice === newEntry.finalPrice;
        } else if (newEntry.type === 'payout') {
           // Compare relevant fields for payout duplication
           isDuplicate = lastEntry.input === newEntry.input && // Sum of SPs
                         lastEntry.result === newEntry.result && // Total Payout
                         lastEntry.feePercentage === newEntry.feePercentage &&
                         lastEntry.discountAmount === newEntry.discountAmount && // Total Discount Amt
                         lastEntry.fee === newEntry.fee && // Total Fee Amt
                         lastEntry.finalPrice === newEntry.finalPrice; // Subtotal Customer Pays
        }
      }

      if (isDuplicate) {
        // console.log("Skipping duplicate history entry");
        return; // Don't add exact duplicate
      }
    }


    const updatedHistory = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_LENGTH);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
    // console.log("History entry added:", newEntry);

    // Dispatch a storage event to notify other components (like HistoryView)
    window.dispatchEvent(new StorageEvent('storage', {
      key: HISTORY_STORAGE_KEY,
      newValue: JSON.stringify(updatedHistory),
      storageArea: localStorage
    }));

  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
};


export default function FeeCalculator() {
  // Inputs for Selling Price Calculator
  const [desiredPayoutInput, setDesiredPayoutInput] = useState<string>('');
  const [spCalcOfferOption, setSpCalcOfferOption] = useState<string>('0');
  const [spCalcCustomOffer, setSpCalcCustomOffer] = useState<string>('');

  // Items for Payout Calculator
  const [payoutItems, setPayoutItems] = useState<PayoutItem[]>([{ id: crypto.randomUUID(), sellingPrice: '', offerOption: '0', customOffer: '' }]);

  // Settings state
  const [feePercentage, setFeePercentage] = useState<number>(DEFAULT_FEE_PERCENTAGE);
  const [currencySymbol, setCurrencySymbol] = useState<string>(DEFAULT_CURRENCY_SYMBOL);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'selling-price' | 'payout'>('selling-price');

  // Calculated results state
  const [sellingPriceCalcResults, setSellingPriceCalcResults] = useState<{
    sellingPriceBeforeDiscount: number | null | typeof Infinity;
    customerPriceAfterDiscount: number | null | typeof Infinity;
    discountAmount: number | null;
    feeAmount: number | null | typeof Infinity;
    actualPayout: number | null | typeof Infinity;
  } | null>(null);

  const [payoutCalcResults, setPayoutCalcResults] = useState<{
    totalPayoutSellerReceives: number | null;
    totalDiscountAmount: number | null;
    totalFeeAmount: number | null;
    subtotalCustomerPrice: number | null; // Total price after discount for all items
  } | null>(null);

  // State to track if an initial calculation has been made for each tab
  const [hasCalculatedSellingPrice, setHasCalculatedSellingPrice] = useState(false);
  const [hasCalculatedPayout, setHasCalculatedPayout] = useState(false);


  // --- Effects ---

  // Load settings from localStorage on mount and listen for changes
  useEffect(() => {
    setIsLoadingSettings(true);
    const loadAndUpdateSettings = () => {
      // Client-side check
      if (typeof window === 'undefined') {
        setIsLoadingSettings(false);
        return;
      }

      try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        let settings: SettingsData = {
          feePercentage: DEFAULT_FEE_PERCENTAGE,
          currencySymbol: DEFAULT_CURRENCY_SYMBOL
        };

        if (storedSettings) {
           const parsedSettings = JSON.parse(storedSettings);
           // Validate and merge loaded settings
            if (parsedSettings.feePercentage !== undefined && typeof parsedSettings.feePercentage === 'number' && parsedSettings.feePercentage >= 0 && parsedSettings.feePercentage <= 1) {
              settings.feePercentage = parsedSettings.feePercentage;
            }
            if (parsedSettings.currencySymbol !== undefined && typeof parsedSettings.currencySymbol === 'string' && parsedSettings.currencySymbol.trim().length > 0 && parsedSettings.currencySymbol.length <= 5) {
              settings.currencySymbol = parsedSettings.currencySymbol.trim();
            } else if (parsedSettings.currencySymbol !== undefined) {
               // If currencySymbol exists but is invalid, log warning and use default
               console.warn("Invalid currency symbol found in settings, using default.");
            }
        }

        setFeePercentage(settings.feePercentage);
        setCurrencySymbol(settings.currencySymbol);

        // Ensure localStorage is up-to-date with potentially corrected/default values
        if (!storedSettings || JSON.stringify(settings) !== storedSettings) {
             localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }

      } catch (error) {
        console.error("Failed to load or parse settings from localStorage:", error);
        setFeePercentage(DEFAULT_FEE_PERCENTAGE);
        setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
        try {
          localStorage.removeItem(SETTINGS_STORAGE_KEY);
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
            feePercentage: DEFAULT_FEE_PERCENTAGE,
            currencySymbol: DEFAULT_CURRENCY_SYMBOL
          }));
        } catch (clearError) {
           console.error("Failed to clear/reset settings in localStorage after error:", clearError);
        }
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadAndUpdateSettings(); // Initial load

     const handleStorageChange = (event: StorageEvent) => {
       if (event.key === SETTINGS_STORAGE_KEY && event.newValue) {
          loadAndUpdateSettings(); // Reload settings on change
       } else if (event.key === null || (event.key === SETTINGS_STORAGE_KEY && !event.newValue)) {
          // Handle case where settings are cleared or removed
          setFeePercentage(DEFAULT_FEE_PERCENTAGE);
          setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
       }
     };

     window.addEventListener('storage', handleStorageChange);

     return () => {
       window.removeEventListener('storage', handleStorageChange);
     };

  }, []);

  // Derive discount percentage for Selling Price Calculator
  const spCalcDiscountPercentage = useMemo(() => {
    if (spCalcOfferOption === 'custom') {
      const parsed = parseFloat(spCalcCustomOffer);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed / 100; // Convert to decimal
      }
    } else {
      const parsedOption = parseFloat(spCalcOfferOption);
      if (!isNaN(parsedOption)) {
        return parsedOption / 100;
      }
    }
    return 0; // Default to 0% if invalid or none
  }, [spCalcOfferOption, spCalcCustomOffer]);

   // Helper to get discount percentage for a payout item
   const getPayoutItemDiscountPercentage = useCallback((item: PayoutItem) => {
    if (item.offerOption === 'custom') {
      const parsed = parseFloat(item.customOffer);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed / 100;
      }
    } else {
      const parsedOption = parseFloat(item.offerOption);
      if (!isNaN(parsedOption)) {
        return parsedOption / 100;
      }
    }
    return 0;
  }, []);


  // --- Calculation Logic ---

  // Calculation logic for 'Selling Price Calculator' tab
  const calculateSellingPriceLogic = useCallback((payoutInput: string, discount: number, fee: number) => {
      const desiredPayout = parseFloat(payoutInput); // This is the target amount the seller receives
      if (isNaN(desiredPayout) || desiredPayout < 0) {
         return { sellingPriceBeforeDiscount: null, customerPriceAfterDiscount: null, discountAmount: null, feeAmount: null, actualPayout: null };
      }

      // Denominator for calculating the price *after* discount required to hit the desired payout
      const payoutDenominator = (1 - fee);
      if (payoutDenominator <= 0 && desiredPayout > 0) {
        // Payout impossible if fee is 100% or more unless desired payout is 0
        return {
            sellingPriceBeforeDiscount: Infinity,
            customerPriceAfterDiscount: Infinity,
            discountAmount: Infinity,
            feeAmount: Infinity,
            actualPayout: -Infinity,
        };
      } else if (payoutDenominator <= 0 && desiredPayout === 0) {
        return {
             sellingPriceBeforeDiscount: 0,
             customerPriceAfterDiscount: 0,
             discountAmount: 0,
             feeAmount: 0,
             actualPayout: 0,
         };
      }

      // 1. Calculate the Price After Discount needed to achieve the Desired Payout
      // Desired Payout = Price_After_Discount * (1 - Fee)
      // Price_After_Discount = Desired Payout / (1 - Fee)
      const requiredPriceAfterDiscount = desiredPayout / payoutDenominator;

      // Denominator for calculating the Selling Price Before Discount from the required Price After Discount
      const spDenominator = (1 - discount);
       if (spDenominator <= 0 && requiredPriceAfterDiscount > 0) {
        // Cannot reach the required price after discount if the discount is 100% or more
         return {
             sellingPriceBeforeDiscount: Infinity,
             customerPriceAfterDiscount: Infinity, // Or requiredPriceAfterDiscount if you want to show it
             discountAmount: Infinity,
             feeAmount: Infinity, // Or requiredPriceAfterDiscount * fee if finite
             actualPayout: desiredPayout > 0 ? -Infinity : 0,
         };
       } else if (spDenominator <= 0 && requiredPriceAfterDiscount === 0) {
          return {
             sellingPriceBeforeDiscount: 0,
             customerPriceAfterDiscount: 0,
             discountAmount: 0,
             feeAmount: 0,
             actualPayout: 0,
         };
       }

      // 2. Calculate the Selling Price Before Discount
      // Price_After_Discount = Selling_Price_Before_Discount * (1 - Discount)
      // Selling_Price_Before_Discount = Price_After_Discount / (1 - Discount)
      const spBeforeDiscount = requiredPriceAfterDiscount / spDenominator;


      // 3. Recalculate intermediate values based on the determined SP_Before_Discount for display consistency
      const finalSpAfterDiscount = spBeforeDiscount * (1 - discount); // Customer pays this amount
      const finalDiscountAmt = spBeforeDiscount * discount; // Amount of discount given
      const finalFeeAmt = finalSpAfterDiscount * fee; // Fee on the discounted price
      const finalActualPayout = finalSpAfterDiscount - finalFeeAmt; // Final check, should match desiredPayout


       // Handle potential floating point inaccuracies and ensure non-negative results
       const finalSpBeforeDiscount = Math.max(0, spBeforeDiscount);
       const finalSpAfterDiscountClamped = Math.max(0, finalSpAfterDiscount);
       const finalDiscountAmtClamped = Math.max(0, finalDiscountAmt);
       const finalFeeAmtClamped = Math.max(0, finalFeeAmt);
       // Recalculate final payout based on rounded values to be precise
       const finalActualPayoutResult = Math.max(0, finalSpAfterDiscountClamped - finalFeeAmtClamped);

       // Return results, handling Infinity where necessary
       const infiniteCheck = (val: number) => isFinite(val) ? val : Infinity;

      return {
        sellingPriceBeforeDiscount: infiniteCheck(finalSpBeforeDiscount),
        customerPriceAfterDiscount: infiniteCheck(finalSpAfterDiscountClamped), // This is what customer pays
        discountAmount: infiniteCheck(finalDiscountAmtClamped),
        feeAmount: infiniteCheck(finalFeeAmtClamped), // Fee based on customer price
        actualPayout: infiniteCheck(finalActualPayoutResult) // Should match desiredPayout input
      };
  }, []);


 // Calculation logic for 'Payout Calculator' tab (multiple items)
 const calculatePayoutLogic = useCallback((items: PayoutItem[], fee: number) => {
    let totalPayoutSellerReceives = 0;
    let totalDiscountAmount = 0;
    let totalFeeAmount = 0;
    let subtotalCustomerPrice = 0;
    let invalidInput = false;

    items.forEach(item => {
        const spBeforeDiscount = parseFloat(item.sellingPrice);
        if (isNaN(spBeforeDiscount) || spBeforeDiscount < 0) {
            invalidInput = true;
            return; // Skip this item if input is invalid
        }

        const discount = getPayoutItemDiscountPercentage(item);

        // Calculate Discount Amount (based on SP Before Discount)
        const discountAmt = spBeforeDiscount * discount;

        // Calculate Price After Discount (what the customer pays for this item)
        const priceAfterDiscount = spBeforeDiscount * (1 - discount);

        // Calculate Fee Amount (based on the Price *After* the discount for this item)
        const feeAmt = priceAfterDiscount * fee;

        // Calculate Seller Payout (Price After Discount - Fee Amount for this item)
        const sellerReceives = priceAfterDiscount - feeAmt;

        // Accumulate totals
        totalPayoutSellerReceives += Math.max(0, sellerReceives);
        totalDiscountAmount += Math.max(0, discountAmt);
        totalFeeAmount += Math.max(0, feeAmt);
        subtotalCustomerPrice += Math.max(0, priceAfterDiscount);
    });

    if (invalidInput && items.length === 1 && items[0].sellingPrice === '') {
        // If the only item is empty, treat as null result
        return { totalPayoutSellerReceives: null, totalDiscountAmount: null, totalFeeAmount: null, subtotalCustomerPrice: null };
    }


    return {
        totalPayoutSellerReceives: totalPayoutSellerReceives,
        totalDiscountAmount: totalDiscountAmount,
        totalFeeAmount: totalFeeAmount,
        subtotalCustomerPrice: subtotalCustomerPrice
    };
 }, [getPayoutItemDiscountPercentage]); // Dependency


  // --- Event Handlers ---

  const handleDesiredPayoutInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDesiredPayoutInput(value);
      // Reset calculation results if input is cleared or becomes invalid implicitly
      if (value === '' || isNaN(parseFloat(value))) {
         setSellingPriceCalcResults(null);
         setHasCalculatedSellingPrice(false);
      }
    }
  };

  const handleSpCalcOfferOptionChange = (value: string) => {
      setSpCalcOfferOption(value);
      // Clear custom input if a predefined option is selected
      if (value !== 'custom') {
          setSpCalcCustomOffer('');
      }
      // Auto-recalculation handled by effect
  };

  const handleSpCalcCustomOfferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || (numericValue >= 0 && numericValue <= 100)) {
         setSpCalcCustomOffer(value);
      } else if (numericValue < 0) {
          setSpCalcCustomOffer('0');
      } else if (numericValue > 100) {
          setSpCalcCustomOffer('100');
      }
      // Auto-recalculation handled by effect
    }
  };


   // Handlers for Payout Calculator Items
  const handlePayoutItemChange = (id: string, field: keyof PayoutItem, value: string) => {
      setPayoutItems(prevItems =>
          prevItems.map(item => {
              if (item.id === id) {
                  let updatedValue = value;
                  // Input validation specific to fields
                  if (field === 'sellingPrice' && !(value === '' || /^\d*\.?\d*$/.test(value))) {
                    return item; // Invalid input, don't update
                  }
                   if (field === 'customOffer' && !(value === '' || /^\d*\.?\d*$/.test(value))) {
                     return item; // Invalid input
                   }
                   if (field === 'customOffer') {
                     const numericValue = parseFloat(value);
                      if (isNaN(numericValue) || (numericValue >= 0 && numericValue <= 100)) {
                         updatedValue = value;
                      } else if (numericValue < 0) {
                         updatedValue = '0';
                      } else if (numericValue > 100) {
                         updatedValue = '100';
                      } else {
                         updatedValue = ''; // Reset if just a decimal point or invalid start
                      }
                   }


                  const newItem = { ...item, [field]: updatedValue };

                   // If offerOption changed away from 'custom', clear customOffer
                   if (field === 'offerOption' && value !== 'custom') {
                     newItem.customOffer = '';
                   }

                  // Reset calculation results if input becomes invalid implicitly
                   if (field === 'sellingPrice' && (value === '' || isNaN(parseFloat(value)))) {
                      setPayoutCalcResults(null);
                      setHasCalculatedPayout(false);
                   }

                   return newItem;
              }
              return item;
          })
      );
      // Reset payout results when any item changes, requiring recalculation
      setPayoutCalcResults(null);
      setHasCalculatedPayout(false);
  };

  const addPayoutItem = () => {
      setPayoutItems(prevItems => [
          ...prevItems,
          { id: crypto.randomUUID(), sellingPrice: '', offerOption: '0', customOffer: '' }
      ]);
       setPayoutCalcResults(null); // Reset results when structure changes
       setHasCalculatedPayout(false);
  };

  const removePayoutItem = (id: string) => {
      setPayoutItems(prevItems => prevItems.filter(item => item.id !== id));
       setPayoutCalcResults(null); // Reset results when structure changes
       setHasCalculatedPayout(false);
  };


   const handleTabChange = (value: string) => {
     const newTab = value as 'selling-price' | 'payout';
     setActiveTab(newTab);
     // Clear inputs for the Selling Price tab
     setDesiredPayoutInput('');
     setSpCalcOfferOption('0');
     setSpCalcCustomOffer('');
     // Reset items for the Payout tab to a single empty item
     setPayoutItems([{ id: crypto.randomUUID(), sellingPrice: '', offerOption: '0', customOffer: '' }]);
     // Reset calculated results and flags
     setSellingPriceCalcResults(null);
     setPayoutCalcResults(null);
     setHasCalculatedSellingPrice(false);
     setHasCalculatedPayout(false);
   };

  // Calculate and potentially add to history on button click for 'selling-price' tab
  const handleCalculateSellingPrice = useCallback(() => {
    const results = calculateSellingPriceLogic(desiredPayoutInput, spCalcDiscountPercentage, feePercentage);
    setSellingPriceCalcResults(results); // Update display state
    setHasCalculatedSellingPrice(true); // Mark that calculation has been done

    // Add to history only on explicit calculation and if results are valid numbers
    if (
      results.sellingPriceBeforeDiscount !== null &&
      results.customerPriceAfterDiscount !== null &&
      results.feeAmount !== null &&
      results.actualPayout !== null && // Ensure actualPayout is valid too
      !isLoadingSettings &&
      isFinite(results.sellingPriceBeforeDiscount) &&
      isFinite(results.customerPriceAfterDiscount) &&
      isFinite(results.feeAmount) &&
      isFinite(results.actualPayout) // Ensure actualPayout is finite
    ) {
      const payoutInput = parseFloat(desiredPayoutInput);
      if (!isNaN(payoutInput) && payoutInput >= 0) {
        addHistoryEntry({
          type: 'selling-price',
          input: payoutInput, // This is the Desired Payout used as input basis
          feePercentage: feePercentage,
          discountPercentage: spCalcDiscountPercentage,
          fee: results.feeAmount, // Fee calculated on final price
          result: results.sellingPriceBeforeDiscount, // SP Before Discount
          discountAmount: results.discountAmount ?? 0,
          finalPrice: results.customerPriceAfterDiscount, // Customer Pays
          currencySymbol: currencySymbol,
        });
      }
    }
  }, [
    desiredPayoutInput,
    spCalcDiscountPercentage,
    feePercentage,
    currencySymbol,
    isLoadingSettings,
    calculateSellingPriceLogic, // Dependency
  ]);

  // Calculate payout on button click for 'payout' tab
  const handleCalculatePayout = useCallback(() => {
     const results = calculatePayoutLogic(payoutItems, feePercentage);
     setPayoutCalcResults(results); // Update display state
     setHasCalculatedPayout(true); // Mark that calculation has been done

      // Add to history only on explicit calculation and if results are valid numbers
     if (
        results.totalPayoutSellerReceives !== null &&
        results.totalDiscountAmount !== null &&
        results.totalFeeAmount !== null &&
        results.subtotalCustomerPrice !== null &&
        !isLoadingSettings &&
        isFinite(results.totalPayoutSellerReceives) &&
        isFinite(results.totalDiscountAmount) &&
        isFinite(results.totalFeeAmount) &&
        isFinite(results.subtotalCustomerPrice)
     ) {
        // Calculate the sum of selling prices before discount as the 'input' for history
        const totalSPBeforeDiscount = payoutItems.reduce((sum, item) => {
             const sp = parseFloat(item.sellingPrice);
             return sum + (isNaN(sp) ? 0 : sp);
        }, 0);

         // Check if there's at least one valid item before saving
        if (payoutItems.some(item => item.sellingPrice !== '' && !isNaN(parseFloat(item.sellingPrice)))) {
           addHistoryEntry({
             type: 'payout',
             input: totalSPBeforeDiscount, // Sum of Selling Prices Before Discount
             feePercentage: feePercentage,
             // Overall discount percentage (approximate) - can be complex to define uniquely
             discountPercentage: results.totalDiscountAmount !== null && results.subtotalCustomerPrice !== null && (results.subtotalCustomerPrice + results.totalDiscountAmount) > 0 ? results.totalDiscountAmount / (results.subtotalCustomerPrice + results.totalDiscountAmount) : 0,
             fee: results.totalFeeAmount ?? 0, // Total Fee
             result: results.totalPayoutSellerReceives, // Total Payout Received
             discountAmount: results.totalDiscountAmount ?? 0, // Total Discount Amount
             finalPrice: results.subtotalCustomerPrice ?? 0, // Subtotal Customer Pays
             currencySymbol: currencySymbol,
             // Optionally include item details if needed, but keep history structure simple for now
             // items: payoutItems.map(p => ({
             //     sellingPrice: parseFloat(p.sellingPrice) || 0,
             //     offerPercentage: getPayoutItemDiscountPercentage(p)
             // }))
           });
        }
     }


  }, [
    payoutItems,
    feePercentage,
    currencySymbol, // Needed for saving history
    isLoadingSettings,
    calculatePayoutLogic, // Dependency
    getPayoutItemDiscountPercentage, // Needed for potential item detail saving (currently commented out)
  ]);

  // --- Auto-Recalculation Effect ---
  useEffect(() => {
    // Prevent infinite loops by checking if a calculation has already been performed
    // for the current inputs. This effect should only run automatically *after* the
    // initial button click, or when dependent values change *after* the button click.
    if (isLoadingSettings) return;

    if (activeTab === 'selling-price' && hasCalculatedSellingPrice && desiredPayoutInput) {
      const results = calculateSellingPriceLogic(desiredPayoutInput, spCalcDiscountPercentage, feePercentage);
       // Check if results actually changed before setting state to prevent loops
       if (JSON.stringify(results) !== JSON.stringify(sellingPriceCalcResults)) {
            setSellingPriceCalcResults(results);
            // DO NOT add to history here automatically
       }
    } else if (activeTab === 'payout' && hasCalculatedPayout && payoutItems.some(item => item.sellingPrice !== '')) {
       // Recalculate payout only if inputs change AFTER initial calculation
       const results = calculatePayoutLogic(payoutItems, feePercentage);
       if (JSON.stringify(results) !== JSON.stringify(payoutCalcResults)) {
           setPayoutCalcResults(results);
           // DO NOT add to history here automatically
       }
    }
}, [
    desiredPayoutInput, // Input value for SP tab
    spCalcDiscountPercentage, // Derived discount for SP tab
    payoutItems, // Item array for Payout tab
    feePercentage, // Global setting
    activeTab, // Current active tab
    isLoadingSettings, // Wait for settings
    hasCalculatedSellingPrice, // Flag for SP tab initial calc
    hasCalculatedPayout, // Flag for Payout tab initial calc
    calculateSellingPriceLogic, // Calculation function dependency
    calculatePayoutLogic, // Calculation function dependency
    sellingPriceCalcResults, // Current results to prevent loop (SP tab)
    payoutCalcResults, // Current results to prevent loop (Payout tab)
]);



  // --- Helper Functions ---

  const formatCurrency = (value: number | null | typeof Infinity, symbol?: string) => {
    const sym = symbol || currencySymbol; // Use provided symbol or default
    if (value === null || value === undefined) return '-';
    if (value === Infinity) return 'N/A'; // Handle Infinity explicitly
    if (value === -Infinity) return '- N/A'; // Handle negative Infinity

    const numberValue = Number(value);
    if (isNaN(numberValue)) return '-';

    // Handle negative zero
    if (Object.is(numberValue, -0)) {
        return `${sym} 0.00`;
    }
    // Format other numbers
    return `${sym} ${numberValue.toFixed(2)}`;
};


  const displayFeePercentage = (feePercentage * 100).toFixed(1);
  const displayDiscountPercentage = (discount: number) => (discount * 100).toFixed(1);


  // --- Render ---

  return (
    <TooltipProvider>
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Uber Eats Price Calculator</CardTitle>
          <CardDescription>
            Calculate selling prices and payouts in {isLoadingSettings ? '...' : currencySymbol} with fee and optional offer.
            Current Fee: {isLoadingSettings ? '...' : `${displayFeePercentage}%`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings ? (
            <div className="flex justify-center items-center h-48">
              <p className="text-muted-foreground">Loading settings...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="selling-price">
                  <CircleDollarSign className="h-4 w-4 mr-2"/> Selling Price Calculator
                </TabsTrigger>
                <TabsTrigger value="payout">
                   <HandCoins className="h-4 w-4 mr-2"/> Payout Calculator
                </TabsTrigger>
              </TabsList>

              {/* Selling Price Calculator Tab */}
              <TabsContent value="selling-price" className="mt-6 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"> {/* Use items-end, stack on small screens */}
                    {/* Desired Payout Input (Takes 2 columns on medium+ screens) */}
                    <div className="space-y-2 sm:col-span-2">
                       <Label htmlFor="desired-payout-input" className="flex items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-muted-foreground" /> {/* Icon */}
                          Desired Payout
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">The final amount you want the seller to receive *after* the discount and the fee (calculated on the discounted price) are deducted.</p>
                              </TooltipContent>
                          </Tooltip>
                       </Label>
                       <Input
                          id="desired-payout-input"
                          type="text"
                          inputMode="decimal"
                          placeholder={`${currencySymbol} e.g., 700.00`}
                          value={desiredPayoutInput}
                          onChange={handleDesiredPayoutInputChange}
                          className="bg-secondary focus:ring-accent text-base"
                          aria-label="Desired Payout (Seller Receives)"
                       />
                    </div>

                    {/* Offer Dropdown (Takes 1 column on medium+ screens) */}
                    <div className="space-y-2">
                       <Label htmlFor="discount-select-selling-price" className="flex items-center gap-2">
                         <Tag className="h-4 w-4 text-muted-foreground" />
                         Offer (%)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">Select or enter the discount percentage (0-100) offered to the customer. Applied to 'Selling Price (Before Discount)'.</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <Select value={spCalcOfferOption} onValueChange={handleSpCalcOfferOptionChange}>
                          <SelectTrigger id="discount-select-selling-price" className="bg-secondary focus:ring-accent text-base w-full">
                             <SelectValue placeholder="Select offer..." />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="0">0% (No Offer)</SelectItem>
                             <SelectItem value="20">20%</SelectItem>
                             <SelectItem value="30">30%</SelectItem>
                             <SelectItem value="40">40%</SelectItem>
                             <SelectItem value="50">50%</SelectItem>
                             <SelectItem value="75">75%</SelectItem>
                             <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                  {/* Custom Discount Input - Conditionally Rendered */}
                 {spCalcOfferOption === 'custom' && (
                    <div className="space-y-2">
                       <Label htmlFor="custom-discount-input-selling-price" className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          Custom Offer Percentage
                       </Label>
                       <Input
                          id="custom-discount-input-selling-price"
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 15.5 (0-100)"
                          value={spCalcCustomOffer}
                          onChange={handleSpCalcCustomOfferChange}
                          className="bg-secondary focus:ring-accent text-base"
                          aria-label="Custom Offer Percentage"
                       />
                    </div>
                 )}

                {/* Calculate Button */}
                 <Button onClick={handleCalculateSellingPrice} className="w-full">
                   <Calculator className="mr-2 h-4 w-4" /> Calculate Selling Price
                 </Button>

                {/* Result Box for 'selling-price' */}
                <div className="space-y-3 rounded-lg border bg-background p-3"> {/* Reduced padding */}
                    {/* Selling Price Before Discount - HIGHLIGHTED */}
                    <div className="flex flex-wrap justify-between items-center gap-1"> {/* Allow wrapping */}
                       <Label className="flex items-center gap-2 font-medium text-base flex-shrink-0"> {/* Increased font size, prevent shrink */}
                          <span className="font-semibold inline-block min-w-6 text-center text-primary">{currencySymbol}</span> {/* Changed color */}
                          Selling Price (Before Discount)
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                 <p className="text-xs">The base price needed before any customer discount. Calculated based on your 'Desired Payout'.</p>
                              </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("text-xl font-bold text-right", sellingPriceCalcResults?.sellingPriceBeforeDiscount !== null ? "text-primary" : "text-muted-foreground")}> {/* Increased size and boldness, changed color, text-right */}
                         {formatCurrency(sellingPriceCalcResults?.sellingPriceBeforeDiscount ?? null)}
                       </span>
                     </div>

                      {/* Combined Discount / Offer */}
                      {spCalcDiscountPercentage > 0 && (
                        <div className="flex flex-wrap justify-between items-center gap-1">
                          <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground flex-shrink-0">
                            <Minus className="h-4 w-4" />
                            Offer ({displayDiscountPercentage(spCalcDiscountPercentage)}%)
                          </Label>
                          <span className="font-semibold text-sm text-muted-foreground text-right">
                            {formatCurrency(sellingPriceCalcResults?.discountAmount ?? null)}
                          </span>
                        </div>
                      )}

                     {/* Final Customer Price - De-emphasized */}
                     <div className="flex flex-wrap justify-between items-center gap-1">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground flex-shrink-0"> {/* Muted color */}
                         <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                         Final Price (Customer Pays)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">Selling Price (Before Discount) * (1 - Offer %).</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm text-muted-foreground text-right", sellingPriceCalcResults?.customerPriceAfterDiscount !== null ? "" : "text-muted-foreground")}> {/* Muted color */}
                         {formatCurrency(sellingPriceCalcResults?.customerPriceAfterDiscount ?? null)}
                       </span>
                     </div>

                     {/* Combined Uber Fee */}
                     <div className="flex flex-wrap justify-between items-center gap-1">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground flex-shrink-0">
                         <Minus className="h-4 w-4" />
                         Uber Fee ({displayFeePercentage}%)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">Calculated based on the 'Final Price (Customer Pays)'.</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm text-muted-foreground text-right", sellingPriceCalcResults?.feeAmount !== null ? "" : "text-muted-foreground")}>
                         {formatCurrency(sellingPriceCalcResults?.feeAmount ?? null)}
                       </span>
                     </div>

                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>


                     {/* Actual Payout (Seller Receives) - Keep Highlighted */}
                     <div className="flex flex-wrap justify-between items-center gap-1">
                       <Label className="flex items-center gap-2 font-medium text-sm flex-shrink-0">
                         <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                         Actual Payout (Seller Receives)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">This is the final amount the seller receives. Calculated as: Final Price (Customer Pays) - Uber Fee. Should match your 'Desired Payout' input.</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className="text-lg font-bold text-accent text-right">
                         {formatCurrency(sellingPriceCalcResults?.actualPayout ?? null)}
                       </span>
                     </div>
                  </div>

                  {/* History Section for Selling Price */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3 text-center">Calculation History</h3>
                    <HistoryView filterType="selling-price" />
                  </div>
              </TabsContent>

              {/* Payout Calculator Tab */}
              <TabsContent value="payout" className="mt-6 space-y-6">
                 {/* Item List */}
                 {payoutItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4 relative bg-secondary/50">
                      {/* Item Number */}
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                         <Hash className="h-4 w-4"/> Item #{index + 1}
                      </div>

                      {/* Remove Button (only if more than one item) */}
                       {payoutItems.length > 1 && (
                           <Button
                             variant="ghost"
                             size="icon"
                             className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                             onClick={() => removePayoutItem(item.id)}
                             aria-label="Remove Item"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         )}

                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"> {/* Responsive grid */}
                           {/* Selling Price Input (Takes 2 columns on medium+ screens) */}
                           <div className="space-y-2 sm:col-span-2">
                             <Label htmlFor={`selling-price-${item.id}`} className="flex items-center gap-2">
                                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                                Selling Price (Before Discount)
                             </Label>
                             <Input
                               id={`selling-price-${item.id}`}
                               type="text"
                               inputMode="decimal"
                               placeholder={`${currencySymbol} e.g., 1000.00`}
                               value={item.sellingPrice}
                               onChange={(e) => handlePayoutItemChange(item.id, 'sellingPrice', e.target.value)}
                               className="bg-background focus:ring-accent text-base" // Changed bg
                               aria-label="Selling Price (Before Discount)"
                             />
                           </div>

                           {/* Offer Dropdown (Takes 1 column on medium+ screens) */}
                           <div className="space-y-2">
                             <Label htmlFor={`offer-select-${item.id}`} className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                                Offer (%)
                             </Label>
                             <Select
                               value={item.offerOption}
                               onValueChange={(value) => handlePayoutItemChange(item.id, 'offerOption', value)}
                             >
                               <SelectTrigger id={`offer-select-${item.id}`} className="bg-background focus:ring-accent text-base w-full">
                                 <SelectValue placeholder="Select offer..." />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="0">0%</SelectItem>
                                 <SelectItem value="20">20%</SelectItem>
                                 <SelectItem value="30">30%</SelectItem>
                                 <SelectItem value="40">40%</SelectItem>
                                 <SelectItem value="50">50%</SelectItem>
                                 <SelectItem value="75">75%</SelectItem>
                                 <SelectItem value="custom">Custom</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </div>

                         {/* Custom Offer Input - Conditionally Rendered */}
                         {item.offerOption === 'custom' && (
                           <div className="space-y-2">
                             <Label htmlFor={`custom-offer-${item.id}`} className="flex items-center gap-2">
                               <Percent className="h-4 w-4 text-muted-foreground" />
                               Custom Offer Percentage
                             </Label>
                             <Input
                               id={`custom-offer-${item.id}`}
                               type="text"
                               inputMode="decimal"
                               placeholder="e.g., 15.5 (0-100)"
                               value={item.customOffer}
                               onChange={(e) => handlePayoutItemChange(item.id, 'customOffer', e.target.value)}
                               className="bg-background focus:ring-accent text-base" // Changed bg
                               aria-label="Custom Offer Percentage"
                             />
                           </div>
                         )}
                    </div>
                 ))}

                 {/* Add Item Button */}
                 <Button variant="outline" onClick={addPayoutItem} className="w-full">
                   <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                 </Button>

                {/* Calculate Button */}
                 <Button onClick={handleCalculatePayout} className="w-full">
                   <Calculator className="mr-2 h-4 w-4" /> Calculate Total Payout
                 </Button>

                {/* Result Box for 'payout' */}
                 <div className="space-y-3 rounded-lg border bg-background p-3"> {/* Reduced padding */}
                     {/* Subtotal Customer Price - HIGHLIGHTED */}
                     <div className="flex flex-wrap justify-between items-center gap-1">
                       <Label className="flex items-center gap-2 font-medium text-base text-primary flex-shrink-0"> {/* Increased size, primary color */}
                         <span className="font-semibold inline-block min-w-6 text-center text-primary">{currencySymbol}</span>
                         Subtotal (Customer Pays)
                          <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">Sum of (Selling Price * (1 - Offer %)) for all items.</p>
                             </TooltipContent>
                          </Tooltip>
                       </Label>
                       <span className={cn("text-xl font-bold text-primary text-right", payoutCalcResults?.subtotalCustomerPrice !== null ? "" : "text-muted-foreground")}> {/* Increased size, bold, primary color */}
                         {formatCurrency(payoutCalcResults?.subtotalCustomerPrice ?? null)}
                       </span>
                     </div>

                     {/* Combined Total Discount */}
                     {payoutItems.some(item => getPayoutItemDiscountPercentage(item) > 0) && (
                        <div className="flex flex-wrap justify-between items-center gap-1">
                           <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground flex-shrink-0">
                              <Minus className="h-4 w-4" />
                              Total Discount Given
                           </Label>
                           <span className="font-semibold text-sm text-muted-foreground text-right">
                              {formatCurrency(payoutCalcResults?.totalDiscountAmount ?? null)}
                           </span>
                        </div>
                     )}

                     {/* Combined Total Uber Fee */}
                     <div className="flex flex-wrap justify-between items-center gap-1">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground flex-shrink-0">
                          <Minus className="h-4 w-4" />
                          Total Uber Fee ({displayFeePercentage}%)
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                 <p className="text-xs">Calculated based on the 'Subtotal (Customer Pays)'.</p>
                              </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm text-muted-foreground text-right", payoutCalcResults?.totalFeeAmount !== null ? "" : "text-muted-foreground")}>
                          {formatCurrency(payoutCalcResults?.totalFeeAmount ?? null)}
                       </span>
                     </div>


                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>

                    {/* Total Payout (Seller Receives) - Keep Highlighted */}
                    <div className="flex flex-wrap justify-between items-center gap-1">
                     <Label className="flex items-center gap-2 font-medium text-sm flex-shrink-0">
                       <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                       Total Payout (Seller Receives)
                       <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">Sum of payouts for all items after discounts and fees.</p>
                           </TooltipContent>
                        </Tooltip>
                     </Label>
                     <span className="text-lg font-bold text-accent text-right">
                        {formatCurrency(payoutCalcResults?.totalPayoutSellerReceives ?? null)}
                     </span>
                   </div>

                 </div>
                  {/* History Section for Payout */}
                 <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-3 text-center">Calculation History</h3>
                    <HistoryView filterType="payout" />
                 </div>
                 {/*
                  <div className="mt-8 text-center text-muted-foreground">
                    <p>(Payout history is not currently saved)</p>
                 </div>
                 */}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
