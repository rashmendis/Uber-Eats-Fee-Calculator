import FeeCalculator from '@/components/fee-calculator';
import { Button } from '@/components/ui/button';
import { History, Settings } from 'lucide-react'; // Import Settings icon
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
      {/* Settings Button Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Link href="/settings" passHref>
          <Button variant="outline" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <FeeCalculator />

      {/* History Button Below Calculator */}
      <div className="mt-6">
        <Link href="/history" passHref>
          <Button variant="outline">
            <History className="mr-2 h-4 w-4" />
            View Calculation History
          </Button>
        </Link>
      </div>
    </main>
  );
}
