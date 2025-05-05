// src/app/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Settings as SettingsIcon, Percent } from 'lucide-react';
import Link from 'next/link';
import { SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE } from '@/lib/constants';

interface SettingsData {
  feePercentage: number;
}

export default function SettingsPage() {
  const [feePercentageInput, setFeePercentageInput] = useState<string>('');
  const [currentFeePercentage, setCurrentFeePercentage] = useState<number>(DEFAULT_FEE_PERCENTAGE);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const settings: SettingsData = JSON.parse(storedSettings);
        // Validate loaded data
        if (settings.feePercentage !== undefined && typeof settings.feePercentage === 'number' && settings.feePercentage >= 0 && settings.feePercentage <= 1) {
          setCurrentFeePercentage(settings.feePercentage);
          setFeePercentageInput((settings.feePercentage * 100).toString());
        } else {
          // Use default if stored data is invalid
          setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
          // Optionally save the default back if invalid data was found
           localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ feePercentage: DEFAULT_FEE_PERCENTAGE }));
        }
      } else {
        // Use default if no settings found
        setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
       // Optionally clear corrupted storage
      // localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and a single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Limit to reasonable percentage range (e.g., 0-100) visually
       const numericValue = parseFloat(value);
       if (isNaN(numericValue) || (numericValue >= 0 && numericValue <= 100)) {
           setFeePercentageInput(value);
       } else if (numericValue < 0) {
           setFeePercentageInput('0');
       } else if (numericValue > 100) {
            setFeePercentageInput('100');
       }
    }
  };

  const saveSettings = () => {
    const percentageValue = parseFloat(feePercentageInput);
    if (isNaN(percentageValue) || percentageValue < 0 || percentageValue > 100) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid fee percentage between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    const newFeePercentage = percentageValue / 100;
    const newSettings: SettingsData = { feePercentage: newFeePercentage };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setCurrentFeePercentage(newFeePercentage); // Update state to reflect saved value
      toast({
        title: "Settings Saved",
        description: `Fee percentage updated to ${percentageValue.toFixed(2)}%.`,
      });
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
      toast({
        title: "Error Saving",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Link href="/" passHref>
              <Button variant="outline" size="icon" aria-label="Back to Calculator">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              Settings
            </CardTitle>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
          <CardDescription>
            Configure the calculator settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
             <div className="space-y-2">
               <Skeleton className="h-5 w-1/3" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-24 mt-4" />
             </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fee-percentage" className="flex items-center gap-1">
                Uber Fee Percentage <Percent className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="fee-percentage"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 30"
                value={feePercentageInput}
                onChange={handleFeeChange}
                className="bg-background focus:ring-accent text-base"
                aria-label="Fee Percentage"
              />
               <p className="text-xs text-muted-foreground">
                  Enter the percentage value (e.g., 30 for 30%). Current value: {(currentFeePercentage * 100).toFixed(2)}%
               </p>
            </div>
          )}

          {!isLoading && (
             <Button onClick={saveSettings} disabled={isLoading}>
               Save Settings
             </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
