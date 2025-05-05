
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, History as HistoryIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import type { HistoryEntry } from '@/types/history';
import { HISTORY_STORAGE_KEY } from '@/lib/constants';

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
          const validHistory = parsedHistory.filter(entry =>
            entry && typeof entry === 'object' && entry.id && entry.timestamp && entry.type &&
            typeof entry.input === 'number' &&
            typeof entry.feePercentage === 'number' &&
            typeof entry.fee === 'number' &&
            typeof entry.result === 'number'
          );
          setHistory(validHistory);
          if (validHistory.length !== parsedHistory.length) {
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
      // Optional: Dispatch a storage event manually if needed for immediate cross-component update
      // window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_STORAGE_KEY, newValue: null, storageArea: localStorage }));
    } catch (error) {
      console.error("Failed to clear history from localStorage:", error);
    }
  };

  // Function to format currency
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    if (Object.is(value, -0)) return `Rs. 0.00`;
    return `Rs. ${value.toFixed(2)}`;
  };

  // Function to format percentage
  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="w-full"> {/* Removed Card wrapper, as parent Accordion provides structure */}
      <CardHeader className="pt-4 pb-2"> {/* Adjusted padding */}
        <div className="flex items-center justify-between">
           {/* Title moved within AccordionTrigger */}
          <div className="flex-1"></div> {/* Spacer */}
          {isClient && history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} aria-label="Clear history" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
           {(!isClient || history.length === 0) && <div className="h-9 w-[76px]"></div>} {/* Placeholder for button */}
        </div>
        {/* Description can be optional or integrated elsewhere */}
        {/* <CardDescription>Review your past calculations.</CardDescription> */}
      </CardHeader>
      <CardContent className="p-0"> {/* Remove padding for seamless integration */}
        {!isClient ? (
          <div className="space-y-2 p-4"> {/* Add padding for skeleton */}
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 px-4">
            No history yet. Make some calculations!
          </div>
        ) : (
          // Removed border and rounded-md as Accordion provides it
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px] sm:w-[160px] px-3 sm:px-4">Timestamp</TableHead>
                  <TableHead className="px-3 sm:px-4">Type</TableHead>
                  <TableHead className="text-right px-3 sm:px-4">Input</TableHead>
                  <TableHead className="text-right w-[60px] px-3 sm:px-4">Fee (%)</TableHead>
                  <TableHead className="text-right px-3 sm:px-4">Fee</TableHead>
                  <TableHead className="text-right px-3 sm:px-4">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground px-3 sm:px-4">
                      {format(new Date(entry.timestamp), 'PPp')}
                    </TableCell>
                    <TableCell className="text-sm px-3 sm:px-4">
                      {entry.type === 'with-fee' ? 'Price + Fee' : 'Price - Fee'}
                    </TableCell>
                    <TableCell className="text-right px-3 sm:px-4">{formatCurrency(entry.input)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground px-3 sm:px-4">
                      {formatPercentage(entry.feePercentage)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground px-3 sm:px-4">{formatCurrency(entry.fee)}</TableCell>
                    <TableCell className="text-right font-medium px-3 sm:px-4">{formatCurrency(entry.result)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </div>
  );
}
