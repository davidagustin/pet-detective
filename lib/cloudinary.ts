import { Cloudinary } from '@cloudinary/url-gen';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { auto } from '@cloudinary/url-gen/qualifiers/quality';

const cld = new Cloudinary({
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19'
  },
  url: {
    secure: true // Use HTTPS
  }
});

interface CloudinaryImageOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'pad' | 'scale' | 'thumb';
  quality?: 'auto' | number;
  format?: 'auto' | string;
  effect?: string; // e.g., 'e_grayscale', 'e_sepia'
  gravity?: string; // e.g., 'g_auto'
  transformation?: string; // Custom transformation string
}

export const getCloudinaryImageUrl = (
  publicId: string,
  options: CloudinaryImageOptions = {}
): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19';
  
  // If custom transformation is provided, use it directly
  if (options.transformation) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/${options.transformation}/${publicId}`;
  }

  // Build transformation string manually for more control
  const transformations: string[] = [];
  
  if (options.width || options.height) {
    let resize = 'c_fill';
    if (options.crop) resize = `c_${options.crop}`;
    if (options.width) resize += `,w_${options.width}`;
    if (options.height) resize += `,h_${options.height}`;
    if (options.gravity) resize += `,g_${options.gravity}`;
    transformations.push(resize);
  }
  
  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  } else {
    transformations.push('q_auto');
  }
  
  if (options.format && options.format !== 'auto') {
    transformations.push(`f_${options.format}`);
  } else {
    transformations.push('f_auto');
  }
  
  if (options.effect) {
    transformations.push(options.effect);
  }

  const transformationString = transformations.length > 0 ? transformations.join(',') + '/' : '';
  // Use versioning for better caching and consistency
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1756482370/${transformationString}${publicId}`;
};

export const getCloudinaryVideoUrl = (
  publicId: string,
  options: CloudinaryImageOptions = {}
): string => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19';
  
  const transformations: string[] = [];
  
  if (options.width || options.height) {
    let resize = 'c_fill';
    if (options.crop) resize = `c_${options.crop}`;
    if (options.width) resize += `,w_${options.width}`;
    if (options.height) resize += `,h_${options.height}`;
    transformations.push(resize);
  }
  
  if (options.quality) {
    transformations.push(`q_${options.quality}`);
  } else {
    transformations.push('q_auto');
  }

  const transformationString = transformations.length > 0 ? transformations.join(',') + '/' : '';
  // Use versioning for better caching and consistency
  return `https://res.cloudinary.com/${cloudName}/video/upload/v1756482370/${transformationString}${publicId}`;
};

export const getCloudinaryAssetUrl = (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
  options: CloudinaryImageOptions = {}
): string => {
  if (resourceType === 'video') {
    return getCloudinaryVideoUrl(publicId, options);
  }
  return getCloudinaryImageUrl(publicId, options);
};

// Helper function to generate responsive image URLs
export const getResponsiveImageUrls = (
  publicId: string,
  options: CloudinaryImageOptions = {}
) => {
  const baseOptions = { ...options };
  return {
    mobile: getCloudinaryImageUrl(publicId, { ...baseOptions, width: 480 }),
    tablet: getCloudinaryImageUrl(publicId, { ...baseOptions, width: 768 }),
    desktop: getCloudinaryImageUrl(publicId, { ...baseOptions, width: 1024 }),
    large: getCloudinaryImageUrl(publicId, { ...baseOptions, width: 1440 })
  };
};

// Configuration object for easy access
export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19',
  baseUrl: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drj3twq19'}`
};