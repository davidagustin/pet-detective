import { Suspense } from 'react';
import CloudinaryExamples from '../../components/CloudinaryExamples';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600 dark:text-gray-400">Loading Cloudinary demo...</div>
    </div>
  );
}

export default function CloudinaryDemoPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CloudinaryExamples />
    </Suspense>
  );
}
