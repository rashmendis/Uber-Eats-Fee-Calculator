
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Tag, Info, Calculator, CircleDollarSign, HandCoins, ReceiptText } from 'lucide-react'; // Removed Plus, Minus, TrendingUp, TrendingDown
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

// Function to add history entry directly to localStorage
const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
  // Ensure this code only runs on the client
  if (typeof window === 'undefined') return;

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
      if (
        lastEntry.type === newEntry.type &&
        lastEntry.input === newEntry.input &&
        lastEntry.result === newEntry.result &&
        lastEntry.feePercentage === newEntry.feePercentage &&
        lastEntry.discountPercentage === newEntry.discountPercentage &&
        lastEntry.finalPrice === newEntry.finalPrice // Also check final price for duplicates
      ) {
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
  // Inputs
  const [desiredPayoutInput, setDesiredPayoutInput] = useState<string>(''); // Used in "Selling Price Calculator"
  const [sellingPriceBeforeDiscountInput, setSellingPriceBeforeDiscountInput] = useState<string>(''); // Used in "Payout Calculator"

  // Discount/Offer state
  const [selectedDiscountOption, setSelectedDiscountOption] = useState<string>('0'); // '0', '20', '30', '40', '50', '75', 'custom'
  const [customDiscountInput, setCustomDiscountInput] = useState<string>(''); // State for custom discount input

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
    actualPayout: number | null | typeof Infinity; // Updated calculation
  } | null>(null);

  const [payoutCalcResults, setPayoutCalcResults] = useState<{
    payoutSellerReceives: number | null;
    discountAmount: number | null;
    feeAmount: number | null;
    finalCustomerPrice: number | null; // Price after discount
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

  // Derive discount percentage based on selected option and custom input
  const discountPercentage = useMemo(() => {
    if (selectedDiscountOption === 'custom') {
      const parsed = parseFloat(customDiscountInput);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed / 100; // Convert to decimal
      }
    } else {
      const parsedOption = parseFloat(selectedDiscountOption);
      if (!isNaN(parsedOption)) {
        return parsedOption / 100;
      }
    }
    return 0; // Default to 0% if invalid or none
  }, [selectedDiscountOption, customDiscountInput]);

  // --- Calculation Logic ---

  // Calculation logic for 'Selling Price Calculator' tab
  // Input: Desired Payout (X)
  // Output: Selling Price (Before Discount), Customer Price (After Discount), Discount Amount, Fee Amount, Actual Payout
  const calculateSellingPriceLogic = useCallback((payoutInput: string, discount: number, fee: number) => {
      const desiredPayout = parseFloat(payoutInput); // X
      if (isNaN(desiredPayout) || desiredPayout < 0) {
         return { sellingPriceBeforeDiscount: null, customerPriceAfterDiscount: null, discountAmount: null, feeAmount: null, actualPayout: null };
      }

      // Handle 100% fee edge case to avoid division by zero or negative results if fee >= 1
      if (fee >= 1) {
        // If the fee is 100% or more, payout is impossible unless the desired payout is 0.
        // If desired payout is 0, SP can be 0.
        // If desired payout > 0, SP would need to be infinite.
        const isInfinite = desiredPayout > 0;
        return {
          sellingPriceBeforeDiscount: isInfinite ? Infinity : 0,
          customerPriceAfterDiscount: isInfinite ? Infinity : 0,
          discountAmount: isInfinite ? Infinity : 0,
          feeAmount: isInfinite ? Infinity : 0,
          actualPayout: isInfinite ? -Infinity : 0 // Payout becomes negative infinity or 0
        };
      }

      // Calculate the Selling Price Before Discount needed to achieve the Desired Payout *after* both Fee and Discount are considered.
      // Actual Payout = Customer Price * (1 - Fee)
      // Customer Price = SP_Before_Discount * (1 - Discount)
      // Actual Payout = (SP_Before_Discount * (1 - Discount)) * (1 - Fee)
      // Desired Payout = (SP_Before_Discount * (1 - Discount)) * (1 - Fee)
      // SP_Before_Discount = Desired Payout / ((1 - Discount) * (1 - Fee))

      // Denominator for SP calculation
      const denominator = (1 - discount) * (1 - fee);

      // Check for division by zero if discount or fee effectively makes the denominator zero
      if (denominator <= 0 && desiredPayout > 0) {
          // Payout impossible if denominator is zero or negative, unless desired payout is also 0
          return {
              sellingPriceBeforeDiscount: Infinity,
              customerPriceAfterDiscount: Infinity,
              discountAmount: Infinity,
              feeAmount: Infinity,
              actualPayout: -Infinity, // Or indicate impossibility differently
          };
      } else if (denominator <= 0 && desiredPayout === 0) {
         // If desired payout is 0 and denominator is 0 or negative, SP can be 0
         return {
             sellingPriceBeforeDiscount: 0,
             customerPriceAfterDiscount: 0,
             discountAmount: 0,
             feeAmount: 0,
             actualPayout: 0,
         };
      }

      const spBeforeDiscount = desiredPayout / denominator;

      // Calculate Customer Price (After Discount) - This is what the customer actually pays
      const spAfterDiscount = spBeforeDiscount * (1 - discount); // Customer pays this

      // Calculate Discount Amount (based on SP Before Discount)
      const discountAmt = spBeforeDiscount * discount;

      // Calculate Fee Amount (based on the Price *After* the discount)
      const feeAmt = spAfterDiscount * fee;

      // Calculate Actual Payout (Seller Receives) = Price After Discount - Fee Amount
      // This should match the desiredPayout input due to how spBeforeDiscount was calculated.
      const actualPayoutResult = spAfterDiscount - feeAmt;

      // Handle potential floating point inaccuracies and ensure non-negative results
      const finalSpBeforeDiscount = Math.max(0, spBeforeDiscount);
      const finalSpAfterDiscount = Math.max(0, spAfterDiscount);
      const finalDiscountAmt = Math.max(0, discountAmt);
      const finalFeeAmt = Math.max(0, feeAmt);
      // Recalculate final payout based on rounded values to be precise
      const finalActualPayoutResult = Math.max(0, finalSpAfterDiscount - finalFeeAmt);


       // Return results, handling Infinity where necessary
       const infiniteCheck = (val: number) => isFinite(val) ? val : Infinity;

      return {
        sellingPriceBeforeDiscount: infiniteCheck(finalSpBeforeDiscount),
        customerPriceAfterDiscount: infiniteCheck(finalSpAfterDiscount),
        discountAmount: infiniteCheck(finalDiscountAmt),
        feeAmount: infiniteCheck(finalFeeAmt),
        actualPayout: infiniteCheck(finalActualPayoutResult) // This should closely match desiredPayout
      };
  }, []);


  // Calculation logic for 'Payout Calculator' tab
  // Input: Selling Price (Before Discount), Discount %, Fee %
  // Output: Payout (Seller Receives), Customer Price (After Discount), Discount Amount, Fee Amount
  const calculatePayoutLogic = useCallback((spInput: string, discount: number, fee: number) => {
      // The input 'spInput' is the Selling Price *Before* any discount is applied
      const spBeforeDiscount = parseFloat(spInput);

      if (isNaN(spBeforeDiscount) || spBeforeDiscount < 0) {
          return { payoutSellerReceives: null, discountAmount: null, feeAmount: null, finalCustomerPrice: null };
      }

      // Calculate Discount Amount (based on SP Before Discount)
      const discountAmt = spBeforeDiscount * discount;

      // Calculate Price After Discount (what the customer pays)
      const priceAfterDiscount = spBeforeDiscount * (1 - discount);

      // Calculate Fee Amount (based on the Price *After* the discount)
      const feeAmt = priceAfterDiscount * fee;

      // Calculate Seller Payout (Price After Discount - Fee Amount)
      const sellerReceives = priceAfterDiscount - feeAmt;

      // Ensure results are not negative due to floating point issues
      const finalSellerReceives = Math.max(0, sellerReceives);
      const finalDiscountAmt = Math.max(0, discountAmt);
      const finalFeeAmt = Math.max(0, feeAmt);
      const finalCustomerPrice = Math.max(0, priceAfterDiscount);

      return {
          payoutSellerReceives: finalSellerReceives,
          discountAmount: finalDiscountAmt,
          feeAmount: finalFeeAmt,
          finalCustomerPrice: finalCustomerPrice // This is the Price After Discount
      };
  }, []);

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

  const handleSellingPriceBeforeDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow empty or valid decimal numbers
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellingPriceBeforeDiscountInput(value);
       // Reset calculation results if input is cleared or becomes invalid implicitly
       if (value === '' || isNaN(parseFloat(value))) {
          setPayoutCalcResults(null);
          setHasCalculatedPayout(false);
       }
    }
  };

  const handleDiscountOptionChange = (value: string) => {
      setSelectedDiscountOption(value);
      // Clear custom input if a predefined option is selected
      if (value !== 'custom') {
          setCustomDiscountInput('');
      }
      // Auto-recalculation is handled by useEffect below
  };

  const handleCustomDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, or numbers (including decimals) between 0 and 100
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || (numericValue >= 0 && numericValue <= 100)) {
         setCustomDiscountInput(value);
      } else if (numericValue < 0) {
          setCustomDiscountInput('0');
      } else if (numericValue > 100) {
          setCustomDiscountInput('100');
      }
      // Auto-recalculation is handled by useEffect below
    }
  };


   const handleTabChange = (value: string) => {
     const newTab = value as 'selling-price' | 'payout';
     setActiveTab(newTab);
     // Clear inputs when switching tabs
     setDesiredPayoutInput('');
     setSellingPriceBeforeDiscountInput('');
     // Reset calculated results and flags when switching tabs
     setSellingPriceCalcResults(null);
     setPayoutCalcResults(null);
     setHasCalculatedSellingPrice(false);
     setHasCalculatedPayout(false);
     // Reset discount selection to '0%' and clear custom input
     setSelectedDiscountOption('0');
     setCustomDiscountInput('');
   };

  // Calculate and add to history on button click for 'selling-price' tab
  const handleCalculateSellingPrice = useCallback(() => {
    const results = calculateSellingPriceLogic(desiredPayoutInput, discountPercentage, feePercentage);
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
          discountPercentage: discountPercentage,
          fee: results.feeAmount, // Fee calculated on final price
          result: results.sellingPriceBeforeDiscount, // SP Before Discount
          discountAmount: results.discountAmount ?? 0,
          finalPrice: results.customerPriceAfterDiscount, // Customer Pays
          // Store the *actual payout* achieved in the history 'result' field if type was 'payout' like,
          // but since type is 'selling-price', 'result' is SP Before Discount.
          // Let's add a dedicated field or reconsider history structure if Actual Payout needs prominent storage.
          // For now, keeping existing structure.
          currencySymbol: currencySymbol,
        });
      }
    }
  }, [
    desiredPayoutInput,
    discountPercentage,
    feePercentage,
    currencySymbol,
    isLoadingSettings,
    calculateSellingPriceLogic, // Dependency
  ]);

  // Calculate and add to history on button click for 'payout' tab
  const handleCalculatePayout = useCallback(() => {
     const results = calculatePayoutLogic(sellingPriceBeforeDiscountInput, discountPercentage, feePercentage);
     setPayoutCalcResults(results); // Update display state
     setHasCalculatedPayout(true); // Mark that calculation has been done

     // Add to history only on explicit calculation and if results are valid numbers
     if (
       results.payoutSellerReceives !== null &&
       results.feeAmount !== null &&
       results.finalCustomerPrice !== null && // Ensure final customer price is valid
       !isLoadingSettings &&
       isFinite(results.payoutSellerReceives) &&
       isFinite(results.feeAmount) &&
       isFinite(results.finalCustomerPrice) // Check final customer price finiteness
     ) {
       const spBeforeDiscount = parseFloat(sellingPriceBeforeDiscountInput);
       if (!isNaN(spBeforeDiscount) && spBeforeDiscount >= 0) {
         addHistoryEntry({
           type: 'payout',
           input: spBeforeDiscount, // SP Before Discount
           feePercentage: feePercentage,
           discountPercentage: discountPercentage,
           fee: results.feeAmount, // Fee calculated on final price
           result: results.payoutSellerReceives, // Payout received
           discountAmount: results.discountAmount ?? 0,
           finalPrice: results.finalCustomerPrice, // Customer Pays
           currencySymbol: currencySymbol,
         });
       }
     }
  }, [
    sellingPriceBeforeDiscountInput,
    discountPercentage,
    feePercentage,
    currencySymbol,
    isLoadingSettings,
    calculatePayoutLogic, // Dependency
  ]);

  // --- Auto-Recalculation Effect ---
  // This useEffect will run whenever discountPercentage or feePercentage changes,
  // but only *after* an initial calculation has been made using the button.
  useEffect(() => {
    // console.log("Auto-recalc effect triggered. Active tab:", activeTab, "Has calculated SP:", hasCalculatedSellingPrice, "Has calculated Payout:", hasCalculatedPayout);
    if (isLoadingSettings) {
      // console.log("Skipping auto-recalc: settings loading");
      return;
    }

    if (activeTab === 'selling-price' && hasCalculatedSellingPrice && desiredPayoutInput) {
      // console.log("Auto-recalculating Selling Price...");
      const results = calculateSellingPriceLogic(desiredPayoutInput, discountPercentage, feePercentage);
      setSellingPriceCalcResults(results);
      // DO NOT add to history here automatically
    } else if (activeTab === 'payout' && hasCalculatedPayout && sellingPriceBeforeDiscountInput) {
      // console.log("Auto-recalculating Payout...");
      const results = calculatePayoutLogic(sellingPriceBeforeDiscountInput, discountPercentage, feePercentage);
      setPayoutCalcResults(results);
      // DO NOT add to history here automatically
    } else {
       // console.log("Skipping auto-recalc: conditions not met");
    }
  }, [
    discountPercentage, // Recalc when discount changes
    feePercentage,      // Recalc when fee changes
    activeTab,          // Ensure we only recalc the active tab logic
    isLoadingSettings,  // Wait for settings
    hasCalculatedSellingPrice, // Only recalc if button was clicked for this tab
    hasCalculatedPayout,       // Only recalc if button was clicked for this tab
    desiredPayoutInput,                // Need input value for recalc
    sellingPriceBeforeDiscountInput, // Need input value for recalc
    calculateSellingPriceLogic,    // Dependency
    calculatePayoutLogic           // Dependency
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
  const displayDiscountPercentage = (discountPercentage * 100).toFixed(1);


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
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"> {/* Use items-end */}
                    {/* Desired Payout Input (Takes 2 columns) */}
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

                    {/* Offer Dropdown (Takes 1 column) */}
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
                       <Select value={selectedDiscountOption} onValueChange={handleDiscountOptionChange}>
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
                 {selectedDiscountOption === 'custom' && (
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
                          value={customDiscountInput}
                          onChange={handleCustomDiscountInputChange}
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
                <div className="space-y-3 rounded-lg border bg-background p-4">
                    {/* Selling Price Before Discount - HIGHLIGHTED */}
                    <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-base"> {/* Increased font size */}
                          <span className="font-semibold inline-block min-w-6 text-center text-primary">{currencySymbol}</span> {/* Changed color */}
                          Selling Price (Before Discount)
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                 <p className="text-xs">Calculated as: Desired Payout / ((1 - Offer %) * (1 - Fee %)). This is the base price needed before any customer discount.</p>
                              </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("text-xl font-bold", sellingPriceCalcResults?.sellingPriceBeforeDiscount !== null ? "text-primary" : "text-muted-foreground")}> {/* Increased size and boldness, changed color */}
                         {formatCurrency(sellingPriceCalcResults?.sellingPriceBeforeDiscount ?? null)}
                       </span>
                     </div>

                     {/* Discount Amount - De-emphasized */}
                     {discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground"> {/* Muted color */}
                            <Tag className="h-4 w-4" />
                             Discount Amount ({displayDiscountPercentage}%)
                          </Label>
                          <span className="font-semibold text-sm text-muted-foreground"> {/* Muted color */}
                            - {formatCurrency(sellingPriceCalcResults?.discountAmount ?? null)}
                          </span>
                        </div>
                     )}

                     {/* Final Customer Price - De-emphasized */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground"> {/* Muted color */}
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
                       <span className={cn("font-semibold text-sm text-muted-foreground", sellingPriceCalcResults?.customerPriceAfterDiscount !== null ? "" : "text-muted-foreground")}> {/* Muted color */}
                         {formatCurrency(sellingPriceCalcResults?.customerPriceAfterDiscount ?? null)}
                       </span>
                     </div>


                    {/* Calculated Fee - De-emphasized */}
                    <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground"> {/* Muted color */}
                          <Percent className="h-4 w-4" />
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
                       <span className={cn("font-semibold text-sm text-muted-foreground", sellingPriceCalcResults?.feeAmount !== null ? "" : "text-muted-foreground")}> {/* Muted color */}
                         - {formatCurrency(sellingPriceCalcResults?.feeAmount ?? null)}
                       </span>
                     </div>

                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>


                     {/* Actual Payout (Seller Receives) - Keep Highlighted */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm">
                         <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                         Actual Payout (Seller Receives)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">This is the final amount the seller receives. Calculated as: Final Price (Customer Pays) * (1 - Fee %). Should match your 'Desired Payout' input.</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className="text-lg font-bold text-accent">
                         {formatCurrency(sellingPriceCalcResults?.actualPayout ?? null)}
                       </span>
                     </div>


                  </div>
              </TabsContent>

              {/* Payout Calculator Tab */}
              <TabsContent value="payout" className="mt-6 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"> {/* Use items-end */}
                     {/* Selling Price Before Discount Input (Takes 2 columns) */}
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="selling-price-before-discount-input" className="flex items-center gap-2">
                         <ReceiptText className="h-4 w-4 text-muted-foreground" /> {/* Icon */}
                         Selling Price (Before Discount)
                      </Label>
                      <Input
                        id="selling-price-before-discount-input"
                        type="text"
                        inputMode="decimal"
                        placeholder={`${currencySymbol} e.g., 1000.00`}
                        value={sellingPriceBeforeDiscountInput}
                        onChange={handleSellingPriceBeforeDiscountInputChange}
                        className="bg-secondary focus:ring-accent text-base"
                        aria-label="Selling Price (Before Discount)"
                      />
                       <p className="text-xs text-muted-foreground">
                         Enter the price listed on the platform *before* any discount is applied.
                       </p>
                    </div>

                    {/* Offer Dropdown (Takes 1 column) */}
                    <div className="space-y-2">
                       <Label htmlFor="discount-select-payout" className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          Offer (%)
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                 <p className="text-xs">Select or enter the discount percentage (0-100) offered from the 'Selling Price (Before Discount)'.</p>
                              </TooltipContent>
                          </Tooltip>
                       </Label>
                       <Select value={selectedDiscountOption} onValueChange={handleDiscountOptionChange}>
                          <SelectTrigger id="discount-select-payout" className="bg-secondary focus:ring-accent text-base w-full">
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
                 {selectedDiscountOption === 'custom' && (
                    <div className="space-y-2">
                       <Label htmlFor="custom-discount-input-payout" className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          Custom Offer Percentage
                       </Label>
                       <Input
                          id="custom-discount-input-payout"
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g., 15.5 (0-100)"
                          value={customDiscountInput}
                          onChange={handleCustomDiscountInputChange}
                          className="bg-secondary focus:ring-accent text-base"
                          aria-label="Custom Offer Percentage"
                       />
                    </div>
                 )}

                {/* Calculate Button */}
                 <Button onClick={handleCalculatePayout} className="w-full">
                   <Calculator className="mr-2 h-4 w-4" /> Calculate Payout
                 </Button>

                {/* Result Box for 'payout' */}
                 <div className="space-y-3 rounded-lg border bg-background p-4">
                     {/* Final Customer Price (Shown First for Clarity) - HIGHLIGHTED */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-base text-primary"> {/* Increased size, primary color */}
                         <span className="font-semibold inline-block min-w-6 text-center text-primary">{currencySymbol}</span>
                         Final Price (Customer Pays)
                          <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">Calculated as: Selling Price (Before Discount) * (1 - Offer %).</p>
                             </TooltipContent>
                          </Tooltip>
                       </Label>
                       <span className={cn("text-xl font-bold text-primary", payoutCalcResults?.finalCustomerPrice !== null ? "" : "text-muted-foreground")}> {/* Increased size, bold, primary color */}
                         {formatCurrency(payoutCalcResults?.finalCustomerPrice ?? null)}
                       </span>
                     </div>

                     {/* Discount Amount - De-emphasized */}
                     {discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                           <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground"> {/* Muted color */}
                              <Tag className="h-4 w-4" />
                              Discount Given ({displayDiscountPercentage}%)
                           </Label>
                           <span className="font-semibold text-sm text-muted-foreground"> {/* Muted color */}
                              - {formatCurrency(payoutCalcResults?.discountAmount ?? null)}
                           </span>
                        </div>
                     )}

                     {/* Uber Fee - De-emphasized */}
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground"> {/* Muted color */}
                         <Percent className="h-4 w-4" />
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
                      <span className={cn("font-semibold text-sm text-muted-foreground", payoutCalcResults?.feeAmount !== null ? "" : "text-muted-foreground")}> {/* Muted color */}
                         - {formatCurrency(payoutCalcResults?.feeAmount ?? null)}
                      </span>
                    </div>


                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>

                    {/* Payout (Seller Receives) - Keep Highlighted */}
                    <div className="flex justify-between items-center">
                     <Label className="flex items-center gap-2 font-medium text-sm">
                       <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                       Payout (Seller Receives)
                       <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">This is the amount the seller receives after the discount and the Uber fee (calculated on the discounted price) are deducted.</p>
                           </TooltipContent>
                        </Tooltip>
                     </Label>
                     <span className="text-lg font-bold text-accent">
                        {formatCurrency(payoutCalcResults?.payoutSellerReceives ?? null)}
                     </span>
                   </div>

                 </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

    
