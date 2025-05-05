
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
        return; // Don't add exact duplicate
      }
    }

    const updatedHistory = [newEntry, ...currentHistory].slice(0, MAX_HISTORY_LENGTH);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

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
  const [itemPriceInput, setItemPriceInput] = useState<string>(''); // Renamed: Used in "Selling Price Calculator" for Desired Payout
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
  const [calculatedResultsSellingPrice, setCalculatedResultsSellingPrice] = useState<{
    sellingPriceBeforeDiscount: number | null | typeof Infinity;
    customerPriceAfterDiscount: number | null | typeof Infinity;
    discountAmountForward: number | null;
    feeAmountForward: number | null | typeof Infinity;
    actualPayout: number | null; // Added for clarity
  } | null>(null);

  const [calculatedResultsPayout, setCalculatedResultsPayout] = useState<{
    itemPriceSellerReceives: number | null; // Renamed from itemPriceAfterFee
    discountAmountReverse: number | null;
    feeAmountReverse: number | null;
    finalCustomerPriceReverse: number | null; // Added for clarity in Payout calc
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
  // Input: Desired Payout (X), Discount %, Fee %
  // Output: Selling Price (Before Discount), Customer Price (After Discount), Discount Amount, Fee Amount, Actual Payout (== Desired Payout)
  const calculateSellingPriceLogic = useCallback((priceInput: string, discount: number, fee: number) => {
      const desiredPayout = parseFloat(priceInput); // X
      if (isNaN(desiredPayout) || desiredPayout < 0) {
         return { sellingPriceBeforeDiscount: null, customerPriceAfterDiscount: null, discountAmountForward: null, feeAmountForward: null, actualPayout: null };
      }
      if (fee >= 1) {
          // Handle 100% fee case to avoid division by zero
          return { sellingPriceBeforeDiscount: Infinity, customerPriceAfterDiscount: Infinity, discountAmountForward: 0, feeAmountForward: Infinity, actualPayout: desiredPayout };
      }

      // Calculate Selling Price (Before Discount) based on Desired Payout and Fee
      // SP_Before_Discount * (1 - Fee) = Desired_Payout
      const spBeforeDiscount = desiredPayout / (1 - fee);

      // Calculate Customer Price (After Discount)
      const spAfterDiscount = spBeforeDiscount * (1 - discount); // Customer pays this

      // Calculate Discount Amount
      const discountAmt = spBeforeDiscount - spAfterDiscount;

      // Calculate Fee Amount (based on Selling Price *Before* discount)
      const feeAmt = spBeforeDiscount * fee;

      // Handle potential floating point inaccuracies for display consistency
      const finalSpAfterDiscount = Math.max(0, spAfterDiscount);
      const finalDiscountAmt = Math.max(0, discountAmt); // Ensure discount isn't negative

      // The 'actual payout' here is just the input 'desired payout'
      const actualPayoutResult = desiredPayout;

      return {
        sellingPriceBeforeDiscount: spBeforeDiscount,
        customerPriceAfterDiscount: finalSpAfterDiscount,
        discountAmountForward: finalDiscountAmt,
        feeAmountForward: feeAmt,
        actualPayout: actualPayoutResult
      };
  }, []);

  // Calculation logic for 'Payout Calculator' tab
  // Input: Selling Price (Before Discount), Discount %, Fee %
  // Output: Payout (Seller Receives), Customer Price (After Discount), Discount Amount, Fee Amount
  const calculatePayoutLogic = useCallback((spInput: string, discount: number, fee: number) => {
      // The input 'spInput' is the Selling Price *Before* any discount is applied
      const spBeforeDiscount = parseFloat(spInput);

      if (isNaN(spBeforeDiscount) || spBeforeDiscount < 0) {
          return { itemPriceSellerReceives: null, discountAmountReverse: null, feeAmountReverse: null, finalCustomerPriceReverse: null };
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
          itemPriceSellerReceives: finalSellerReceives,
          discountAmountReverse: finalDiscountAmt,
          feeAmountReverse: finalFeeAmt,
          finalCustomerPriceReverse: finalCustomerPrice // This is the Price After Discount
      };
  }, []);

  // --- Event Handlers ---

  const handleItemPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setItemPriceInput(value);
    }
  };

  const handleSellingPriceBeforeDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow empty or valid decimal numbers
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellingPriceBeforeDiscountInput(value);
    }
  };

  const handleDiscountOptionChange = (value: string) => {
      setSelectedDiscountOption(value);
      // Clear custom input if a predefined option is selected
      if (value !== 'custom') {
          setCustomDiscountInput('');
      }
      // Note: Recalculation based on this change is handled by useEffect
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
      // Note: Recalculation based on this change is handled by useEffect
    }
  };


   const handleTabChange = (value: string) => {
     const newTab = value as 'selling-price' | 'payout';
     setActiveTab(newTab);
     // Clear inputs when switching tabs
     setItemPriceInput('');
     setSellingPriceBeforeDiscountInput('');
     // Reset calculated results and flags when switching tabs
     setCalculatedResultsSellingPrice(null);
     setCalculatedResultsPayout(null);
     setHasCalculatedSellingPrice(false);
     setHasCalculatedPayout(false);
     // Reset discount selection to '0%' and clear custom input
     setSelectedDiscountOption('0');
     setCustomDiscountInput('');
   };

  // Calculate and optionally add to history on button click for 'selling-price' tab
  const handleCalculateSellingPrice = useCallback(() => {
    const results = calculateSellingPriceLogic(itemPriceInput, discountPercentage, feePercentage);
    setCalculatedResultsSellingPrice(results); // Update display state
    setHasCalculatedSellingPrice(true); // Mark that calculation has been done

    // Add to history only on explicit calculation
    if (
      results.sellingPriceBeforeDiscount !== null &&
      results.customerPriceAfterDiscount !== null &&
      results.feeAmountForward !== null &&
      !isLoadingSettings &&
      isFinite(results.sellingPriceBeforeDiscount) &&
      isFinite(results.customerPriceAfterDiscount) &&
      isFinite(results.feeAmountForward)
    ) {
      const price = parseFloat(itemPriceInput);
      if (!isNaN(price) && price >= 0) {
        addHistoryEntry({
          type: 'selling-price',
          input: price, // This is the Desired Payout
          feePercentage: feePercentage,
          discountPercentage: discountPercentage,
          fee: results.feeAmountForward,
          result: results.sellingPriceBeforeDiscount, // SP Before Discount
          discountAmount: results.discountAmountForward ?? 0,
          finalPrice: results.customerPriceAfterDiscount, // Customer Pays
          currencySymbol: currencySymbol,
        });
      }
    }
  }, [
    itemPriceInput,
    discountPercentage,
    feePercentage,
    currencySymbol,
    isLoadingSettings,
    calculateSellingPriceLogic, // Dependency
  ]);

  // Calculate and optionally add to history on button click for 'payout' tab
  const handleCalculatePayout = useCallback(() => {
     const results = calculatePayoutLogic(sellingPriceBeforeDiscountInput, discountPercentage, feePercentage);
     setCalculatedResultsPayout(results); // Update display state
     setHasCalculatedPayout(true); // Mark that calculation has been done

     // Add to history only on explicit calculation
     if (
       results.itemPriceSellerReceives !== null &&
       results.feeAmountReverse !== null &&
       !isLoadingSettings &&
       isFinite(results.itemPriceSellerReceives) &&
       isFinite(results.feeAmountReverse)
     ) {
       const spBeforeDiscount = parseFloat(sellingPriceBeforeDiscountInput);
       if (!isNaN(spBeforeDiscount) && spBeforeDiscount >= 0) {
         addHistoryEntry({
           type: 'payout',
           input: spBeforeDiscount, // SP Before Discount
           feePercentage: feePercentage,
           discountPercentage: discountPercentage,
           fee: results.feeAmountReverse,
           result: results.itemPriceSellerReceives, // Payout
           discountAmount: results.discountAmountReverse ?? 0,
           finalPrice: results.finalCustomerPriceReverse ?? 0, // Customer Pays
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
    // Only run if not loading settings and the respective calculation flag is true
    if (isLoadingSettings) return;

    if (activeTab === 'selling-price' && hasCalculatedSellingPrice && itemPriceInput) {
      // console.log("Recalculating Selling Price due to discount/fee change...");
      const results = calculateSellingPriceLogic(itemPriceInput, discountPercentage, feePercentage);
      setCalculatedResultsSellingPrice(results);
      // DO NOT add to history here automatically
    } else if (activeTab === 'payout' && hasCalculatedPayout && sellingPriceBeforeDiscountInput) {
      // console.log("Recalculating Payout due to discount/fee change...");
      const results = calculatePayoutLogic(sellingPriceBeforeDiscountInput, discountPercentage, feePercentage);
      setCalculatedResultsPayout(results);
      // DO NOT add to history here automatically
    }
  }, [
    discountPercentage, // Recalc when discount changes
    feePercentage,      // Recalc when fee changes
    activeTab,          // Ensure we only recalc the active tab logic
    isLoadingSettings,  // Wait for settings
    hasCalculatedSellingPrice, // Only recalc if button was clicked for this tab
    hasCalculatedPayout,       // Only recalc if button was clicked for this tab
    itemPriceInput,                // Need input value for recalc
    sellingPriceBeforeDiscountInput, // Need input value for recalc
    calculateSellingPriceLogic,    // Dependency
    calculatePayoutLogic           // Dependency
  ]);


  // --- Helper Functions ---

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    if (!isFinite(Number(value))) return 'N/A'; // Display N/A for Infinity
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    // Handle negative zero
    if (Object.is(numberValue, -0)) {
       return `${currencySymbol} 0.00`;
    }
    return `${currencySymbol} ${numberValue.toFixed(2)}`;
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
                       <Label htmlFor="item-price-input" className="flex items-center gap-2">
                          <ReceiptText className="h-4 w-4 text-muted-foreground" /> {/* Icon */}
                          Desired Payout (Seller Receives)
                       </Label>
                       <Input
                          id="item-price-input"
                          type="text"
                          inputMode="decimal"
                          placeholder={`${currencySymbol} e.g., 700.00`}
                          value={itemPriceInput}
                          onChange={handleItemPriceInputChange}
                          className="bg-secondary focus:ring-accent text-base"
                          aria-label="Desired Payout (Seller Receives)"
                       />
                       <p className="text-xs text-muted-foreground">
                         The amount you want after the Uber fee is deducted.
                       </p>
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
                    {/* Selling Price Before Discount */}
                    <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm">
                          <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                          Selling Price (Before Discount)
                          <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                 <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                 <p className="text-xs">Calculated as: Desired Payout / (1 - Fee %). This is the base price before any customer discount.</p>
                              </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm", calculatedResultsSellingPrice?.sellingPriceBeforeDiscount !== null ? "text-foreground" : "text-muted-foreground")}>
                         {formatCurrency(calculatedResultsSellingPrice?.sellingPriceBeforeDiscount ?? null)}
                       </span>
                     </div>

                    {/* Calculated Fee */}
                    <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm text-destructive">
                          <Percent className="h-4 w-4" />
                          Uber Fee ({displayFeePercentage}%)
                           <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">Calculated based on the 'Selling Price (Before Discount)'.</p>
                             </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm text-destructive", calculatedResultsSellingPrice?.feeAmountForward !== null ? "" : "text-muted-foreground")}>
                         - {formatCurrency(calculatedResultsSellingPrice?.feeAmountForward ?? null)}
                       </span>
                     </div>

                     {/* Discount Amount */}
                     {discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2 font-medium text-sm text-destructive">
                            <Tag className="h-4 w-4" />
                             Discount Amount ({displayDiscountPercentage}%)
                          </Label>
                          <span className="font-semibold text-sm text-destructive">
                            - {formatCurrency(calculatedResultsSellingPrice?.discountAmountForward ?? null)}
                          </span>
                        </div>
                     )}

                      {/* Actual Payout (Seller Receives) - Added */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                         <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                         Actual Payout (Seller Receives)
                          <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                             </TooltipTrigger>
                             <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">This is the Desired Payout you entered initially.</p>
                             </TooltipContent>
                          </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm", calculatedResultsSellingPrice?.actualPayout !== null ? "text-muted-foreground" : "text-muted-foreground")}>
                         {formatCurrency(calculatedResultsSellingPrice?.actualPayout ?? null)}
                       </span>
                     </div>


                     {/* Separator */}
                     <div className="border-t border-border my-2"></div>

                     {/* Final Customer Price */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm">
                         <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                         Final Price (Customer Pays)
                         <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">This is the price displayed to the customer after the discount (if any) is applied. Calculated as: Selling Price (Before Discount) * (1 - Offer %).</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className="text-lg font-bold text-accent">
                         {formatCurrency(calculatedResultsSellingPrice?.customerPriceAfterDiscount ?? null)}
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
                     {/* Final Customer Price (Shown First for Clarity) */}
                     <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm text-muted-foreground">
                         <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
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
                       <span className={cn("font-semibold text-sm", calculatedResultsPayout?.finalCustomerPriceReverse !== null ? "text-muted-foreground" : "text-muted-foreground")}>
                         {formatCurrency(calculatedResultsPayout?.finalCustomerPriceReverse ?? null)}
                       </span>
                     </div>

                     {/* Discount Amount */}
                     {discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                           <Label className="flex items-center gap-2 font-medium text-sm text-destructive">
                              <Tag className="h-4 w-4" />
                              Discount Given ({displayDiscountPercentage}%)
                           </Label>
                           <span className="font-semibold text-sm text-destructive">
                              - {formatCurrency(calculatedResultsPayout?.discountAmountReverse ?? null)}
                           </span>
                        </div>
                     )}

                     {/* Uber Fee */}
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2 font-medium text-sm text-destructive">
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
                      <span className={cn("font-semibold text-sm text-destructive", calculatedResultsPayout?.feeAmountReverse !== null ? "" : "text-muted-foreground")}>
                         - {formatCurrency(calculatedResultsPayout?.feeAmountReverse ?? null)}
                      </span>
                    </div>


                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>

                    {/* Payout (Seller Receives) */}
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
                        {formatCurrency(calculatedResultsPayout?.itemPriceSellerReceives ?? null)}
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

    