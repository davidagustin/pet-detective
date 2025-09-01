import { put, list, del } from '@vercel/blob'

interface UploadImageOptions {
  filename: string
  file: File | Buffer
  breed: string
  animalType: 'dog' | 'cat'
}

interface PetImageMetadata {
  id: string
  filename: string
  breed: string
  animal_type: string
  blob_url: string
  upload_date: string
  file_size?: number
  width?: number
  height?: number
  is_active: boolean
}

export class BlobStorageManager {
  private baseUrl: string

  constructor() {
    this.baseUrl = 'https://nazlecf04j1fmxmj.public.blob.vercel-storage.com'
  }

  /**
   * Upload an image to Vercel Blob storage
   */
  async uploadImage(options: UploadImageOptions): Promise<string> {
    try {
      const { url } = await put(options.filename, options.file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      
      return url
    } catch (error) {
      console.error('Blob upload error:', error)
      throw new Error(`Failed to upload image: ${error}`)
    }
  }

  /**
   * List all images in blob storage
   */
  async listImages(): Promise<any[]> {
    try {
      const { blobs } = await list({
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      
      return blobs
    } catch (error) {
      console.error('Blob list error:', error)
      throw new Error(`Failed to list images: ${error}`)
    }
  }

  /**
   * Delete an image from blob storage
   */
  async deleteImage(url: string): Promise<void> {
    try {
      await del(url, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
    } catch (error) {
      console.error('Blob delete error:', error)
      throw new Error(`Failed to delete image: ${error}`)
    }
  }

  /**
   * Get the full blob URL for an image
   */
  getBlobUrl(filename: string): string {
    return `${this.baseUrl}/${filename}`
  }

  /**
   * Extract filename from blob URL
   */
  getFilenameFromUrl(url: string): string {
    return url.split('/').pop() || ''
  }
}

export const blobStorage = new BlobStorageManager()
