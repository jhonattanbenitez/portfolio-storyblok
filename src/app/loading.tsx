import LoadingSpinner from '../../components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoadingSpinner size="lg" text="Loading page..." />
    </div>
  );
}
