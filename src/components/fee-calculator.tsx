
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history'; // Import shared type
import { HISTORY_STORAGE_KEY, SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE, MAX_HISTORY_LENGTH } from '@/lib/constants'; // Import constants

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

  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
};


export default function FeeCalculator() {
  const [itemPrice, setItemPrice] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'with-fee' | 'without-fee'>('with-fee');
  const [feePercentage, setFeePercentage] = useState<number>(DEFAULT_FEE_PERCENTAGE);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load fee percentage from settings on mount
  useEffect(() => {
    setIsLoadingSettings(true);
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        // Validate loaded data
         if (settings.feePercentage !== undefined && typeof settings.feePercentage === 'number' && settings.feePercentage >= 0 && settings.feePercentage <= 1) {
            setFeePercentage(settings.feePercentage);
         } else {
             // Use default if stored data is invalid and maybe save it back
             setFeePercentage(DEFAULT_FEE_PERCENTAGE);
             localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ feePercentage: DEFAULT_FEE_PERCENTAGE }));
         }
      } else {
         // Use default if no settings found
         setFeePercentage(DEFAULT_FEE_PERCENTAGE);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setFeePercentage(DEFAULT_FEE_PERCENTAGE); // Fallback to default on error
       // Optionally clear corrupted storage
      // localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setIsLoadingSettings(false);
    }

     // Add event listener for storage changes to update fee percentage dynamically
     const handleStorageChange = (event: StorageEvent) => {
       if (event.key === SETTINGS_STORAGE_KEY && event.newValue) {
         try {
           const newSettings = JSON.parse(event.newValue);
            if (newSettings.feePercentage !== undefined && typeof newSettings.feePercentage === 'number' && newSettings.feePercentage >= 0 && newSettings.feePercentage <= 1) {
              setFeePercentage(newSettings.feePercentage);
            }
         } catch (error) {
           console.error("Error parsing storage change:", error);
         }
       }
     };

     window.addEventListener('storage', handleStorageChange);

     // Cleanup listener on component unmount
     return () => {
       window.removeEventListener('storage', handleStorageChange);
     };

  }, []);

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
      // Calculate original price based on total and fee percentage
      // original + original * feePercentage = total
      // original * (1 + feePercentage) = total
      // original = total / (1 + feePercentage)
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
         });
       }
    }
  }, [itemPrice, calculatedTotal, feeAmountForward, feePercentage, isLoadingSettings]);

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
         });
       }
    }
  }, [totalPrice, calculatedOriginal, feeAmountReverse, feePercentage, isLoadingSettings]);


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    if (Object.is(numberValue, -0)) {
       return `Rs. 0.00`;
    }
    return `Rs. ${numberValue.toFixed(2)}`;
  };

  const displayFeePercentage = (feePercentage * 100).toFixed(1); // Display with one decimal place

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Uber Eats Fee Calculator</CardTitle>
        <CardDescription>
          Calculate prices in Rs. with or without the {isLoadingSettings ? '...' : `${displayFeePercentage}%`} fee.
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
                  <span className="font-semibold inline-block w-4 text-center text-muted-foreground">Rs.</span>
                  Item Price (Before Fee)
                </Label>
                <Input
                  id="item-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 1000.00"
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
                    <span className="font-semibold inline-block w-4 text-center text-accent">Rs.</span>
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
                   <span className="font-semibold inline-block w-4 text-center text-muted-foreground">Rs.</span>
                  Total Price (With Fee)
                </Label>
                <Input
                  id="total-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 1300.00"
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
                     <span className="font-semibold inline-block w-4 text-center text-accent">Rs.</span>
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
