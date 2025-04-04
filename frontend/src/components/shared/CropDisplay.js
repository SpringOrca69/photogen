import React, { useState, useEffect } from 'react';

/**
 * A component that properly displays a cropped image
 * - Maintains the exact crop dimensions and aspect ratio
 * - Renders at appropriate size based on container without changing crop
 * - Supports rotation if specified
 */
const CropDisplay = ({ image, className, style = {}, containerWidth, containerHeight }) => {
  const [croppedUrl, setCroppedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!image || !image.url) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    // If no crop data, just use the original image
    if (!image.cropData) {
      setCroppedUrl(image.url);
      setIsLoading(false);
      if (image.originalWidth && image.originalHeight) {
        setDimensions({
          width: image.originalWidth,
          height: image.originalHeight
        });
      }
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to crop dimensions
        canvas.width = image.cropData.width;
        canvas.height = image.cropData.height;
        
        // Draw the cropped portion
        ctx.drawImage(
          img, 
          image.cropData.x, 
          image.cropData.y, 
          image.cropData.width, 
          image.cropData.height,
          0, 0, 
          canvas.width, 
          canvas.height
        );
        
        // Apply rotation if needed
        if (image.cropData.rotation) {
          // Create a new canvas for the rotated image
          const rotatedCanvas = document.createElement('canvas');
          const rotatedCtx = rotatedCanvas.getContext('2d');
          
          // Set dimensions
          rotatedCanvas.width = canvas.width;
          rotatedCanvas.height = canvas.height;
          
          // Translate and rotate around the center
          rotatedCtx.translate(canvas.width/2, canvas.height/2);
          rotatedCtx.rotate(image.cropData.rotation * Math.PI/180);
          rotatedCtx.translate(-canvas.width/2, -canvas.height/2);
          
          // Draw the original canvas onto the rotated one
          rotatedCtx.drawImage(canvas, 0, 0);
          
          // Use the rotated canvas for output
          setCroppedUrl(rotatedCanvas.toDataURL());
        } else {
          // No rotation needed
          setCroppedUrl(canvas.toDataURL());
        }
        
        // Store the dimensions for sizing calculations
        setDimensions({
          width: image.cropData.width,
          height: image.cropData.height
        });
        
      } catch (err) {
        console.error("Error cropping image:", err);
        setCroppedUrl(image.url);
        
        // Use original dimensions as fallback
        setDimensions({
          width: img.width,
          height: img.height
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    img.onerror = () => {
      console.error("Failed to load image for cropping");
      setCroppedUrl(image.url);
      setIsLoading(false);
    };
    
    img.src = image.url;
  }, [image]);
  
  if (!image) return null;
  
  if (isLoading) {
    return (
      <div 
        className={className} 
        style={{
          ...style, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: containerWidth || '100%',
          height: containerHeight || 'auto',
        }}
      >
        Loading...
      </div>
    );
  }
  
  // Calculate display size while maintaining aspect ratio
  let displayStyle = { ...style };
  
  if (dimensions.width > 0 && dimensions.height > 0) {
    const aspectRatio = dimensions.width / dimensions.height;
    
    // Set a default display strategy if not specified in the style
    if (!style.objectFit) {
      displayStyle = {
        ...style,
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain' // Default to contain for most instances
      };
    }
    
    // If we need to fill the container (for thumbnails, etc)
    if (style.objectFit === 'cover') {
      displayStyle = {
        ...style,
        width: '100%',  // Fill the width
        height: '100%', // Fill the height
        objectFit: 'cover' // Cover will maintain aspect ratio but fill the container
      };
    }
    
    // If container dimensions are specified, calculate optimal fit
    if (containerWidth || containerHeight) {
      if (containerWidth && containerHeight) {
        // Both dimensions specified - fit within while preserving aspect ratio
        const containerRatio = containerWidth / containerHeight;
        
        if (aspectRatio > containerRatio) {
          // Image is wider than container ratio - fit to width
          displayStyle.width = containerWidth;
          displayStyle.height = containerWidth / aspectRatio;
        } else {
          // Image is taller than container ratio - fit to height
          displayStyle.height = containerHeight;
          displayStyle.width = containerHeight * aspectRatio;
        }
      } else if (containerWidth) {
        // Only width specified
        displayStyle.width = containerWidth;
        displayStyle.height = containerWidth / aspectRatio;
      } else if (containerHeight) {
        // Only height specified
        displayStyle.height = containerHeight;
        displayStyle.width = containerHeight * aspectRatio;
      }
    }
  }
  
  return (
    <img 
      src={croppedUrl} 
      alt={image.name || "Image"} 
      className={className}
      style={displayStyle}
    />
  );
};

export default CropDisplay;
