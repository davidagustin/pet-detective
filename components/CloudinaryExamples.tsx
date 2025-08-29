'use client'

import CloudinaryImage, { PetBreedImage, PetGallery } from './CloudinaryImage'
import ImageEffects, { EffectsGallery } from './ImageEffects'
import { CloudinaryManager } from '../lib/cloudinary'
import { useState } from 'react'

/**
 * Comprehensive examples of how to use the Cloudinary integration
 * This component demonstrates all the features and can be used for testing
 */
export default function CloudinaryExamples() {
  const [selectedBreed, setSelectedBreed] = useState('Abyssinian')
  const [selectedImage, setSelectedImage] = useState('Abyssinian_1.jpg')

  // Get available breeds for dropdown
  const breeds = CloudinaryManager.getAvailableBreeds()

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-12">
      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
        Cloudinary Integration Examples
      </h1>

      {/* Basic Image Usage */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          1. Basic Image Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Standard Image</h3>
            <CloudinaryImage
              filename="Abyssinian_1.jpg"
              alt="Abyssinian cat"
              className="w-full h-64 object-cover rounded-lg shadow-lg"
              options={{ width: 400, height: 300, crop: 'fill' }}
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">With Custom Options</h3>
            <CloudinaryImage
              filename="Abyssinian_1.jpg"
              alt="Abyssinian cat with effects"
              className="w-full h-64 object-cover rounded-lg shadow-lg"
              options={{ 
                width: 400, 
                height: 300, 
                crop: 'fill',
                quality: 'auto',
                saturation: 20,
                contrast: 10
              }}
            />
          </div>
        </div>
      </section>

      {/* Responsive Images */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          2. Responsive Images
        </h2>
        <CloudinaryImage
          filename="Bengal_1.jpg"
          alt="Bengal cat - responsive"
          className="w-full h-96 object-cover rounded-lg shadow-lg"
          responsive={{
            mobile: { width: 400, height: 300 },
            tablet: { width: 600, height: 450 },
            desktop: { width: 800, height: 600 }
          }}
          sizes="(max-width: 768px) 400px, (max-width: 1024px) 600px, 800px"
        />
      </section>

      {/* Preset Effects */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          3. Preset Effects
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {['thumbnail', 'hero', 'card', 'gallery', 'blur', 'grayscale'].map((preset) => (
            <div key={preset} className="text-center">
              <CloudinaryImage
                filename="Persian_1.jpg"
                alt={`Persian cat - ${preset}`}
                className="w-full h-32 object-cover rounded-lg shadow-md"
                preset={preset as any}
              />
              <p className="mt-2 text-sm font-medium capitalize">{preset}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pet Breed Component */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          4. Pet Breed Component
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Breed:
          </label>
          <select
            value={selectedBreed}
            onChange={(e) => setSelectedBreed(e.target.value)}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {breeds.slice(0, 10).map((breed) => (
              <option key={breed} value={breed}>{breed}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PetBreedImage
            breed={selectedBreed}
            number={1}
            alt={`${selectedBreed} #1`}
            className="w-full h-48 object-cover rounded-lg shadow-lg"
            preset="card"
          />
          <PetBreedImage
            breed={selectedBreed}
            number={2}
            alt={`${selectedBreed} #2`}
            className="w-full h-48 object-cover rounded-lg shadow-lg"
            preset="card"
          />
          <PetBreedImage
            breed={selectedBreed}
            alt={`Random ${selectedBreed}`}
            className="w-full h-48 object-cover rounded-lg shadow-lg"
            preset="card"
          />
        </div>
      </section>

      {/* Gallery Component */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          5. Pet Gallery
        </h2>
        <PetGallery
          breed="Siamese"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          itemClassName="aspect-square"
          options={{ width: 200, height: 200, crop: 'fill' }}
        />
      </section>

      {/* Interactive Effects */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          6. Interactive Image Effects
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Image:
          </label>
          <select
            value={selectedImage}
            onChange={(e) => setSelectedImage(e.target.value)}
            className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {['Abyssinian_1.jpg', 'Bengal_1.jpg', 'Persian_1.jpg', 'Siamese_1.jpg', 'Maine_Coon_1.jpg'].map((img) => (
              <option key={img} value={img}>{img}</option>
            ))}
          </select>
        </div>
        <ImageEffects
          filename={selectedImage}
          alt="Interactive effects demo"
          className="max-w-2xl mx-auto"
        />
      </section>

      {/* Effects Gallery */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          7. Effects Gallery
        </h2>
        <EffectsGallery
          filename="Ragdoll_1.jpg"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        />
      </section>

      {/* URL Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          8. URL Generation Examples
        </h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Generated URLs:</h3>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-blue-600">Standard:</span>
              <br />
              <span className="text-gray-600 break-all">
                {CloudinaryManager.getImageUrl('Abyssinian_1.jpg')}
              </span>
            </div>
            <div>
              <span className="text-blue-600">With Effects:</span>
              <br />
              <span className="text-gray-600 break-all">
                {CloudinaryManager.getImageWithEffects('Abyssinian_1.jpg', { blur: 100, grayscale: true })}
              </span>
            </div>
            <div>
              <span className="text-blue-600">Responsive Set:</span>
              <br />
              {Object.entries(CloudinaryManager.getResponsiveImageUrls('Abyssinian_1.jpg')).map(([size, url]) => (
                <div key={size} className="ml-4">
                  <span className="text-green-600">{size}:</span>
                  <span className="text-gray-600 break-all"> {url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          9. Performance Benefits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
              🚀 Fast Loading
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Global CDN delivery with automatic format optimization (WebP, AVIF)
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
              📱 Responsive
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Automatic responsive images with perfect sizing for any device
            </p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
            <h3 className="font-semibold text-purple-800 dark:text-purple-400 mb-2">
              🎨 Dynamic
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Real-time image transformations without pre-processing
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
