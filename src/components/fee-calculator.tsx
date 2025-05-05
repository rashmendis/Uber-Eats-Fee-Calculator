
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Plus, Minus, Tag, Info, TrendingUp, TrendingDown } from 'lucide-react'; // Added icons
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history'; // Import shared type
import { HISTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE, DEFAULT_CURRENCY_SYMBOL, MAX_HISTORY_LENGTH } from '@/lib/constants'; // Import constants
import type { SettingsData } from '@/types/settings'; // Import SettingsData type
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

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
        lastEntry.discountPercentage === newEntry.discountPercentage // Also check discount
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
  const [itemPriceInput, setItemPriceInput] = useState<string>('');
  const [sellingPriceBeforeDiscountInput, setSellingPriceBeforeDiscountInput] = useState<string>(''); // State for Selling Price Before Discount
  const [discountInput, setDiscountInput] = useState<string>(''); // State for discount input
  const [activeTab, setActiveTab] = useState<'with-fee' | 'without-fee'>('with-fee');
  const [feePercentage, setFeePercentage] = useState<number>(DEFAULT_FEE_PERCENTAGE);
  const [currencySymbol, setCurrencySymbol] = useState<string>(DEFAULT_CURRENCY_SYMBOL);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from localStorage on mount and listen for changes
  useEffect(() => {
    setIsLoadingSettings(true);
    const loadAndUpdateSettings = () => {
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

  // Safely parse discount percentage from input
  const discountPercentage = useMemo(() => {
    const parsed = parseFloat(discountInput);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return parsed / 100; // Convert to decimal
    }
    return 0; // Default to 0% if invalid or empty
  }, [discountInput]);

  const handleItemPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setItemPriceInput(value);
    }
  };

  const handleSellingPriceBeforeDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellingPriceBeforeDiscountInput(value);
    }
  };

  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, or numbers (including decimals) between 0 and 100
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || (numericValue >= 0 && numericValue <= 100)) {
         setDiscountInput(value);
      } else if (numericValue < 0) {
          setDiscountInput('0');
      } else if (numericValue > 100) {
          setDiscountInput('100');
      }
    }
  };

   const handleTabChange = (value: string) => {
     const newTab = value as 'with-fee' | 'without-fee';
     setActiveTab(newTab);
     // Clear inputs when switching tabs
     setItemPriceInput('');
     setSellingPriceBeforeDiscountInput('');
     setDiscountInput(''); // Clear discount input as well
   };

  // Calculation for 'Item Price + Fee' tab
  const {
    sellingPriceBeforeDiscount, // SP = X / (1 - F%)
    customerPriceAfterDiscount, // SP * (1 - D%)
    discountAmountForward,      // SP - (SP * (1 - D%))
    feeAmountForward            // SP * F%
  } = useMemo(() => {
    const desiredPrice = parseFloat(itemPriceInput); // X
    if (!isNaN(desiredPrice) && desiredPrice >= 0 && !isLoadingSettings && feePercentage < 1) {
      const spBeforeDiscount = desiredPrice / (1 - feePercentage);
      const spAfterDiscount = spBeforeDiscount * (1 - discountPercentage);
      const discountAmt = spBeforeDiscount - spAfterDiscount;
      const feeAmt = spBeforeDiscount * feePercentage; // Fee is based on Selling Price Before Discount

      // Handle potential floating point inaccuracies for display consistency
      // Ensure customer price doesn't become negative due to rounding
      const finalSpAfterDiscount = Math.max(0, spAfterDiscount);
      const finalDiscountAmt = Math.max(0, discountAmt) // Ensure discount isn't negative

      return {
        sellingPriceBeforeDiscount: spBeforeDiscount,
        customerPriceAfterDiscount: finalSpAfterDiscount,
        discountAmountForward: finalDiscountAmt,
        feeAmountForward: feeAmt
      };
    }
    if (feePercentage >= 1) {
        return { sellingPriceBeforeDiscount: Infinity, customerPriceAfterDiscount: Infinity, discountAmountForward: 0, feeAmountForward: Infinity };
    }
    return { sellingPriceBeforeDiscount: null, customerPriceAfterDiscount: null, discountAmountForward: null, feeAmountForward: null };
  }, [itemPriceInput, feePercentage, discountPercentage, isLoadingSettings]);


  // Calculation for 'Selling Price - Fee' tab
  const {
    itemPriceSellerReceives,    // (SP_before_discount * (1 - D%)) * (1 - F%)
    discountAmountReverse,      // SP_before_discount * D%
    feeAmountReverse,           // (SP_before_discount * (1 - D%)) * F% // <<< CHANGED
    finalCustomerPriceReverse   // SP_before_discount * (1 - D%)
  } = useMemo(() => {
    const spBeforeDiscount = parseFloat(sellingPriceBeforeDiscountInput);

    if (!isNaN(spBeforeDiscount) && spBeforeDiscount >= 0 && !isLoadingSettings) {
        const discountAmt = spBeforeDiscount * discountPercentage; // Discount amount calculated on SP Before Discount
        const priceAfterDiscount = spBeforeDiscount * (1 - discountPercentage); // Price customer pays

        // --- NEW LOGIC: Calculate Fee on Price *After* Discount ---
        const feeAmt = priceAfterDiscount * feePercentage;
        const sellerReceives = priceAfterDiscount - feeAmt;
        // --- END NEW LOGIC ---

        // Ensure results are not negative due to floating point issues
        const finalSellerReceives = Math.max(0, sellerReceives);
        const finalDiscountAmt = Math.max(0, discountAmt);
        const finalFeeAmt = Math.max(0, feeAmt);
        const finalCustomerPrice = Math.max(0, priceAfterDiscount); // Renamed variable for clarity

        return {
            itemPriceSellerReceives: finalSellerReceives,
            discountAmountReverse: finalDiscountAmt,
            feeAmountReverse: finalFeeAmt,
            finalCustomerPriceReverse: finalCustomerPrice
        };
    }
    return { itemPriceSellerReceives: null, discountAmountReverse: null, feeAmountReverse: null, finalCustomerPriceReverse: null };
  }, [sellingPriceBeforeDiscountInput, feePercentage, discountPercentage, isLoadingSettings]);


  // Add to history on blur for 'with-fee' tab
  const handleBlurWithFee = useCallback(() => {
    if (
      sellingPriceBeforeDiscount !== null &&
      customerPriceAfterDiscount !== null &&
      feeAmountForward !== null &&
      !isLoadingSettings &&
      isFinite(sellingPriceBeforeDiscount) &&
      isFinite(customerPriceAfterDiscount) &&
      isFinite(feeAmountForward)
    ) {
      const price = parseFloat(itemPriceInput);
      if (!isNaN(price) && price >= 0) {
        addHistoryEntry({
          type: 'with-fee',
          input: price, // Desired Item Price (X)
          feePercentage: feePercentage,
          discountPercentage: discountPercentage, // Store discount
          fee: feeAmountForward,
          // 'result' represents the selling price *before* discount was applied
          result: sellingPriceBeforeDiscount,
          // Add discounted price for clarity in history
          discountAmount: discountAmountForward ?? 0,
          finalPrice: customerPriceAfterDiscount,
          currencySymbol: currencySymbol,
        });
      }
    }
  }, [
    itemPriceInput,
    sellingPriceBeforeDiscount,
    customerPriceAfterDiscount,
    feeAmountForward,
    discountAmountForward,
    feePercentage,
    discountPercentage,
    currencySymbol,
    isLoadingSettings
  ]);

  // Add to history on blur for 'without-fee' tab
  const handleBlurWithoutFee = useCallback(() => {
    if (
      itemPriceSellerReceives !== null &&
      feeAmountReverse !== null &&
      !isLoadingSettings &&
      isFinite(itemPriceSellerReceives) &&
      isFinite(feeAmountReverse)
    ) {
      const spBeforeDiscount = parseFloat(sellingPriceBeforeDiscountInput);
      if (!isNaN(spBeforeDiscount) && spBeforeDiscount >= 0) {
        addHistoryEntry({
          type: 'without-fee',
          input: spBeforeDiscount, // Input is Selling Price Before Discount
          feePercentage: feePercentage,
          discountPercentage: discountPercentage, // Store discount
          fee: feeAmountReverse, // Fee calculated on price after discount
          // 'result' represents what the seller receives
          result: itemPriceSellerReceives,
          discountAmount: discountAmountReverse ?? 0, // Store calculated discount amount (based on SP before discount)
          // 'finalPrice' represents the price the customer pays (after discount, before fee)
          finalPrice: finalCustomerPriceReverse ?? 0,
          currencySymbol: currencySymbol,
        });
      }
    }
  }, [
    sellingPriceBeforeDiscountInput,
    itemPriceSellerReceives,
    feeAmountReverse,
    discountAmountReverse,
    finalCustomerPriceReverse,
    feePercentage,
    discountPercentage,
    currencySymbol,
    isLoadingSettings
  ]);


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    if (!isFinite(Number(value))) return 'N/A';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    // Handle negative zero
    if (Object.is(numberValue, -0)) {
       return `${currencySymbol} 0.00`;
    }
    return `${currencySymbol} ${numberValue.toFixed(2)}`;
  };

  const displayFeePercentage = (feePercentage * 100).toFixed(1);
  const displayDiscountPercentage = (discountPercentage * 100).toFixed(1); // Discount percentage for display


  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Uber Eats Price Calculator</CardTitle>
          <CardDescription>
            Calculate selling prices in {isLoadingSettings ? '...' : currencySymbol} with fee, and optional discount.
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
                <TabsTrigger value="with-fee">
                  <TrendingUp className="h-4 w-4 mr-2"/> Item Price <span className="mx-1 font-bold">+</span> Fee
                </TabsTrigger>
                <TabsTrigger value="without-fee">
                   <TrendingDown className="h-4 w-4 mr-2"/>Selling Price <span className="mx-1 font-bold">-</span> Fee
                </TabsTrigger>
              </TabsList>

              {/* With Fee Tab */}
              <TabsContent value="with-fee" className="mt-6 space-y-6">
                 {/* Desired Item Price Input */}
                <div className="space-y-2">
                  <Label htmlFor="item-price-input" className="flex items-center gap-2">
                    <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                    Desired Item Price (Seller Receives)
                  </Label>
                  <Input
                    id="item-price-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={`e.g., 1000.00`}
                    value={itemPriceInput}
                    onChange={handleItemPriceInputChange}
                    onBlur={handleBlurWithFee} // Add history on blur
                    className="bg-secondary focus:ring-accent text-base"
                    aria-label="Desired Item Price (Seller Receives)"
                  />
                   <p className="text-xs text-muted-foreground">
                     The amount you want after the Uber fee is deducted.
                   </p>
                </div>

                {/* Discount Input Section for 'with-fee' */}
                <div className="space-y-2">
                   <Label htmlFor="discount-input-with-fee" className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Optional Discount Percentage
                      <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">Enter the discount percentage (0-100) offered to the customer. This is applied to the 'Selling Price (Before Discount)'.</p>
                          </TooltipContent>
                       </Tooltip>
                   </Label>
                   <Input
                      id="discount-input-with-fee"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 10 or 15.5 (0-100)"
                      value={discountInput}
                      onChange={handleDiscountInputChange}
                      onBlur={handleBlurWithFee} // Also trigger history update on discount blur
                      className="bg-secondary focus:ring-accent text-base"
                      aria-label="Optional Discount Percentage"
                   />
                   <p className="text-xs text-muted-foreground">
                      Leave blank or 0 if no discount is applied. Current: {displayDiscountPercentage}%
                   </p>
                </div>

                {/* Result Box for 'with-fee' */}
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
                                 <p className="text-xs">Calculated as: Desired Price / (1 - Fee %). This is the base price before any customer discount.</p>
                              </TooltipContent>
                           </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm", sellingPriceBeforeDiscount !== null ? "text-foreground" : "text-muted-foreground")}>
                         {formatCurrency(sellingPriceBeforeDiscount)}
                       </span>
                     </div>

                    {/* Calculated Fee */}
                    <div className="flex justify-between items-center">
                       <Label className="flex items-center gap-2 font-medium text-sm">
                          <Percent className="h-4 w-4 text-muted-foreground" />
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
                       <span className={cn("font-semibold text-sm", feeAmountForward !== null ? "text-foreground" : "text-muted-foreground")}>
                         {formatCurrency(feeAmountForward)}
                       </span>
                     </div>

                     {/* Discount Amount */}
                     {discountPercentage > 0 && (
                        <div className="flex justify-between items-center">
                          <Label className="flex items-center gap-2 font-medium text-sm text-green-600 dark:text-green-400">
                            <Tag className="h-4 w-4" />
                             Discount Amount ({displayDiscountPercentage}%)
                          </Label>
                          <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                            - {formatCurrency(discountAmountForward)}
                          </span>
                        </div>
                     )}

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
                             <p className="text-xs">This is the price displayed to the customer after the discount (if any) is applied.</p>
                           </TooltipContent>
                         </Tooltip>
                       </Label>
                       <span className="text-lg font-bold text-accent">
                         {formatCurrency(customerPriceAfterDiscount)}
                       </span>
                     </div>
                  </div>
              </TabsContent>

              {/* Without Fee Tab */}
              <TabsContent value="without-fee" className="mt-6 space-y-6">
                 {/* Selling Price Before Discount Input */}
                <div className="space-y-2">
                  <Label htmlFor="selling-price-before-discount-input" className="flex items-center gap-2">
                     <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                     Selling Price (Before Discount)
                  </Label>
                  <Input
                    id="selling-price-before-discount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={`e.g., 1300.00`}
                    value={sellingPriceBeforeDiscountInput}
                    onChange={handleSellingPriceBeforeDiscountInputChange}
                    onBlur={handleBlurWithoutFee}
                    className="bg-secondary focus:ring-accent text-base"
                    aria-label="Selling Price (Before Discount)"
                  />
                   <p className="text-xs text-muted-foreground">
                     Enter the price listed on the platform *before* any discount is applied.
                   </p>
                </div>

                {/* Discount Input Section for 'without-fee' */}
                <div className="space-y-2">
                   <Label htmlFor="discount-input-without-fee" className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Optional Discount Percentage
                       <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                             <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                             <p className="text-xs">Enter the discount percentage (0-100) offered to the customer from the 'Selling Price (Before Discount)'.</p>
                          </TooltipContent>
                       </Tooltip>
                   </Label>
                   <Input
                      id="discount-input-without-fee"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 10 or 15.5 (0-100)"
                      value={discountInput}
                      onChange={handleDiscountInputChange}
                      onBlur={handleBlurWithoutFee} // Also trigger history update on discount blur
                      className="bg-secondary focus:ring-accent text-base"
                      aria-label="Optional Discount Percentage"
                   />
                   <p className="text-xs text-muted-foreground">
                      Leave blank or 0 if no discount was applied. Current: {displayDiscountPercentage}%
                   </p>
                </div>


                {/* Result Box for 'without-fee' */}
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
                                <p className="text-xs">Calculated as: Selling Price (Before Discount) * (1 - Discount %).</p>
                             </TooltipContent>
                          </Tooltip>
                       </Label>
                       <span className={cn("font-semibold text-sm", finalCustomerPriceReverse !== null ? "text-muted-foreground" : "text-muted-foreground")}>
                         {formatCurrency(finalCustomerPriceReverse)}
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
                              - {formatCurrency(discountAmountReverse)}
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
                                <p className="text-xs">Calculated based on the 'Final Price (Customer Pays)'.</p> {/* <<< UPDATED TOOLTIP */}
                             </TooltipContent>
                          </Tooltip>
                      </Label>
                      <span className={cn("font-semibold text-sm text-destructive", feeAmountReverse !== null ? "" : "text-muted-foreground")}>
                         - {formatCurrency(feeAmountReverse)}
                      </span>
                    </div>


                    {/* Separator */}
                    <div className="border-t border-border my-2"></div>

                    {/* Item Price Seller Receives */}
                    <div className="flex justify-between items-center">
                     <Label className="flex items-center gap-2 font-medium text-sm">
                       <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                       Item Price (Seller Receives)
                       <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">This is the amount the seller receives after the discount and the Uber fee (calculated on the discounted price) are deducted.</p> {/* <<< UPDATED TOOLTIP */}
                           </TooltipContent>
                        </Tooltip>
                     </Label>
                     <span className="text-lg font-bold text-accent">
                        {formatCurrency(itemPriceSellerReceives)}
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
