import React, { useState, useEffect } from 'react';

/**
 * Component to display a cropped version of an image based on cropData
 */
const CroppedImage = ({ imageData, className, style = {} }) => {
  const [croppedUrl, setCroppedUrl] = useState('');
  
  useEffect(() => {
    // If no image data or no crop data, don't do anything
    if (!imageData || !imageData.cropData) {
      setCroppedUrl(imageData?.url || '');
      return;
    }
    
    // Create a new image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageData.url;
    
    img.onload = () => {
      // Create a canvas with the cropped image dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to the crop size
      canvas.width = imageData.cropData.width;
      canvas.height = imageData.cropData.height;
      
      // Draw the cropped region onto the canvas
      ctx.drawImage(
        img, 
        imageData.cropData.x, imageData.cropData.y, 
        imageData.cropData.width, imageData.cropData.height,
        0, 0, 
        imageData.cropData.width, imageData.cropData.height
      );
      
      // Apply rotation if needed
      if (imageData.cropData.rotation) {
        const rotatedCanvas = document.createElement('canvas');
        const rotatedCtx = rotatedCanvas.getContext('2d');
        
        // Set up the rotated canvas
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
        
        // Rotate around the center
        rotatedCtx.translate(canvas.width / 2, canvas.height / 2);
        rotatedCtx.rotate(imageData.cropData.rotation * Math.PI / 180);
        rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        
        // Use the rotated canvas for the final image
        setCroppedUrl(rotatedCanvas.toDataURL());
      } else {
        // No rotation needed
        setCroppedUrl(canvas.toDataURL());
      }
    };
    
    img.onerror = () => {
      // If there's an error, just use the original URL
      setCroppedUrl(imageData.url);
    };
  }, [imageData]);
  
  if (!imageData) return null;
  
  // If no cropped URL yet or no crop data, render the original image
  if (!croppedUrl || !imageData.cropData) {
    return (
      <img
        src={imageData.url}
        alt={imageData.name || "Image"}
        className={className}
        style={{ ...style, maxWidth: '100%', maxHeight: '100%' }}
      />
    );
  }
  
  // Render the cropped image
  return (
    <img
      src={croppedUrl}
      alt={imageData.name || "Cropped Image"}
      className={className}
      style={{ ...style, maxWidth: '100%', maxHeight: '100%' }}
    />
  );
};

export default CroppedImage;
