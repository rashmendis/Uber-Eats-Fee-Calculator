
import FeeCalculator from '@/components/fee-calculator';
import SettingsModal from '@/components/settings-modal'; // Corrected import path if needed
import HistoryView from '@/components/history-view';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { History } from 'lucide-react';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
      {/* Settings Modal Trigger Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <SettingsModal />
      </div>

      <FeeCalculator />

      {/* History Accordion Below Calculator */}
      <div className="w-full max-w-lg mt-6"> {/* Changed max-w-md to max-w-lg */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="history">
            <AccordionTrigger className="text-sm font-medium hover:no-underline justify-center data-[state=closed]:bg-card data-[state=closed]:border data-[state=closed]:rounded-lg data-[state=closed]:shadow-sm data-[state=open]:rounded-t-lg data-[state=open]:border-x data-[state=open]:border-t data-[state=open]:bg-card data-[state=open]:shadow-sm px-4 py-3">
               <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <span>View Calculation History</span>
               </div>
            </AccordionTrigger>
            <AccordionContent className="bg-card border-x border-b rounded-b-lg shadow-sm"> {/* Removed p-0 */}
              {/* HistoryView component will be rendered inside the content */}
              <HistoryView />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </main>
  );
}
