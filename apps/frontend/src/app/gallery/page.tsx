'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, tokenManager } from '../../lib/api-client';
import type { Image } from '@shared/types';

export default function Gallery() {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fetchUserGallery = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUserGallery();
      setImages(response.images);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch images';
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        setError('Please log in to view your gallery');
        tokenManager.removeToken();
        setIsAuthenticated(false);
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Step 1: Create image metadata (authenticated gallery endpoint)
      const createResponse = await apiClient.createGalleryImage({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height,
      });

      // Step 2: Upload the actual file
      await apiClient.uploadImage(createResponse.image.id, file);

      // Refresh the gallery
      await fetchUserGallery();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload image';
      if (errorMsg.includes('401')) {
        setError('Your session has expired. Please log in again.');
        tokenManager.removeToken();
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const getImageDimensions = (
    file: File
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDeleteImage = async (id: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      setError(null);
      await apiClient.deleteImage(id);
      await fetchUserGallery();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete image';
      if (errorMsg.includes('401')) {
        setError('Your session has expired. Please log in again.');
        tokenManager.removeToken();
        router.push('/login');
      } else {
        setError(errorMsg);
      }
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = tokenManager.getToken();
    if (!token) {
      setError('Please log in to view your gallery');
      setIsAuthenticated(false);
      setLoading(false);
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);
    fetchUserGallery();
  }, [router]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">My Gallery</h1>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && images.length === 0 && (
          <div className="text-center py-8 text-slate-600">
            Loading images...
          </div>
        )}

        {/* Empty State */}
        {!loading && images.length === 0 && (
          <div className="text-center py-12">
            <div className="aspect-square max-w-md mx-auto bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
              <p className="text-slate-400">No images yet</p>
            </div>
            <p className="text-slate-600">Upload your first image to get started!</p>
          </div>
        )}

        {/* Images Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow"
              >
                <img
                  src={image.url}
                  alt={image.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="font-medium truncate">{image.fileName}</p>
                  <p className="text-xs text-slate-300">
                    {(image.fileSize / 1024).toFixed(1)} KB
                    {image.width && image.height && ` • ${image.width}×${image.height}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Count */}
        {images.length > 0 && (
          <div className="mt-6 text-sm text-slate-600 text-center">
            {images.length} {images.length === 1 ? 'image' : 'images'} in your gallery
          </div>
        )}
      </div>
    </div>
  );
}
