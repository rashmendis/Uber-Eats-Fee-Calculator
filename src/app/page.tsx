import FeeCalculator from '@/components/fee-calculator';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-secondary">
      <FeeCalculator />
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
