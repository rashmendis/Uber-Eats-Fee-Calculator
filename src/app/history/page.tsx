
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Trash2, ArrowLeft, History as HistoryIcon, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from 'next/link';
import type { HistoryEntry } from '@/types/history'; // Import shared type
import { HISTORY_STORAGE_KEY } from '@/lib/constants'; // Import constant

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load history from localStorage on initial client-side mount
  useEffect(() => {
    setIsClient(true);
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        // Basic validation: Check if it's an array
        const parsedHistory = JSON.parse(storedHistory);
        if (Array.isArray(parsedHistory)) {
             // Optional: Add more specific validation for each entry if needed
             const validHistory = parsedHistory.filter(entry =>
               entry && typeof entry === 'object' && entry.id && entry.timestamp && entry.type &&
               typeof entry.input === 'number' &&
               typeof entry.feePercentage === 'number' && // check new field
               typeof entry.fee === 'number' &&
               typeof entry.result === 'number'
             );
            setHistory(validHistory);
             // If filtering removed invalid entries, update localStorage
             if (validHistory.length !== parsedHistory.length) {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(validHistory));
             }
        } else {
             console.warn("Invalid history format found in localStorage. Clearing.");
             localStorage.removeItem(HISTORY_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load or parse history from localStorage:", error);
      // Clear potentially corrupted storage
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  // Function to clear history
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
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
    return `${(value * 100).toFixed(1)}%`; // Show one decimal place
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
       <Card className="w-full max-w-3xl shadow-lg"> {/* Increased max-width for new column */}
          <CardHeader>
             <div className="flex items-center justify-between mb-4">
               <Link href="/" passHref>
                 <Button variant="outline" size="icon" aria-label="Back to Calculator">
                   <ArrowLeft className="h-4 w-4" />
                 </Button>
               </Link>
               <CardTitle className="text-2xl font-bold flex items-center gap-2">
                 <HistoryIcon className="h-6 w-6" />
                 Calculation History
               </CardTitle>
                <div className="w-10"> {/* Adjusted width */}
                 {isClient && history.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={clearHistory} aria-label="Clear history">
                      <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
                      <span className="hidden sm:inline ml-1">Clear</span>
                    </Button>
                  )}
                  {/* Keep the space even if button isn't shown */}
                  {(!isClient || history.length === 0) && <div className="h-9 w-10"></div>}
                </div>
             </div>
             <CardDescription>
               Review your past calculations, including the fee percentage used.
             </CardDescription>
           </CardHeader>
        <CardContent>
          {!isClient ? (
            // Skeleton loading state
            <div className="space-y-2 mt-4">
              <Skeleton className="h-12 w-full rounded-md" /> {/* Header */}
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              No history yet. Go back and make some calculations!
            </div>
          ) : (
             <>
              <ScrollArea className="h-[450px] rounded-md border mt-4"> {/* Increased height */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] sm:w-[180px]">Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Input (Rs.)</TableHead>
                      <TableHead className="text-right w-[70px]">Fee (%)</TableHead> {/* New Column */}
                      <TableHead className="text-right">Fee (Rs.)</TableHead>
                      <TableHead className="text-right">Result (Rs.)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), 'PPp')} {/* Simplified format */}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.type === 'with-fee' ? 'Price + Fee' : 'Price - Fee'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.input)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                           {formatPercentage(entry.feePercentage)}
                           {/* <Percent className="h-3 w-3" /> */} {/* Optional: Add % icon */}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(entry.fee)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(entry.result)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
             </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
