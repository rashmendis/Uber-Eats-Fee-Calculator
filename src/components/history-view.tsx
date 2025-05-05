
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

// Props for the component, including the filter type
interface HistoryViewProps {
  filterType: HistoryEntry['type'] | 'all'; // 'selling-price', 'payout', or 'all'
}


export default function HistoryView({ filterType }: HistoryViewProps) {
  const [allHistory, setAllHistory] = useState<HistoryEntry[]>([]);
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
            typeof entry.result === 'number' &&
            (entry.type === 'selling-price' || entry.type === 'payout') // Validate type
          ).map(entry => {
             // Ensure finalPrice exists and makes sense based on type and discount
            let defaultFinalPrice = 0;
            // Final Price (Customer Pays) is always SP Before Discount * (1 - Discount%)
            // For 'selling-price' type, result is SP Before Discount
            // For 'payout' type, input is SP Before Discount (though payout history isn't saved currently)
            const spBeforeDiscount = entry.type === 'selling-price' ? entry.result : entry.input;
            const discountPercentage = typeof entry.discountPercentage === 'number' ? entry.discountPercentage : 0; // Ensure discount exists

            if (typeof spBeforeDiscount === 'number') {
              defaultFinalPrice = spBeforeDiscount * (1 - discountPercentage);
            } else {
               // Fallback if data is somehow inconsistent
               defaultFinalPrice = entry.result; // Less ideal fallback
            }


             return {
                ...entry,
                currencySymbol: typeof entry.currencySymbol === 'string' && entry.currencySymbol.trim().length > 0 ? entry.currencySymbol.trim() : DEFAULT_CURRENCY_SYMBOL,
                // Add defaults for potentially missing discount fields for backwards compatibility
                discountPercentage: discountPercentage,
                discountAmount: typeof entry.discountAmount === 'number' ? entry.discountAmount : 0,
                // Use calculated defaultFinalPrice if finalPrice is missing or invalid
                finalPrice: typeof entry.finalPrice === 'number' && isFinite(entry.finalPrice) ? entry.finalPrice : defaultFinalPrice
             }
          });

          setAllHistory(validHistory);
          // Save back if any entries were corrected
          if (JSON.stringify(validHistory) !== storedHistory) {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(validHistory));
          }
        } else {
          console.warn("Invalid history format found in localStorage. Clearing.");
          localStorage.removeItem(HISTORY_STORAGE_KEY);
          setAllHistory([]); // Clear state as well
        }
      } else {
         setAllHistory([]); // No history found
      }
    } catch (error) {
      console.error("Failed to load or parse history from localStorage:", error);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      setAllHistory([]); // Clear state on error
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

  // Filter history based on the prop
  const filteredHistory = useMemo(() => {
    if (filterType === 'all') {
      return allHistory;
    }
    return allHistory.filter(entry => entry.type === filterType);
  }, [allHistory, filterType]);


  // Function to clear history (clears ALL history regardless of filter)
  const clearHistory = () => {
    setAllHistory([]);
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

  // Determine label based on calculation type - Updated labels
  const getInputLabel = (type: HistoryEntry['type']) => {
      // For 'selling-price' type, input is 'Desired Payout'
      // For 'payout' type (not currently saved), input would be item details
      return type === 'selling-price' ? 'Desired Payout' : 'Input';
  };
  const getResultLabel = (type: HistoryEntry['type']) => {
      // For 'selling-price' type, result is 'SP (Before Disc)'
      // For 'payout' type, result would be 'Total Payout'
      return type === 'selling-price' ? 'SP (Before Disc)' : 'Result';
  };
  const getFinalPriceLabel = () => { // Final Price always means Customer Price now
      return 'Customer Price';
  };


  return (
    <TooltipProvider> {/* Wrap with TooltipProvider */}
      {/* Container for the history table and clear button */}
      <div className="w-full bg-card border rounded-lg shadow-sm">
        {/* Header with Clear Button */}
        <CardHeader className="pt-4 pb-2 px-4 flex flex-row items-center justify-between border-b">
            <div className="flex-1"></div> {/* Spacer */}
            {/* Show clear button only if there's history and it's client-side */}
            {isClient && allHistory.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} aria-label="Clear history" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All History
              </Button>
            )}
             {/* Placeholder to prevent layout shift when button isn't rendered */}
             {(!isClient || allHistory.length === 0) && <div className="h-9 w-[150px]"></div>}
        </CardHeader>

        {/* Table container */}
        <div className="px-0 pb-2 pt-0">
          {!isClient ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 px-4">
              No {filterType !== 'all' ? `${filterType.replace('-', ' ')}` : ''} history yet.
            </div>
          ) : (
             <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto border-t rounded-b-lg mx-0 mb-0 relative"> {/* Container for sticky header, adjusted border/margins */}
              <Table className="w-full border-collapse"> {/* Use border-collapse */}
                {/* Sticky header */}
                <TableHeader className="sticky top-0 z-10 bg-card border-b">
                  <TableRow className="hover:bg-transparent"> {/* Remove hover */}
                     {/* Add border-r for vertical lines */}
                     {/* Reduced padding in TableHead via ui/table.tsx */}
                     <TableHead className="whitespace-nowrap border-r">Timestamp</TableHead>
                     <TableHead className="text-right whitespace-nowrap border-r">
                        {getInputLabel(filterType === 'all' ? 'selling-price' : filterType)} {/* Dynamic label */}
                        <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top">
                              <p className="text-xs">Selling Price Calc: Desired Payout<br/>Payout Calc: SP (Before Disc)</p>
                           </TooltipContent>
                        </Tooltip>
                     </TableHead>
                     <TableHead className="text-right whitespace-nowrap border-r">Fee</TableHead>
                     <TableHead className="text-right whitespace-nowrap border-r">Offer / Discount</TableHead>
                     <TableHead className="text-right whitespace-nowrap border-r">
                        {getResultLabel(filterType === 'all' ? 'selling-price' : filterType)} {/* Dynamic label */}
                        <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top">
                              <p className="text-xs">Selling Price Calc: SP (Before Disc)<br/>Payout Calc: Payout</p>
                           </TooltipContent>
                        </Tooltip>
                     </TableHead>
                     <TableHead className="text-right whitespace-nowrap"> {/* No border-r */}
                        {getFinalPriceLabel()}
                        <Tooltip delayDuration={100}>
                           <TooltipTrigger asChild>
                              <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-help" />
                           </TooltipTrigger>
                           <TooltipContent side="top">
                               <p className="text-xs">Always the final price the Customer Pays (after discount).</p>
                           </TooltipContent>
                        </Tooltip>
                     </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id} className="border-b last:border-b-0"> {/* Ensure border-b */}
                      {/* Consistent padding and border */}
                      {/* Reduced padding in TableCell via ui/table.tsx */}
                      <TableCell className="text-xs text-muted-foreground truncate border-r whitespace-nowrap">
                        {format(new Date(entry.timestamp), 'PPp')}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm border-r whitespace-nowrap">
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getInputLabel(entry.type)}</span>
                          {formatCurrency(entry.input, entry.currencySymbol)}
                      </TableCell>
                       <TableCell className="text-right text-xs sm:text-sm border-r whitespace-nowrap">
                         <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{formatPercentage(entry.feePercentage)}</span>
                         {formatCurrency(entry.fee, entry.currencySymbol)}
                       </TableCell>
                       <TableCell className="text-right text-xs sm:text-sm border-r whitespace-nowrap">
                         <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{formatPercentage(entry.discountPercentage)}</span>
                         {formatCurrency(entry.discountAmount, entry.currencySymbol)}
                       </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium border-r whitespace-nowrap">
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getResultLabel(entry.type)}</span>
                          {formatCurrency(entry.result, entry.currencySymbol)}
                      </TableCell>
                       <TableCell className="text-right text-xs sm:text-sm font-medium whitespace-nowrap"> {/* Last column */}
                          <span className="block text-muted-foreground text-[0.65rem] leading-tight -mb-0.5">{getFinalPriceLabel()}</span>
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
