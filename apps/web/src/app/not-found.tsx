import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span className="text-sm font-semibold text-muted-foreground">404</span>
      </div>
      <div>
        <h1 className="text-base font-semibold">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The page you opened is not available.
        </p>
      </div>
      <Button render={<Link href="/documents" />}>Back to documents</Button>
    </main>
  );
}
