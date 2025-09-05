import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background">
      <h1 className="text-4xl font-bold mb-4 text-destructive">404 - Page Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Go Home
      </Link>
    </main>
  );
}