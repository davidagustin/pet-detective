'use client';

import React from 'react';
import CloudinaryImage from './CloudinaryImage';
import ImageEffects from './ImageEffects';
import { getCloudinaryImageUrl } from '../lib/cloudinary';

export default function CloudinaryExamples() {
  const samplePublicId = "pet-detective/Abyssinian_1"; // A sample image that should be uploaded

  return (
    <div className="container mx-auto p-4 space-y-8 dark:bg-gray-900 dark:text-gray-100">
      <h2 className="text-4xl font-bold text-center mb-8">Cloudinary Image Examples</h2>

      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">1. Basic Image Display</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Using the <code>CloudinaryImage</code> component to display an image with specified width and height.
        </p>
        <div className="flex justify-center">
          <CloudinaryImage
            publicId={samplePublicId}
            alt="Abyssinian Cat"
            width={600}
            height={400}
            className="rounded-md shadow-md"
          />
        </div>
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mt-4 text-sm overflow-x-auto">
          <code>
            {`<CloudinaryImage\n  publicId="${samplePublicId}"\n  alt="Abyssinian Cat"\n  width={600}\n  height={400}\n/>`}
          </code>
        </pre>
      </section>

      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">2. Responsive Image with Sizes</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          The <code>CloudinaryImage</code> component leverages Next.js Image for responsive loading.
        </p>
        <div className="flex justify-center">
          <CloudinaryImage
            publicId={samplePublicId}
            alt="Abyssinian Cat Responsive"
            width={1200}
            height={800}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="rounded-md shadow-md w-full h-auto"
          />
        </div>
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mt-4 text-sm overflow-x-auto">
          <code>
            {`<CloudinaryImage\n  publicId="${samplePublicId}"\n  alt="Abyssinian Cat Responsive"\n  width={1200}\n  height={800}\n  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"\n/>`}
          </code>
        </pre>
      </section>

      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">3. Dynamic Image Effects</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Use the <code>ImageEffects</code> component to apply various Cloudinary transformations on the fly.
        </p>
        <ImageEffects filename="Abyssinian_1.jpg" alt="Abyssinian Cat with Effects" />
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mt-4 text-sm overflow-x-auto">
          <code>
            {`<ImageEffects filename="Abyssinian_1.jpg" alt="Abyssinian Cat with Effects" />`}
          </code>
        </pre>
      </section>

      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-2xl font-semibold mb-4">4. Direct URL Generation</h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          You can also generate Cloudinary URLs directly using <code>getCloudinaryImageUrl</code>.
        </p>
        <div className="flex justify-center mb-4">
          <img
            src={getCloudinaryImageUrl(samplePublicId, { width: 300, height: 300, crop: 'fill', effect: 'e_sepia' })}
            alt="Sepia Abyssinian"
            className="rounded-md shadow-md"
          />
        </div>
        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mt-4 text-sm overflow-x-auto">
          <code>
            {`getCloudinaryImageUrl("${samplePublicId}", { width: 300, height: 300, crop: 'fill', effect: 'e_sepia' })`}
          </code>
        </pre>
      </section>
    </div>
  );
}