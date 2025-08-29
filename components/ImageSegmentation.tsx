'use client'

import { useState, useRef } from 'react'
import { apiClient } from '../lib/api-client'

interface SegmentationResult {
  originalImage: string
  segmentedImage: string
  maskImage: string
  confidence: number
  processingTime: number
}

export default function ImageSegmentation() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file)
        setError(null)
        
        // Create preview URL
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        
        // Clear previous results
        setSegmentationResult(null)
      } else {
        setError('Please select a valid image file')
      }
    }
  }

  const processSegmentation = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    setError(null)

    try {
      const data = await apiClient.segmentImage(selectedFile)
      setSegmentationResult(data)
    } catch (error: any) {
      console.error('Segmentation error:', error)
      setError(error.message || 'Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = (type: 'segmented' | 'mask') => {
    if (!segmentationResult) return

    const link = document.createElement('a')
    link.href = type === 'segmented' ? segmentationResult.segmentedImage : segmentationResult.maskImage
    link.download = `pet_segmentation_${type}_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">🔍 Pet Image Segmentation</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Upload a pet image to automatically segment the pet from the background using our AI model.
      </p>

      {/* File Upload */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Choose Image
          </button>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Upload a pet image to segment</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview and Processing */}
      {previewUrl && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Original Image</h3>
            <button
              onClick={processSegmentation}
              disabled={isProcessing}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Segment Pet'}
            </button>
          </div>
          
          <div className="relative">
            <img
              src={previewUrl}
              alt="Original"
              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 dark:border-gray-600"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Processing segmentation...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {segmentationResult && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800">Segmentation Results</h3>
          
          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Segmented Image */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Segmented Pet</h4>
              <div className="relative">
                <img
                  src={segmentationResult.segmentedImage}
                  alt="Segmented"
                  className="w-full h-64 object-contain rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => downloadResult('segmented')}
                  className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg text-sm"
                >
                  📥
                </button>
              </div>
            </div>

            {/* Mask Image */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Segmentation Mask</h4>
              <div className="relative">
                <img
                  src={segmentationResult.maskImage}
                  alt="Mask"
                  className="w-full h-64 object-contain rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => downloadResult('mask')}
                  className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg text-sm"
                >
                  📥
                </button>
              </div>
            </div>
          </div>

          {/* Results Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Segmentation Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Confidence:</span>
                <div className="font-medium text-green-600">
                  {(segmentationResult.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-gray-600">Processing Time:</span>
                <div className="font-medium">
                  {segmentationResult.processingTime.toFixed(2)}s
                </div>
              </div>
            </div>
          </div>

          {/* Download All */}
          <div className="flex space-x-3">
            <button
              onClick={() => downloadResult('segmented')}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Download Segmented Image
            </button>
            <button
              onClick={() => downloadResult('mask')}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Download Mask
            </button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">ℹ️ About Pet Segmentation</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Automatically detects and segments pets from background</li>
          <li>• Works with dogs, cats, and other pets</li>
          <li>• High-quality segmentation masks for further processing</li>
          <li>• Fast processing with AI-powered accuracy</li>
        </ul>
      </div>
    </div>
  )
}
