
// src/components/settings-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose, // Import DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Percent, X } from 'lucide-react'; // Import X for close button
import { SETTINGS_STORAGE_KEY, DEFAULT_FEE_PERCENTAGE } from '@/lib/constants';

interface SettingsData {
  feePercentage: number;
}

export default function SettingsModal() {
  const [feePercentageInput, setFeePercentageInput] = useState<string>('');
  const [currentFeePercentage, setCurrentFeePercentage] = useState<number>(DEFAULT_FEE_PERCENTAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // Control dialog state
  const { toast } = useToast();

  // Effect to load settings when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      try {
        const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
          const settings: SettingsData = JSON.parse(storedSettings);
          if (settings.feePercentage !== undefined && typeof settings.feePercentage === 'number' && settings.feePercentage >= 0 && settings.feePercentage <= 1) {
            setCurrentFeePercentage(settings.feePercentage);
            setFeePercentageInput((settings.feePercentage * 100).toString());
          } else {
            setCurrentFeePercentage(DEFAULT_FEE_PERCENTAGE);
            setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ feePercentage: DEFAULT_FEE_PERCENTAGE }));
          }
        } else {
          setCurrentFeePercentage(DEFAULT_FEE_PERCENTAGE);
          setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage:", error);
        setCurrentFeePercentage(DEFAULT_FEE_PERCENTAGE);
        setFeePercentageInput((DEFAULT_FEE_PERCENTAGE * 100).toString());
      } finally {
        setIsLoading(false);
      }
    }
  }, [isOpen]); // Rerun when dialog opens

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
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
      setCurrentFeePercentage(newFeePercentage);
      toast({
        title: "Settings Saved",
        description: `Fee percentage updated to ${percentageValue.toFixed(2)}%.`,
      });
      // Trigger storage event for other components
      window.dispatchEvent(new StorageEvent('storage', {
          key: SETTINGS_STORAGE_KEY,
          newValue: JSON.stringify(newSettings),
          storageArea: localStorage,
      }));
      setIsOpen(false); // Close dialog on save
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
      toast({
        title: "Error Saving",
        description: "Could not save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const displaySavedPercentage = (currentFeePercentage * 100).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open Settings">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" /> Settings
          </DialogTitle>
          <DialogDescription>
            Configure the calculator fee percentage. Changes are saved locally.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-4/5 mt-1" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="fee-percentage-modal" className="flex items-center gap-1">
                Uber Fee Percentage <Percent className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Input
                id="fee-percentage-modal"
                type="text"
                inputMode="decimal"
                placeholder="e.g., 30"
                value={feePercentageInput}
                onChange={handleFeeChange}
                className="bg-background focus:ring-accent text-base"
                aria-label="Fee Percentage"
              />
              <p className="text-xs text-muted-foreground">
                Enter percentage (0-100). Current: {displaySavedPercentage}%
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={saveSettings} disabled={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
