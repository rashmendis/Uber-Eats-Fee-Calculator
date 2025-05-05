
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ArrowLeft, History as HistoryIcon } from 'lucide-react'; // Renamed History to HistoryIcon
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from 'next/link'; // Import Link for navigation

const HISTORY_STORAGE_KEY = 'uberFeeCalculatorHistory';

interface HistoryEntry {
  id: string;
  timestamp: number;
  type: 'with-fee' | 'without-fee';
  input: number;
  fee: number;
  result: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

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
    if (value === null || value === undefined) return '-';
    if (isNaN(value)) return '-';
     // Ensure negative zero is displayed as 0.00
     if (Object.is(value, -0)) {
        return `Rs. 0.00`;
     }
    return `Rs. ${value.toFixed(2)}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
       <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
             <div className="flex items-center justify-between mb-4">
               <Link href="/" passHref>
                 <Button variant="outline" size="icon" aria-label="Back to Calculator">
                   <ArrowLeft className="h-4 w-4" />
                 </Button>
               </Link>
               <CardTitle className="text-2xl font-bold flex items-center gap-2">
                 <HistoryIcon className="h-6 w-6" /> {/* Use renamed icon */}
                 Calculation History
               </CardTitle>
                {/* Add a spacer or adjust layout if needed */}
                <div className="w-10"> {/* Placeholder for alignment */}
                 {isClient && history.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearHistory} aria-label="Clear history">
                      <Trash2 className="h-4 w-4 mr-1 sm:mr-0" />
                      <span className="hidden sm:inline ml-1">Clear</span>
                    </Button>
                  )}
                </div>
             </div>
             <CardDescription>
               Review your past Uber Eats fee calculations.
             </CardDescription>
           </CardHeader>
        <CardContent>
          {isClient && history.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              No history yet. Go back and make some calculations!
            </div>
          ) : isClient && history.length > 0 ? (
             <>
              {/* Moved Clear button to header for better visibility */}
              <ScrollArea className="h-[400px] rounded-md border mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] sm:w-[180px]">Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Input (Rs.)</TableHead>
                      <TableHead className="text-right">Fee (Rs.)</TableHead>
                      <TableHead className="text-right">Result (Rs.)</TableHead>
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
             </>
          ) : (
            // Optional: Skeleton loading state while waiting for client-side mount
            <div className="space-y-4 mt-4">
              <div className="h-10 bg-muted rounded-md animate-pulse"></div>
              <div className="h-40 bg-muted rounded-md animate-pulse"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
