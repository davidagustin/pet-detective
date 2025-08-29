import React, { useState } from 'react';
import CloudinaryImage from './CloudinaryImage';
import { getCloudinaryImageUrl } from '../lib/cloudinary';

interface ImageEffectsProps {
  filename: string;
  alt?: string;
  width?: number;
  height?: number;
}

export default function ImageEffects({ filename, alt = 'Pet Image', width = 400, height = 300 }: ImageEffectsProps) {
  const [selectedEffect, setSelectedEffect] = useState<string>('');
  const [customTransformation, setCustomTransformation] = useState<string>('');

  // Convert filename to publicId (remove extension and add folder)
  const publicId = `pet-detective/${filename.replace(/\.[^/.]+$/, "")}`;

  const effects = [
    { name: 'None', value: '' },
    { name: 'Grayscale', value: 'e_grayscale' },
    { name: 'Sepia', value: 'e_sepia' },
    { name: 'Blur', value: 'e_blur:500' },
    { name: 'Oil Paint', value: 'e_oil_paint' },
    { name: 'Cartoonify', value: 'e_cartoonify' },
  ];

  const handleEffectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEffect(event.target.value);
    setCustomTransformation(''); // Clear custom transformation when selecting a preset
  };

  const handleCustomTransformationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTransformation(event.target.value);
    setSelectedEffect(''); // Clear preset effect when entering custom transformation
  };

  const currentTransformation = customTransformation || selectedEffect;

  return (
    <div className="p-4 border rounded-lg shadow-md dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Image Transformations</h3>
      <div className="mb-4">
        <CloudinaryImage
          publicId={publicId}
          alt={alt}
          width={width}
          height={height}
          className="rounded-md object-cover w-full h-auto"
          transformation={currentTransformation}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="effect-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select Effect:
        </label>
        <select
          id="effect-select"
          value={selectedEffect}
          onChange={handleEffectChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          {effects.map((effect) => (
            <option key={effect.value} value={effect.value}>
              {effect.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="custom-transformation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Custom Transformation (e.g., c_scale,w_200):
        </label>
        <input
          type="text"
          id="custom-transformation"
          value={customTransformation}
          onChange={handleCustomTransformationChange}
          placeholder="Enter Cloudinary transformation string"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      {currentTransformation && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300">
          <p className="font-semibold">Generated URL:</p>
          <p className="break-all">{getCloudinaryImageUrl(publicId, { transformation: currentTransformation })}</p>
        </div>
      )}
    </div>
  );
}