
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, Plus, Minus } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history'; // Import shared type
import { HISTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE, DEFAULT_CURRENCY_SYMBOL, MAX_HISTORY_LENGTH } from '@/lib/constants'; // Import constants
import type { SettingsData } from '@/types/settings'; // Import SettingsData type


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
      if (lastEntry.type === newEntry.type &&
          lastEntry.input === newEntry.input &&
          lastEntry.result === newEntry.result &&
          lastEntry.feePercentage === newEntry.feePercentage) { // Check feePercentage too
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
  const [itemPriceInput, setItemPriceInput] = useState<string>(''); // Renamed for clarity
  const [sellingPriceInput, setSellingPriceInput] = useState<string>(''); // Renamed from totalPriceInput
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
        // This prevents loops if parsing failed but storage wasn't cleared.
        if (!storedSettings || JSON.stringify(settings) !== storedSettings) {
             localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        }

      } catch (error) {
        console.error("Failed to load or parse settings from localStorage:", error);
        // Fallback to defaults on error
        setFeePercentage(DEFAULT_FEE_PERCENTAGE);
        setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
        // Attempt to clear potentially corrupted storage and save defaults
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

     // Add event listener for storage changes to update settings dynamically
     const handleStorageChange = (event: StorageEvent) => {
       if (event.key === SETTINGS_STORAGE_KEY && event.newValue) {
          loadAndUpdateSettings(); // Reload settings on change
       } else if (event.key === null || (event.key === SETTINGS_STORAGE_KEY && !event.newValue)) {
          // Handle storage clear or item removal
          setFeePercentage(DEFAULT_FEE_PERCENTAGE);
          setCurrencySymbol(DEFAULT_CURRENCY_SYMBOL);
       }
     };

     window.addEventListener('storage', handleStorageChange);

     // Cleanup listener on component unmount
     return () => {
       window.removeEventListener('storage', handleStorageChange);
     };

  }, []); // Empty dependency array ensures this runs once on mount

  const handleItemPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, or numbers (including decimals)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setItemPriceInput(value);
    }
  };

  const handleSellingPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { // Renamed from handleTotalPriceInputChange
    const value = e.target.value;
     // Allow empty string, or numbers (including decimals)
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSellingPriceInput(value); // Update sellingPriceInput state
    }
  };

   const handleTabChange = (value: string) => {
     const newTab = value as 'with-fee' | 'without-fee';
     setActiveTab(newTab);
     // Clear the input of the *other* tab when switching
     if (newTab === 'with-fee') {
       setSellingPriceInput(''); // Clear selling price input when switching to 'with-fee'
     } else {
       setItemPriceInput(''); // Clear item price input when switching to 'without-fee'
     }
   };

  // Calculation for 'Item Price + Fee' tab (Calculate Selling Price: SP = X / (1 - Fee%))
  const { calculatedSellingPrice, feeAmount: feeAmountForward } = useMemo(() => { // Renamed calculatedTotal
    const price = parseFloat(itemPriceInput); // This is X (Desired Item Price)
    if (!isNaN(price) && price >= 0 && !isLoadingSettings && feePercentage < 1) { // Ensure feePercentage is less than 1 (100%)
      const sellingPrice = price / (1 - feePercentage); // SP = X / (1 - Fee%)
      const fee = sellingPrice * feePercentage; // Fee = SP * Fee%
      return { calculatedSellingPrice: sellingPrice, feeAmount: fee }; // Renamed
    }
    // Handle edge case where fee percentage is 100% or more (division by zero or negative)
    if (feePercentage >= 1) {
        return { calculatedSellingPrice: Infinity, feeAmount: Infinity }; // Renamed
    }
    return { calculatedSellingPrice: null, feeAmount: null }; // Renamed
  }, [itemPriceInput, feePercentage, isLoadingSettings]);


  // Calculation for 'Selling Price - Fee = Original Item Price' tab
  // Formula: Original Item Price = Selling Price - (Selling Price * Fee Percentage)
  const { calculatedItemPrice, feeAmount: feeAmountReverse } = useMemo(() => {
    const sellingPrice = parseFloat(sellingPriceInput); // Renamed from total
    // Use the formula: Result = Selling Price - (Selling Price * Fee Percentage)
    // Fee is calculated as: Fee = Selling Price * Fee Percentage
    if (!isNaN(sellingPrice) && sellingPrice >= 0 && !isLoadingSettings) {
        const fee = sellingPrice * feePercentage; // Calculate fee based on selling price
        const itemPriceResult = sellingPrice - fee; // Calculate result by subtracting the fee from selling price

        // Ensure result is not negative
        if (itemPriceResult >= 0) {
          return { calculatedItemPrice: itemPriceResult, feeAmount: fee };
        } else {
           // Fallback case if result is negative (unlikely with this formula if sellingPrice >= 0)
           return { calculatedItemPrice: 0, feeAmount: sellingPrice };
        }
    }
    return { calculatedItemPrice: null, feeAmount: null };
  }, [sellingPriceInput, feePercentage, isLoadingSettings]); // Use sellingPriceInput


  const handleBlurWithFee = useCallback(() => {
    if (calculatedSellingPrice !== null && feeAmountForward !== null && !isLoadingSettings && isFinite(calculatedSellingPrice) && isFinite(feeAmountForward)) { // Renamed calculatedTotal
      const price = parseFloat(itemPriceInput);
       // Only add to history if the input is a valid non-negative number
       if (!isNaN(price) && price >= 0) {
         addHistoryEntry({
           type: 'with-fee',
           input: price, // Input is Desired Item Price (X)
           feePercentage: feePercentage,
           fee: feeAmountForward, // Fee = SP * Fee%
           result: calculatedSellingPrice, // Result is Selling Price (SP) - Renamed
           currencySymbol: currencySymbol,
         });
       }
    }
  }, [itemPriceInput, calculatedSellingPrice, feeAmountForward, feePercentage, currencySymbol, isLoadingSettings]); // Renamed calculatedTotal

  const handleBlurWithoutFee = useCallback(() => {
    if (calculatedItemPrice !== null && feeAmountReverse !== null && !isLoadingSettings) {
       const sellingPrice = parseFloat(sellingPriceInput); // Renamed from total
        // Only add to history if the input is a valid non-negative number
       if (!isNaN(sellingPrice) && sellingPrice >= 0) { // Use sellingPrice
         addHistoryEntry({
           type: 'without-fee',
           input: sellingPrice, // Input is Selling Price - Renamed
           feePercentage: feePercentage,
           fee: feeAmountReverse, // Fee calculated based on Selling Price * Fee Percentage
           result: calculatedItemPrice, // Result is Original Item Price (Selling Price - Fee)
           currencySymbol: currencySymbol,
         });
       }
    }
  }, [sellingPriceInput, calculatedItemPrice, feeAmountReverse, feePercentage, currencySymbol, isLoadingSettings]); // Use sellingPriceInput


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    // Handle Infinity case
    if (!isFinite(Number(value))) return 'N/A';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    // Handle negative zero explicitly if it occurs
    if (Object.is(numberValue, -0)) {
       return `${currencySymbol} 0.00`;
    }
    return `${currencySymbol} ${numberValue.toFixed(2)}`;
  };

  const displayFeePercentage = (feePercentage * 100).toFixed(1); // Display with one decimal place

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Uber Eats Fee Calculator</CardTitle>
        <CardDescription>
          Calculate prices in {isLoadingSettings ? '...' : currencySymbol} with or without the {isLoadingSettings ? '...' : `${displayFeePercentage}%`} fee.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSettings ? (
          <div className="flex justify-center items-center h-40">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="with-fee">Item Price + Fee</TabsTrigger>
              <TabsTrigger value="without-fee">Selling Price - Fee</TabsTrigger> {/* Updated Tab Trigger Label */}
            </TabsList>
            <TabsContent value="with-fee" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="item-price-input" className="flex items-center gap-2">
                  <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                  Desired Item Price (Before Fee)
                </Label>
                <Input
                  id="item-price-input"
                  type="text"
                  inputMode="decimal" // Better mobile keyboard support
                  placeholder={`e.g., 1000.00`}
                  value={itemPriceInput}
                  onChange={handleItemPriceInputChange}
                  onBlur={handleBlurWithFee}
                  className="bg-secondary focus:ring-accent text-base"
                  aria-label="Desired Item Price"
                />
                 <p className="text-xs text-muted-foreground">
                    Calculates the Selling Price needed: Selling Price = Desired Price / (1 - Fee %)
                  </p>
              </div>

              {/* Separator/Icon */}
              <div className="flex items-center justify-center text-muted-foreground space-x-2">
                 <Plus className="h-4 w-4" />
                 <span className="text-xs">Fee</span>
              </div>

              {/* Result Box */}
              <div className="space-y-3 rounded-lg border bg-background p-4">
                 <div className="flex justify-between items-center">
                   <Label className="flex items-center gap-2 font-medium text-sm">
                      <Percent className="h-4 w-4 text-accent" />
                      Calculated Fee ({displayFeePercentage}%)
                   </Label>
                   <span className={cn("font-semibold text-sm", feeAmountForward !== null ? "text-foreground" : "text-muted-foreground")}>
                     {formatCurrency(feeAmountForward)}
                   </span>
                 </div>
                 <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-medium text-sm">
                    <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                    Required Selling Price (Inc. Fee) {/* Updated Label */}
                  </Label>
                  <span className="text-lg font-bold text-accent">
                     {formatCurrency(calculatedSellingPrice)} {/* Renamed calculatedTotal */}
                  </span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="without-fee" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="selling-price-input" className="flex items-center gap-2"> {/* Renamed htmlFor */}
                   <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                   Selling Price (Inc. Fee) {/* Updated Label */}
                </Label>
                <Input
                  id="selling-price-input" // Renamed id
                  type="text"
                  inputMode="decimal" // Better mobile keyboard support
                  placeholder={`e.g., 1300.00`}
                  value={sellingPriceInput} // Use sellingPriceInput state
                  onChange={handleSellingPriceInputChange} // Use renamed handler
                  onBlur={handleBlurWithoutFee}
                  className="bg-secondary focus:ring-accent text-base"
                  aria-label="Selling Price (Including Fee)" // Updated aria-label
                />
                 <p className="text-xs text-muted-foreground">
                    Calculates the Original Price: Original Item Price = Selling Price - (Selling Price * Fee %) {/* Updated Description */}
                 </p>
              </div>

              {/* Separator/Icon */}
               <div className="flex items-center justify-center text-muted-foreground space-x-2">
                  <Minus className="h-4 w-4" />
                  <span className="text-xs">Fee</span>
               </div>

              {/* Result Box */}
               <div className="space-y-3 rounded-lg border bg-background p-4">
                  <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2 font-medium text-sm">
                       <Percent className="h-4 w-4 text-accent" />
                       Calculated Fee ({displayFeePercentage}%)
                    </Label>
                    <span className={cn("font-semibold text-sm", feeAmountReverse !== null ? "text-foreground" : "text-muted-foreground")}>
                      {formatCurrency(feeAmountReverse)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                   <Label className="flex items-center gap-2 font-medium text-sm">
                     <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                     Original Item Price (After Fee) {/* Updated Label */}
                   </Label>
                   <span className="text-lg font-bold text-accent">
                      {formatCurrency(calculatedItemPrice)}
                   </span>
                 </div>
               </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
