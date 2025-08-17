import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InitialsAvatar from '@/components/InitialsAvatar';
import { userApi } from '@/lib/api';

interface AvatarUploadProps {
  currentImageUrl?: string;
  username: string;
  userId: number;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentImageUrl,
  username,
  userId,
  onUploadSuccess,
  onCancel
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('🎯 AvatarUpload - File selection started');
      
      // Prevent any event bubbling
      event.preventDefault();
      event.stopPropagation();
      
      const file = event.target.files?.[0];
      console.log('🎯 AvatarUpload - File object:', file);
      
      if (!file) {
        console.log('❌ No file selected');
        return;
      }

      console.log('📄 File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
      });

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.log('❌ Invalid file type:', file.type);
        setError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
        return;
      }

      // Validate file size (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        console.log('❌ File too large:', file.size, 'bytes');
        setError('File too large. Maximum size is 5MB.');
        return;
      }

      console.log('✅ File validation passed - about to set state');
      
      // Set state in try-catch
      try {
        setSelectedFile(file);
        setError(null);
        console.log('✅ State updated successfully');
      } catch (stateError) {
        console.error('❌ State update error:', stateError);
        setError('Failed to process file. Please try again.');
        return;
      }

      // Create preview URL in try-catch
      try {
        console.log('📸 Creating FileReader...');
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const result = e.target?.result as string;
            console.log('📸 Preview URL created:', result ? 'Success' : 'Failed');
            setPreviewUrl(result);
          } catch (previewError) {
            console.error('❌ Preview URL error:', previewError);
            setError('Failed to create preview. Upload may still work.');
          }
        };
        
        reader.onerror = (e) => {
          console.error('❌ FileReader error:', e);
          setError('Failed to read file. Please try again.');
        };
        
        console.log('📸 Starting file read...');
        reader.readAsDataURL(file);
        
      } catch (readerError) {
        console.error('❌ FileReader setup error:', readerError);
        setError('Failed to setup file reader. Please try again.');
      }

      // Clear the input
      try {
        event.target.value = '';
        console.log('✅ Input cleared');
      } catch (clearError) {
        console.error('❌ Input clear error:', clearError);
      }
      
    } catch (error) {
      console.error('🚨 CRITICAL ERROR in handleFileSelect:', error);
      setError('Critical error processing file. Please refresh and try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      console.log('❌ No file to upload');
      return;
    }

    try {
      setUploadLoading(true);
      setError(null);

      console.log('🚀 Starting upload...');

      // Upload using the API with automatic token refresh
      const result = await userApi.uploadAvatar(userId, selectedFile);

      console.log('✅ Upload successful:', result);
      onUploadSuccess();

    } catch (error) {
      console.error('❌ Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setUploadLoading(false);
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Avatar Preview */}
      <div className="flex justify-center">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt="Current avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <InitialsAvatar 
              username={username} 
              size="xl"
              className="w-full h-full rounded-none border-0"
            />
          )}
        </div>
      </div>

      {/* File Upload Area */}
      <div className="flex items-center justify-center w-full">
        <div 
          onClick={() => {
            console.log('🎯 Upload area clicked');
            document.getElementById('isolated-avatar-upload')?.click();
          }}
          className="flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors"
        >
          <div className="flex flex-col items-center justify-center px-4 py-3 sm:pt-5 sm:pb-6">
            <Camera className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-4 text-muted-foreground" />
            <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-muted-foreground text-center">
              <span className="font-semibold">Click to upload</span>
              <span className="hidden sm:inline"> or drag and drop</span>
            </p>
            <p className="text-xs text-muted-foreground text-center">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
            {selectedFile && (
              <p className="text-xs text-primary mt-1 font-medium text-center px-2">
                ✅ Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)}MB)
              </p>
            )}
            {!selectedFile && (
              <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                No file selected
              </p>
            )}
          </div>
        </div>
        <input 
          id="isolated-avatar-upload" 
          type="file" 
          className="hidden" 
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-xs sm:text-sm text-destructive bg-destructive/10 p-2 sm:p-3 rounded-md text-center sm:text-left">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadLoading}
          className="w-full sm:w-auto"
        >
          {uploadLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : null}
          <span className="sm:hidden">Upload {selectedFile ? '✓' : ''}</span>
          <span className="hidden sm:inline">Upload Picture {selectedFile ? '✓' : '(Select file first)'}</span>
        </Button>
      </div>
    </div>
  );
};

export default AvatarUpload;