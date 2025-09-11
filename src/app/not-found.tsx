import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            Sorry, the page you are looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/posts">View Posts</Link>
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p>If you believe this is an error, please contact us.</p>
        </div>
      </div>
    </main>
  );
}