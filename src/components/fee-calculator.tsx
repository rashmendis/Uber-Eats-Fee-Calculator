
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Percent, ArrowRight, ArrowLeft, Trash2, History } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns'; // For timestamp formatting

const UBER_FEE_PERCENTAGE = 0.30; // 30%
const HISTORY_STORAGE_KEY = 'uberFeeCalculatorHistory';
const MAX_HISTORY_LENGTH = 20; // Limit the number of history entries

interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'with-fee' | 'without-fee';
  input: number;
  fee: number;
  result: number;
}

export default function FeeCalculator() {
  const [itemPrice, setItemPrice] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'with-fee' | 'without-fee'>('with-fee');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false); // To prevent hydration errors with localStorage

  // Load history from localStorage on initial client-side mount
  useEffect(() => {
    setIsClient(true); // Indicate client-side rendering is complete
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
      // Optionally clear corrupted storage
      // localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isClient) return; // Only run on client after initial mount
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to localStorage:", error);
    }
  }, [history, isClient]);


  const handleItemPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setItemPrice(value);
    }
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
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
      const original = total / (1 + UBER_FEE_PERCENTAGE);
      const fee = total - original;
      return { calculatedOriginal: original, feeAmount: fee };
    }
    return { calculatedOriginal: null, feeAmount: null };
  }, [totalPrice]);

  const addHistoryEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    setHistory(prevHistory => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      // Avoid adding exact duplicate of the most recent entry
      if (prevHistory.length > 0) {
        const lastEntry = prevHistory[0];
        if (lastEntry.type === newEntry.type && lastEntry.input === newEntry.input) {
          return prevHistory;
        }
      }

      const updatedHistory = [newEntry, ...prevHistory];
      // Limit history size
      return updatedHistory.slice(0, MAX_HISTORY_LENGTH);
    });
  }, []);

  const handleBlurWithFee = () => {
    if (calculatedTotal !== null && feeAmountForward !== null) {
      const price = parseFloat(itemPrice);
       if (!isNaN(price) && price > 0) {
         addHistoryEntry({
           type: 'with-fee',
           input: price,
           fee: feeAmountForward,
           result: calculatedTotal,
         });
       }
    }
  };

  const handleBlurWithoutFee = () => {
    if (calculatedOriginal !== null && feeAmountReverse !== null) {
       const total = parseFloat(totalPrice);
       if (!isNaN(total) && total > 0) {
         addHistoryEntry({
           type: 'without-fee',
           input: total,
           fee: feeAmountReverse,
           result: calculatedOriginal,
         });
       }
    }
  };


  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    return `Rs. ${numberValue.toFixed(2)}`;
  };

  const clearHistory = () => {
    setHistory([]);
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
                <span className="inline-block w-4 text-center text-muted-foreground">Rs.</span>
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
                className="bg-secondary focus:ring-accent"
              />
            </div>

            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="space-y-3 rounded-lg border bg-background p-4">
               <div className="flex justify-between items-center">
                 <Label className="flex items-center gap-2 font-medium">
                    <Percent className="h-4 w-4 text-accent" />
                    Uber Fee (30%)
                 </Label>
                 <span className={cn("font-semibold", feeAmountForward !== null ? "text-foreground" : "text-muted-foreground")}>
                   {formatCurrency(feeAmountForward)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2 font-medium">
                  <span className="inline-block w-4 text-center text-accent">Rs.</span>
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
                 <span className="inline-block w-4 text-center text-muted-foreground">Rs.</span>
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
                className="bg-secondary focus:ring-accent"
              />
            </div>

            <div className="flex items-center justify-center text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </div>

             <div className="space-y-3 rounded-lg border bg-background p-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2 font-medium">
                     <Percent className="h-4 w-4 text-accent" />
                     Uber Fee (30%)
                  </Label>
                  <span className={cn("font-semibold", feeAmountReverse !== null ? "text-foreground" : "text-muted-foreground")}>
                    {formatCurrency(feeAmountReverse)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                 <Label className="flex items-center gap-2 font-medium">
                   <span className="inline-block w-4 text-center text-accent">Rs.</span>
                   Original Item Price (Before Fee)
                 </Label>
                 <span className="text-lg font-bold text-accent">
                    {formatCurrency(calculatedOriginal)}
                 </span>
               </div>
             </div>
          </TabsContent>
        </Tabs>

        {isClient && history.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </h3>
              <Button variant="outline" size="sm" onClick={clearHistory} aria-label="Clear history">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-[200px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Timestamp</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Input</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'PPpp')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.type === 'with-fee' ? 'Price + Fee' : 'Price - Fee'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.input)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(entry.fee)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(entry.result)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
       {/* Add a subtle footer if needed, or remove if empty */}
       {/* <CardFooter className="pt-4 text-center text-xs text-muted-foreground">
          History is stored locally in your browser.
       </CardFooter> */}
    </Card>
  );
}
