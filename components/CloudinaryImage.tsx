'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getCloudinaryImageUrl, cloudinaryConfig } from '../lib/cloudinary'

interface CloudinaryImageProps {
  publicId: string
  alt: string
  width?: number
  height?: number
  sizes?: string
  className?: string
  priority?: boolean
  fill?: boolean
  effect?: string
  transformation?: string
  quality?: 'auto' | number
  crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb'
  fallbackToLocal?: boolean
  onLoad?: () => void
  onError?: () => void
}

export default function CloudinaryImage({
  publicId,
  alt,
  width = 800,
  height = 600,
  sizes,
  className = '',
  priority = false,
  fill = false,
  effect,
  transformation,
  quality = 'auto',
  crop = 'fill',
  fallbackToLocal = true,
  onLoad,
  onError,
}: CloudinaryImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Get the filename from publicId for fallback
  const filename = publicId.split('/').pop() || publicId

  // Generate Cloudinary URL
  const cloudinaryUrl = getCloudinaryImageUrl(publicId, {
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    quality,
    crop,
    effect,
    transformation,
  })

  // Fallback URL (local or placeholder)
  const fallbackUrl = fallbackToLocal 
    ? `/api/images/${filename}` 
    : '/placeholder-pet.jpg'

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setImageError(true)
    setIsLoading(false)
    onError?.()
  }

  // Build sizes string if not provided
  const defaultSizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <Image
        src={imageError ? fallbackUrl : cloudinaryUrl}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        priority={priority}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        sizes={sizes || defaultSizes}
        onLoad={handleLoad}
        onError={handleError}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
      />
      
      {/* Error state */}
      {imageError && fallbackToLocal && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          <span>Image not available</span>
        </div>
      )}
    </div>
  )
}