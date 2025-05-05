
'use client';

import React, { useState, useEffect } from 'react';
import { CardHeader } from "@/components/ui/card"; // Only CardHeader is needed now
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Info } from 'lucide-react'; // Added Info icon
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history';
import { HISTORY_STORAGE_KEY, DEFAULT_CURRENCY_SYMBOL } from '@/lib/constants'; // Import default currency
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

export default function HistoryView() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Function to load history from localStorage
  const loadHistory = () => {
    if (typeof window === 'undefined') return; // Ensure runs only on client
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
          // Validate and ensure required fields exist, adding defaults if necessary
          const validHistory = parsedHistory.filter(entry =>
            entry && typeof entry === 'object' && entry.id && entry.timestamp && entry.type &&
            typeof entry.input === 'number' &&
            typeof entry.feePercentage === 'number' &&
            typeof entry.fee === 'number' &&
            typeof entry.result === 'number'
          ).map(entry => ({
             ...entry,
             currencySymbol: typeof entry.currencySymbol === 'string' && entry.currencySymbol.trim().length > 0 ? entry.currencySymbol.trim() : DEFAULT_CURRENCY_SYMBOL,
             // Add defaults for potentially missing discount fields for backwards compatibility
             discountPercentage: typeof entry.discountPercentage === 'number' ? entry.discountPercentage : 0,
             discountAmount: typeof entry.discountAmount === 'number' ? entry.discountAmount : 0,
             finalPrice: typeof entry.finalPrice === 'number' ? entry.finalPrice : (entry.type === 'with-fee' ? entry.result : entry.input) // Simple fallback
          }));

          setHistory(validHistory);
          // Save back if any entries were corrected
          if (JSON.stringify(validHistory) !== storedHistory) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(validHistory));
          }
        } else {
          console.warn("Invalid history format found in localStorage. Clearing.");
          localStorage.removeItem(HISTORY_STORAGE_KEY);
          setHistory([]); // Clear state as well
        }
      } else {
         setHistory([]); // No history found
      }
    } catch (error) {
      console.error("Failed to load or parse history from localStorage:", error);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      setHistory([]); // Clear state on error
    }
  };

  // Load history on initial client-side mount and listen for storage changes
  useEffect(() => {
    setIsClient(true);
    loadHistory(); // Initial load

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === HISTORY_STORAGE_KEY || event.key === null) { // event.key is null for clear()
        loadHistory(); // Reload history if it changes in another tab or is cleared
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to clear history
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      // Dispatch event to notify other potential listeners (though unlikely needed for simple clear)
      window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_STORAGE_KEY, newValue: null, storageArea: localStorage }));
    } catch (error) {
      console.error("Failed to clear history from localStorage:", error);
    }
  };

  const formatCurrency = (value: number | null, symbol: string) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    const displaySymbol = symbol || DEFAULT_CURRENCY_SYMBOL;
    // Handle negative zero
    if (Object.is(value, -0)) return `${displaySymbol} 0.00`;
    if (!isFinite(value)) return 'N/A'; // Handle Infinity
    return `${displaySymbol} ${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  // Determine label based on calculation type
  const getInputLabel = (type: HistoryEntry['type']) => {
      return type === 'with-fee' ? 'Desired Price' : 'Customer Price';
  };
  const getResultLabel = (type: HistoryEntry['type']) => {
      return type === 'with-fee' ? 'SP (Before Disc)' : 'Seller Receives';
  };
  const getFinalPriceLabel = (type: HistoryEntry['type']) => {
      return type === 'with-fee' ? 'Customer Price' : 'SP (Before Disc)';
  };


  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
      <div className="w-full"> {/* Removed Card wrapper */}
        <CardHeader className="pt-4 pb-2 px-4 flex flex-row items-center justify-between">
            <div className="flex-1"></div> {/* Spacer */}
            {isClient && history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} aria-label="Clear history" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
             {(!isClient || history.length === 0) && <div className="h-9 w-[76px]"></div>} {/* Placeholder to prevent layout shift */}
        </CardHeader>
        <div className="px-0 pb-2 pt-0"> {/* Removed CardContent */}
          {!isClient ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 px-4">
              No history yet. Make some calculations!
            </div>
          ) : (
            <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto border rounded-lg mx-4 mb-4 relative">
              {/* Use border-collapse on table */}
              <Table className="w-full border-collapse">
                {/* Sticky header */}
                <TableHeader className="sticky top-0 z-10 bg-card border-b">
                  {/* Remove hover effect from header row */}
                  <TableRow className="hover:bg-transparent">
                     {/* Use px-3 py-2 sm:px-4 sm:py-3 consistently for padding */}
                     {/* Add whitespace-nowrap to prevent wrapping */}
                     {/* Add border-r to cells for vertical lines */}
                     <TableHead className="px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Timestamp</TableHead>
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Input</TableHead>
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Fee (%)</TableHead>
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Disc (%)</TableHead> {/* Discount % */}
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Fee</TableHead>
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">Discount</TableHead> {/* Discount Amt */}
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">
                        Result
                        <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top">
                              <p className="text-xs">With-Fee: SP (Before Disc)<br/>Without-Fee: Seller Receives</p>
                           </TooltipContent>
                        </Tooltip>
                     </TableHead>
                     <TableHead className="text-right px-3 py-2 sm:px-4 sm:py-3 whitespace-nowrap"> {/* Last column doesn't need border-r */}
                        Final Price
                        <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top">
                               <p className="text-xs">With-Fee: Customer Price<br/>Without-Fee: SP (Before Disc)</p>
                           </TooltipContent>
                        </Tooltip>
                     </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    // Ensure border-b is applied correctly, last:border-b-0 removes border from last row
                    <TableRow key={entry.id} className="border-b last:border-b-0">
                      {/* Consistent padding and border */}
                      <TableCell className="text-xs text-muted-foreground px-3 py-2 sm:px-4 sm:py-3 truncate border-r">
                        {format(new Date(entry.timestamp), 'PPp')}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-3 border-r">
                          {/* Helper text for input type */}
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getInputLabel(entry.type)}</span>
                          {formatCurrency(entry.input, entry.currencySymbol)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground px-3 py-2 sm:px-4 sm:py-3 border-r">
                        {formatPercentage(entry.feePercentage)}
                      </TableCell>
                       <TableCell className="text-right text-xs text-muted-foreground px-3 py-2 sm:px-4 sm:py-3 border-r">
                        {formatPercentage(entry.discountPercentage)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm text-muted-foreground px-3 py-2 sm:px-4 sm:py-3 border-r">{formatCurrency(entry.fee, entry.currencySymbol)}</TableCell>
                       <TableCell className="text-right text-xs sm:text-sm text-muted-foreground px-3 py-2 sm:px-4 sm:py-3 border-r">
                         {formatCurrency(entry.discountAmount, entry.currencySymbol)}
                       </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-3 border-r">
                          {/* Helper text for result type */}
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getResultLabel(entry.type)}</span>
                          {formatCurrency(entry.result, entry.currencySymbol)}
                      </TableCell>
                       <TableCell className="text-right text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-3"> {/* Last column */}
                          {/* Helper text for final price type */}
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getFinalPriceLabel(entry.type)}</span>
                          {formatCurrency(entry.finalPrice, entry.currencySymbol)}
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
