
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from "@/lib/utils";

const UBER_FEE_PERCENTAGE = 0.30; // 30%
const HISTORY_STORAGE_KEY = 'uberFeeCalculatorHistory';
const MAX_HISTORY_LENGTH = 20; // Limit the number of history entries

// Define HistoryEntry interface here as it's used by addHistoryEntry
interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'with-fee' | 'without-fee';
  input: number;
  fee: number;
  result: number;
}

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

    // Avoid adding exact duplicate of the most recent entry
    if (currentHistory.length > 0) {
      const lastEntry = currentHistory[0];
      // Only compare essential fields to avoid blocking entries after clearing input
      if (lastEntry.type === newEntry.type && lastEntry.input === newEntry.input && lastEntry.result === newEntry.result) {
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

  const handleItemPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and a single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setItemPrice(value);
    }
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow empty string, numbers, and a single decimal point
     if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTotalPrice(value);
    }
  };

  const { calculatedTotal, feeAmount: feeAmountForward } = useMemo(() => {
    const price = parseFloat(itemPrice);
    if (!isNaN(price) && price > 0) {
      const fee = price * UBER_FEE_PERCENTAGE;
      const total = price + fee;
      return { calculatedTotal: total, feeAmount: fee };
    }
    return { calculatedTotal: null, feeAmount: null };
  }, [itemPrice]);

  const { calculatedOriginal, feeAmount: feeAmountReverse } = useMemo(() => {
    const total = parseFloat(totalPrice);
    if (!isNaN(total) && total > 0) {
      // Ensure total is greater than the fee it implies
      if (total / (1 + UBER_FEE_PERCENTAGE) > 0) {
         const original = total / (1 + UBER_FEE_PERCENTAGE);
         const fee = total - original;
         return { calculatedOriginal: original, feeAmount: fee };
      }
    }
    return { calculatedOriginal: null, feeAmount: null };
  }, [totalPrice]);


  const handleBlurWithFee = useCallback(() => {
    if (calculatedTotal !== null && feeAmountForward !== null) {
      const price = parseFloat(itemPrice);
       // Only add entry if input price is valid and greater than 0
       if (!isNaN(price) && price > 0) {
         addHistoryEntry({
           type: 'with-fee',
           input: price,
           fee: feeAmountForward,
           result: calculatedTotal,
         });
       }
    }
  }, [itemPrice, calculatedTotal, feeAmountForward]);

  const handleBlurWithoutFee = useCallback(() => {
    if (calculatedOriginal !== null && feeAmountReverse !== null) {
       const total = parseFloat(totalPrice);
        // Only add entry if input total is valid and greater than 0
       if (!isNaN(total) && total > 0) {
         addHistoryEntry({
           type: 'without-fee',
           input: total,
           fee: feeAmountReverse,
           result: calculatedOriginal,
         });
       }
    }
  }, [totalPrice, calculatedOriginal, feeAmountReverse]);


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    // Ensure negative zero is displayed as 0.00
    if (Object.is(numberValue, -0)) {
       return `Rs. 0.00`;
    }
    return `Rs. ${numberValue.toFixed(2)}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Uber Eats Fee Calculator</CardTitle>
        <CardDescription>Calculate prices in Rs. with or without the 30% fee.</CardDescription>
      </CardHeader>
      <CardContent>
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
                onBlur={handleBlurWithFee} // Add entry on blur
                className="bg-secondary focus:ring-accent text-base" // Ensure text size is consistent
                aria-label="Item Price Before Fee"
              />
            </div>

            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="space-y-3 rounded-lg border bg-background p-4">
               <div className="flex justify-between items-center">
                 <Label className="flex items-center gap-2 font-medium text-sm"> {/* Ensure consistent label size */}
                    <Percent className="h-4 w-4 text-accent" />
                    Uber Fee (30%)
                 </Label>
                 <span className={cn("font-semibold text-sm", feeAmountForward !== null ? "text-foreground" : "text-muted-foreground")}> {/* Ensure consistent text size */}
                   {formatCurrency(feeAmountForward)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2 font-medium text-sm"> {/* Ensure consistent label size */}
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
                onBlur={handleBlurWithoutFee} // Add entry on blur
                className="bg-secondary focus:ring-accent text-base" // Ensure text size is consistent
                aria-label="Total Price With Fee"
              />
            </div>

            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </div>

             <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-medium text-sm"> {/* Ensure consistent label size */}
                     <Percent className="h-4 w-4 text-accent" />
                     Uber Fee (30%)
                  </Label>
                  <span className={cn("font-semibold text-sm", feeAmountReverse !== null ? "text-foreground" : "text-muted-foreground")}> {/* Ensure consistent text size */}
                    {formatCurrency(feeAmountReverse)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                 <Label className="flex items-center gap-2 font-medium text-sm"> {/* Ensure consistent label size */}
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
      </CardContent>
      {/* Removed history display and footer */}
    </Card>
  );
}
