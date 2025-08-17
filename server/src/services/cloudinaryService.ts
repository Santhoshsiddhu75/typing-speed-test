import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Missing Cloudinary environment variables. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
}

// File filter for images only
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Configure multer for memory storage (we'll upload directly to Cloudinary)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

/**
 * Upload profile picture to Cloudinary
 * @param fileBuffer - The image file buffer
 * @param userId - User ID for organizing uploads
 * @param oldImageUrl - Previous image URL to delete (optional)
 * @returns Promise with the uploaded image URL
 */
export const uploadProfilePicture = async (
  fileBuffer: Buffer,
  userId: number,
  oldImageUrl?: string
): Promise<string> => {
  try {
    // Delete old image if exists
    if (oldImageUrl) {
      await deleteProfilePicture(oldImageUrl);
    }

    // Upload new image to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'profile-pictures', // Organize uploads in a folder
          public_id: `user_${userId}`, // Use user ID as filename
          transformation: [
            {
              width: 400,
              height: 400,
              crop: 'fill', // Crop to square
              gravity: 'face', // Focus on face if detected
              quality: 'auto', // Automatic quality optimization
              format: 'auto', // Automatic format selection (WebP for modern browsers)
            }
          ],
          overwrite: true, // Overwrite if exists
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });

    console.log(`✅ Profile picture uploaded for user ${userId}:`, result.secure_url);
    return result.secure_url;

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture. Please try again.');
  }
};

/**
 * Delete profile picture from Cloudinary
 * @param imageUrl - The Cloudinary image URL to delete
 */
export const deleteProfilePicture = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from Cloudinary URL
    const publicId = extractPublicIdFromUrl(imageUrl);
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted old profile picture: ${publicId}`);
    }
  } catch (error) {
    console.error('Error deleting old profile picture:', error);
    // Don't throw error - deletion failure shouldn't block upload
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - Cloudinary image URL
 * @returns public_id or null if not a valid Cloudinary URL
 */
const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
      // Get everything after 'upload/v{version}/' and remove file extension
      const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
      const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove extension
      return publicId;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public_id from URL:', error);
    return null;
  }
};

/**
 * Get optimized Cloudinary URL with transformations
 * @param publicId - The Cloudinary public_id
 * @param width - Desired width (default: 400)
 * @param height - Desired height (default: 400)
 * @returns Optimized image URL
 */
export const getOptimizedImageUrl = (publicId: string, width: number = 400, height: number = 400): string => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto',
  });
};

export default cloudinary;