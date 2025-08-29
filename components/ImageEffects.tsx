'use client'

import { useState } from 'react'
import { CloudinaryManager } from '../lib/cloudinary'
import CloudinaryImage from './CloudinaryImage'

interface ImageEffectsProps {
  filename: string
  alt?: string
  className?: string
}

interface EffectSettings {
  blur: number
  brightness: number
  contrast: number
  saturation: number
  grayscale: boolean
  sepia: boolean
}

const DEFAULT_EFFECTS: EffectSettings = {
  blur: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  grayscale: false,
  sepia: false
}

export default function ImageEffects({ filename, alt, className = '' }: ImageEffectsProps) {
  const [effects, setEffects] = useState<EffectSettings>(DEFAULT_EFFECTS)
  const [showControls, setShowControls] = useState(false)

  const updateEffect = (key: keyof EffectSettings, value: number | boolean) => {
    setEffects(prev => ({ ...prev, [key]: value }))
  }

  const resetEffects = () => {
    setEffects(DEFAULT_EFFECTS)
  }

  const getImageUrl = () => {
    return CloudinaryManager.getImageWithEffects(filename, effects)
  }

  const presets = [
    { name: 'Original', effects: DEFAULT_EFFECTS },
    { name: 'Vintage', effects: { ...DEFAULT_EFFECTS, sepia: true, contrast: 10, saturation: -20 } },
    { name: 'B&W', effects: { ...DEFAULT_EFFECTS, grayscale: true, contrast: 15 } },
    { name: 'Dreamy', effects: { ...DEFAULT_EFFECTS, blur: 100, brightness: 10, saturation: 20 } },
    { name: 'Vibrant', effects: { ...DEFAULT_EFFECTS, saturation: 30, contrast: 20, brightness: 5 } },
    { name: 'Soft', effects: { ...DEFAULT_EFFECTS, blur: 50, brightness: 5 } }
  ]

  return (
    <div className={`relative ${className}`}>
      {/* Image */}
      <div className="relative group">
        <CloudinaryImage
          filename={filename}
          alt={alt || 'Pet image with effects'}
          className="w-full h-auto rounded-lg shadow-lg"
          options={{
            width: 600,
            height: 450,
            crop: 'fill',
            quality: 'auto',
            ...effects
          }}
        />
        
        {/* Toggle Controls Button */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="Toggle effects controls"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </button>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Image Effects</h3>
          
          {/* Preset Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setEffects(preset.effects)}
                  className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blur: {effects.blur}
              </label>
              <input
                type="range"
                min="0"
                max="1000"
                value={effects.blur}
                onChange={(e) => updateEffect('blur', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Brightness */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brightness: {effects.brightness}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effects.brightness}
                onChange={(e) => updateEffect('brightness', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Contrast */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contrast: {effects.contrast}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effects.contrast}
                onChange={(e) => updateEffect('contrast', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Saturation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Saturation: {effects.saturation}
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={effects.saturation}
                onChange={(e) => updateEffect('saturation', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Boolean Effects */}
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={effects.grayscale}
                onChange={(e) => updateEffect('grayscale', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Grayscale</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={effects.sepia}
                onChange={(e) => updateEffect('sepia', e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sepia</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={resetEffects}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
            >
              Reset
            </button>
            
            <button
              onClick={() => {
                const url = getImageUrl()
                navigator.clipboard.writeText(url)
                // You could add a toast notification here
              }}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Copy URL
            </button>
            
            <a
              href={getImageUrl()}
              download={`${filename.replace('.jpg', '')}_edited.jpg`}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// Gallery component with effects
interface EffectsGalleryProps {
  filename: string
  className?: string
}

export function EffectsGallery({ filename, className = '' }: EffectsGalleryProps) {
  const effects = [
    { name: 'Original', options: {} },
    { name: 'Vintage', options: { sepia: true, contrast: 10, saturation: -20 } },
    { name: 'B&W', options: { grayscale: true, contrast: 15 } },
    { name: 'Dreamy', options: { blur: 100, brightness: 10, saturation: 20 } },
    { name: 'Vibrant', options: { saturation: 30, contrast: 20, brightness: 5 } },
    { name: 'Soft', options: { blur: 50, brightness: 5 } }
  ]

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {effects.map((effect) => (
        <div key={effect.name} className="text-center">
          <CloudinaryImage
            filename={filename}
            alt={`${effect.name} effect`}
            className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
            options={{
              width: 200,
              height: 150,
              crop: 'fill',
              quality: 'auto',
              ...effect.options
            }}
          />
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {effect.name}
          </p>
        </div>
      ))}
    </div>
  )
}
