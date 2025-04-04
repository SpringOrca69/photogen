import React, { useState, useEffect } from 'react';
import { ColorPicker } from '@wellbees/color-picker-input';
import './BackgroundRemover.css';
import formal1 from './images/formal1.png';
import formal2 from './images/formal2.png';
import formal3 from './images/formal3.png';
import ImageGallery from './ImageGallery';
import CropDisplay from './shared/CropDisplay';

const clothingImages = [formal1, formal2, formal3]; // Array of clothing images

function BackgroundRemover({ images, setImages, currentImageIndex, setCurrentImageIndex, onNext, onBack }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [backgroundColour, setBackgroundColour] = useState('#FFFFFF');
  const [customBackground, setCustomBackground] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [isImageSaved, setIsImageSaved] = useState(false);
  const [selectedClothingIndex, setSelectedClothingIndex] = useState(null);

  useEffect(() => {
    setIsImageSaved(false);
  }, [processedImage]);

  const handleThumbnailClick = (index) => {
    if (!isEditMode) {
      setCurrentImageIndex(index);
    }
  };

  const handleBackgroundColourChange = (colour) => {
    setBackgroundColour(colour);
    setCustomBackground(null);
  };

  const handleCustomBackgroundUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomBackground(e.target.result);
        setBackgroundColour('#FFFFFF');
      };
      reader.readAsDataURL(file);
    }
  };

  // Add helper function to get image data respecting crop
  const getImageData = (imageObj) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas with original dimensions for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the full image for processing
        ctx.drawImage(img, 0, 0);
        
        // Return the full image data
        resolve(canvas.toDataURL());
      };
      img.src = imageObj.url;
    });
  };

  async function imageUrlToDataUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
  
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting imageUrl to dataUrl:", error);
      return null; 
    }
  }

  const handleBackgroundRemoval = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    try {
      const imageDataUrl = await imageUrlToDataUrl(images[currentImageIndex].url);
    
      const response = await fetch('/api/background-removal/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          backgroundColour: backgroundColour,
          customBackground: customBackground,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Background removal failed');
      }
  
      const result = await response.json();
      setProcessedImage(result.processedImageDataUrl);
      console.log("processedImage set to:", result.processedImageDataUrl);
    } catch (error) {
      console.error('Error removing background:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcessedImage = () => {
    setProcessedImage(null);
  };

  const handleClothingOptionClick = (index) => {
    setSelectedClothingIndex(index);
    console.log(`Selected clothing option: ${clothingImages[index]}`);
  };

  // Helper function to render image with crop applied
  const renderCroppedImage = (imageData) => {
    if (!imageData) return null;
    
    return (
      <CropDisplay 
        image={imageData}
        className="preview-image"
        style={{ maxWidth: '100%', maxHeight: '400px' }}
      />
    );
  };

  // When displaying the processed image
  const renderProcessedImage = () => {
    if (!processedImage) return null;
    
    // Just show the processed image as is
    return (
      <img 
        src={processedImage} 
        alt="Processed"
        style={{ maxWidth: '100%', maxHeight: '400px' }}
      />
    );
  };

  // When saving the processed image
  const saveProcessedImage = async () => {
    // Get the original image data with crop dimensions preserved
    const image = images[currentImageIndex];
    
    // Create a new image object with all the same properties
    const newImage = {
      ...image,
      url: processedImage,
      // Preserve the crop data from the original image
      cropData: image.cropData,
      originalWidth: image.originalWidth,
      originalHeight: image.originalHeight,
      // Additional metadata as needed
      backgroundRemoved: true
    };
    
    // Add to images array
    const updatedImages = [...images, newImage];
    setImages(updatedImages);
    setCurrentImageIndex(updatedImages.length - 1);
    
    // Reset processing state
    setIsProcessing(false);
    setProcessedImage(null);
  };

  return (
    <div className="background-remover-container">
      <h2>Background Remover</h2>
      <div className="image-preview">
        {images.length > 0 && renderCroppedImage(images[currentImageIndex])}
      </div>
      
      {/* Replace the thumbnails section with ImageGallery component */}
      <ImageGallery
        images={images}
        currentImageIndex={currentImageIndex}
        isEditMode={false}
        handleThumbnailClick={handleThumbnailClick}
      />
      
      <div className="background-options">
        <h3>Background Options</h3>
        <div className="color-picker">
          <label>Choose Background Colour:</label>
          <ColorPicker
            value={backgroundColour}
            onChange={handleBackgroundColourChange}
            inputType="input"
          />
        </div>
        <div className="custom-background">
          <label>Or Upload Custom Background:</label>
        </div>
        <div>
          <input
            type="file"
            onChange={handleCustomBackgroundUpload}
            accept="image/*"
          />
        </div>
      </div>
      <div className="controls">
        <button 
          onClick={handleBackgroundRemoval}
          disabled={isProcessing || images.length === 0}
        >
          {isProcessing ? 'Processing...' : 'Process Image'}
        </button>
      </div>
      {processedImage && (
        <div className="processed-image-container">
          <h3>Processed Image</h3>
          {renderProcessedImage()}
          <button onClick={resetProcessedImage} className="control-button secondary">
            Reset Image
          </button>
          <button onClick={saveProcessedImage} className="control-button primary" disabled={isImageSaved}>
            {isImageSaved ? 'Saved!' : 'Save Image'}
          </button>
        </div>
      )}
      <div className="navigation">
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

export default BackgroundRemover;