'use client';

import { useEffect } from 'react';
import { Button } from '../../components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-destructive mb-4">500</h1>
          <h2 className="text-2xl font-semibold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-8">
            We're sorry, but something unexpected happened. Please try again.
          </p>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="space-y-4">
          <Button onClick={reset} className="w-full">
            Try Again
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/">Go Home</a>
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p>If this problem persists, please contact us.</p>
        </div>
      </div>
    </main>
  );
}
