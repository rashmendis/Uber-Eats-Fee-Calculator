
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Currency, Percent, ArrowRight, ArrowLeft } from 'lucide-react'; // Use Currency icon
import { cn } from "@/lib/utils";

const UBER_FEE_PERCENTAGE = 0.30; // 30%

export default function FeeCalculator() {
  const [itemPrice, setItemPrice] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');

  const handleItemPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setItemPrice(value);
    }
  };

  const handleTotalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setTotalPrice(value);
    }
  };

  const { calculatedTotal, feeAmount: feeAmountForward } = useMemo(() => {
    const price = parseFloat(itemPrice);
    if (!isNaN(price) && price > 0) {
      const fee = price * UBER_FEE_PERCENTAGE;
      const total = price + fee;
      return { calculatedTotal: total.toFixed(2), feeAmount: fee.toFixed(2) };
    }
    return { calculatedTotal: null, feeAmount: null };
  }, [itemPrice]);

  const { calculatedOriginal, feeAmount: feeAmountReverse } = useMemo(() => {
    const total = parseFloat(totalPrice);
    if (!isNaN(total) && total > 0) {
      const original = total / (1 + UBER_FEE_PERCENTAGE);
      const fee = total - original;
      return { calculatedOriginal: original.toFixed(2), feeAmount: fee.toFixed(2) };
    }
    return { calculatedOriginal: null, feeAmount: null };
  }, [totalPrice]);

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined || value === '') return '-';
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numberValue)) return '-';
    // Format for Rs.
    return `Rs. ${numberValue.toFixed(2)}`;
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Uber Eats Fee Calculator</CardTitle>
        <CardDescription>Calculate prices in Rs. with or without the 30% fee.</CardDescription> {/* Update currency in description */}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="with-fee" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="with-fee">Price + Fee</TabsTrigger>
            <TabsTrigger value="without-fee">Price - Fee</TabsTrigger>
          </TabsList>
          <TabsContent value="with-fee" className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="item-price" className="flex items-center gap-2">
                <Currency className="h-4 w-4 text-muted-foreground" />
                Item Price (Before Fee)
              </Label>
              <Input
                id="item-price"
                type="text" // Use text to allow decimal input handling
                inputMode="decimal" // Hint for mobile keyboards
                placeholder="e.g., 1000.00"
                value={itemPrice}
                onChange={handleItemPriceChange}
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
                 <span className={cn("font-semibold", feeAmountForward ? "text-foreground" : "text-muted-foreground")}>
                   {formatCurrency(feeAmountForward)}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2 font-medium">
                  <Currency className="h-4 w-4 text-accent" />
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
                <Currency className="h-4 w-4 text-muted-foreground" />
                Total Price (With Fee)
              </Label>
              <Input
                id="total-price"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 1300.00"
                value={totalPrice}
                onChange={handleTotalPriceChange}
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
                  <span className={cn("font-semibold", feeAmountReverse ? "text-foreground" : "text-muted-foreground")}>
                    {formatCurrency(feeAmountReverse)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                 <Label className="flex items-center gap-2 font-medium">
                   <Currency className="h-4 w-4 text-accent" />
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
    </Card>
  );
}
