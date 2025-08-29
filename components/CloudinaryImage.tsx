'use client'

import Image from 'next/image'
import { useState } from 'react'
import { CloudinaryManager, CloudinaryOptions } from '../lib/cloudinary'

interface CloudinaryImageProps {
  filename: string
  alt: string
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  options?: CloudinaryOptions
  fallbackToLocal?: boolean
  onLoad?: () => void
  onError?: () => void
  // Responsive breakpoint options
  responsive?: {
    mobile?: CloudinaryOptions
    tablet?: CloudinaryOptions
    desktop?: CloudinaryOptions
  }
  // Effect presets
  preset?: 'thumbnail' | 'hero' | 'card' | 'gallery' | 'blur' | 'grayscale'
}

const PRESET_OPTIONS: Record<string, CloudinaryOptions> = {
  thumbnail: { width: 150, height: 150, crop: 'fill', quality: 'auto' },
  hero: { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
  card: { width: 400, height: 300, crop: 'fill', quality: 'auto' },
  gallery: { width: 600, height: 450, crop: 'fill', quality: 'auto' },
  blur: { width: 800, height: 600, crop: 'fill', quality: 'auto', blur: 300 },
  grayscale: { width: 800, height: 600, crop: 'fill', quality: 'auto', grayscale: true }
}

export default function CloudinaryImage({
  filename,
  alt,
  className = '',
  priority = false,
  fill = false,
  sizes,
  options = {},
  fallbackToLocal = true,
  onLoad,
  onError,
  responsive,
  preset
}: CloudinaryImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Determine final options
  const finalOptions = preset ? { ...PRESET_OPTIONS[preset], ...options } : options

  // Get the primary image URL
  const primaryUrl = CloudinaryManager.getImageUrl(filename, finalOptions)
  
  // Get responsive URLs if specified
  const responsiveUrls = responsive ? {
    mobile: CloudinaryManager.getImageUrl(filename, { ...finalOptions, ...responsive.mobile }),
    tablet: CloudinaryManager.getImageUrl(filename, { ...finalOptions, ...responsive.tablet }),
    desktop: CloudinaryManager.getImageUrl(filename, { ...finalOptions, ...responsive.desktop })
  } : null

  // Fallback URL (local or placeholder)
  const fallbackUrl = fallbackToLocal 
    ? `/api/images/${filename}` 
    : '/placeholder-pet.jpg'

  // Note: Using Next.js Image loader for responsive images

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
  const defaultSizes = responsiveUrls 
    ? '(max-width: 480px) 480px, (max-width: 768px) 768px, 1024px'
    : undefined

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      
      <Image
        src={imageError ? fallbackUrl : primaryUrl}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        priority={priority}
        fill={fill}
        width={fill ? undefined : finalOptions.width || 800}
        height={fill ? undefined : finalOptions.height || 600}
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

// Convenience component for pet breed images
interface PetBreedImageProps extends Omit<CloudinaryImageProps, 'filename'> {
  breed: string
  number?: number
}

export function PetBreedImage({ breed, number, alt, ...props }: PetBreedImageProps) {
  // Get a random image for the breed if no number specified
  const filename = number 
    ? `${breed}_${number}.jpg`
    : CloudinaryManager.getRandomImageForBreed(breed) || `${breed}_1.jpg`

  return (
    <CloudinaryImage
      filename={filename}
      alt={alt || `${breed} pet`}
      {...props}
    />
  )
}

// Gallery component for displaying multiple images
interface PetGalleryProps {
  breed?: string
  filenames?: string[]
  className?: string
  itemClassName?: string
  options?: CloudinaryOptions
}

export function PetGallery({ 
  breed, 
  filenames, 
  className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
  itemClassName = 'aspect-square',
  options = { width: 300, height: 300, crop: 'fill' }
}: PetGalleryProps) {
  const images = filenames || (breed ? CloudinaryManager.getImagesForBreed(breed) : [])
  
  return (
    <div className={className}>
      {images.map((filename, index) => (
        <div key={filename} className={itemClassName}>
          <CloudinaryImage
            filename={filename}
            alt={`Pet image ${index + 1}`}
            className="w-full h-full object-cover rounded-lg"
            options={options}
            fill
          />
        </div>
      ))}
    </div>
  )
}
