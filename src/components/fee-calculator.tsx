
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const [itemPrice, setItemPrice] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
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

  const handleItemPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setItemPrice(value);
    }
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTotalPrice(value);
    }
  };

  const { calculatedTotal, feeAmount: feeAmountForward } = useMemo(() => {
    const price = parseFloat(itemPrice);
    if (!isNaN(price) && price > 0 && !isLoadingSettings) {
      const fee = price * feePercentage;
      const total = price + fee;
      return { calculatedTotal: total, feeAmount: fee };
    }
    return { calculatedTotal: null, feeAmount: null };
  }, [itemPrice, feePercentage, isLoadingSettings]);

  const { calculatedOriginal, feeAmount: feeAmountReverse } = useMemo(() => {
    const total = parseFloat(totalPrice);
    // Ensure feePercentage is not -1 to avoid division by zero if original price is calculated as total / (1 + feePercentage)
    if (!isNaN(total) && total > 0 && feePercentage !== -1 && !isLoadingSettings) {
      // --- Calculation Logic for 'Price - Fee' ---
      // This calculation assumes the 'Total Price (With Fee)' was originally calculated by applying
      // the 'feePercentage' to the 'Original Item Price'.
      // Formula: Original Price = Total Price / (1 + Fee Percentage)
      // This correctly reverses the calculation performed in the 'Price + Fee' tab.
      // Example: If Item Price = 1000, Fee % = 30%, Total Price = 1300.
      //          Then: Original Price = 1300 / (1 + 0.30) = 1300 / 1.30 = 1000.
      // ---
       const denominator = 1 + feePercentage;
        if (denominator > 0) { // Avoid division by zero or negative denominator if feePercentage is less than -1
             const original = total / denominator;
             // Ensure calculated original price is positive
             if (original > 0) {
                const fee = total - original;
                return { calculatedOriginal: original, feeAmount: fee };
            }
        }
    }
    return { calculatedOriginal: null, feeAmount: null };
  }, [totalPrice, feePercentage, isLoadingSettings]);


  const handleBlurWithFee = useCallback(() => {
    if (calculatedTotal !== null && feeAmountForward !== null && !isLoadingSettings) {
      const price = parseFloat(itemPrice);
       if (!isNaN(price) && price > 0) {
         addHistoryEntry({
           type: 'with-fee',
           input: price,
           feePercentage: feePercentage, // Store the fee percentage used
           fee: feeAmountForward,
           result: calculatedTotal,
           currencySymbol: currencySymbol, // Store currency symbol used
         });
       }
    }
  }, [itemPrice, calculatedTotal, feeAmountForward, feePercentage, currencySymbol, isLoadingSettings]);

  const handleBlurWithoutFee = useCallback(() => {
    if (calculatedOriginal !== null && feeAmountReverse !== null && !isLoadingSettings) {
       const total = parseFloat(totalPrice);
       if (!isNaN(total) && total > 0) {
         addHistoryEntry({
           type: 'without-fee',
           input: total,
           feePercentage: feePercentage, // Store the fee percentage used
           fee: feeAmountReverse,
           result: calculatedOriginal,
           currencySymbol: currencySymbol, // Store currency symbol used
         });
       }
    }
  }, [totalPrice, calculatedOriginal, feeAmountReverse, feePercentage, currencySymbol, isLoadingSettings]);


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    if (Object.is(numberValue, -0)) {
       return `${currencySymbol} 0.00`;
    }
    return `${currencySymbol} ${numberValue.toFixed(2)}`;
  };

  const displayFeePercentage = (feePercentage * 100).toFixed(1); // Display with one decimal place

  return (
    <Card className="w-full shadow-lg"> {/* Removed max-w-[60%] */}
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
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'with-fee' | 'without-fee')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="with-fee">Price + Fee</TabsTrigger>
              <TabsTrigger value="without-fee">Price - Fee</TabsTrigger>
            </TabsList>
            <TabsContent value="with-fee" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="item-price" className="flex items-center gap-2">
                  <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                  Item Price (Before Fee)
                </Label>
                <Input
                  id="item-price"
                  type="text"
                  inputMode="decimal"
                  placeholder={`e.g., 1000.00`}
                  value={itemPrice}
                  onChange={handleItemPriceChange}
                  onBlur={handleBlurWithFee}
                  className="bg-secondary focus:ring-accent text-base"
                  aria-label="Item Price Before Fee"
                />
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="space-y-3 rounded-lg border bg-background p-4">
                 <div className="flex justify-between items-center">
                   <Label className="flex items-center gap-2 font-medium text-sm">
                      <Percent className="h-4 w-4 text-accent" />
                      Uber Fee ({displayFeePercentage}%)
                   </Label>
                   <span className={cn("font-semibold text-sm", feeAmountForward !== null ? "text-foreground" : "text-muted-foreground")}>
                     {formatCurrency(feeAmountForward)}
                   </span>
                 </div>
                 <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-medium text-sm">
                    <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                    Total Price (With Fee)
                  </Label>
                  <span className="text-lg font-bold text-accent">
                     {formatCurrency(calculatedTotal)}
                  </span>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="without-fee" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="total-price" className="flex items-center gap-2">
                   <span className="font-semibold inline-block min-w-6 text-center text-muted-foreground">{currencySymbol}</span>
                  Total Price (With Fee)
                </Label>
                <Input
                  id="total-price"
                  type="text"
                  inputMode="decimal"
                   placeholder={`e.g., 1300.00`}
                  value={totalPrice}
                  onChange={handleTotalPriceChange}
                  onBlur={handleBlurWithoutFee}
                  className="bg-secondary focus:ring-accent text-base"
                  aria-label="Total Price With Fee"
                />
              </div>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowLeft className="h-5 w-5" />
              </div>

               <div className="space-y-3 rounded-lg border bg-background p-4">
                  <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2 font-medium text-sm">
                       <Percent className="h-4 w-4 text-accent" />
                       Uber Fee ({displayFeePercentage}%)
                    </Label>
                    <span className={cn("font-semibold text-sm", feeAmountReverse !== null ? "text-foreground" : "text-muted-foreground")}>
                      {formatCurrency(feeAmountReverse)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                   <Label className="flex items-center gap-2 font-medium text-sm">
                     <span className="font-semibold inline-block min-w-6 text-center text-accent">{currencySymbol}</span>
                     Original Item Price (Before Fee)
                   </Label>
                   <span className="text-lg font-bold text-accent">
                      {formatCurrency(calculatedOriginal)}
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
