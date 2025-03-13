import React, { useState, useEffect } from 'react';
import { ColorPicker } from '@wellbees/color-picker-input';
import './BackgroundRemover.css';
import formal1 from './images/formal1.png';
import formal2 from './images/formal2.png';
import formal4 from './images/formal4.png';

const clothingImages = [formal1, formal2, formal4]; // Array of clothing images

function BackgroundRemover({ onNext, onBack }) {
  const [images, setImages] = useState(() => {
    const savedImages = sessionStorage.getItem('uploadedImages');
    return savedImages ? JSON.parse(savedImages) : [];
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  const saveProcessedImage = () => {
    if (processedImage) { 
      const newImage = {
        url: processedImage,
        name: `${images[currentImageIndex].name}_processed`,
        originalIndex: currentImageIndex
      };
  
      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      setCurrentImageIndex(updatedImages.indexOf(newImage));
      sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
      setIsImageSaved(true);
    } else {
      console.error("No processed image to save.");
    }
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

  return (
    <div className="background-remover-container">
      <h2>Background Remover</h2>
      <div className="image-preview">
        {images.length > 0 && (
          <img src={images[currentImageIndex].url} alt="Current" />
        )}
      </div>
      <div className="thumbnails">
        {images.map((image, index) => (
          <img
            key={index}
            src={image.url}
            alt={`Thumbnail ${index}`}
            onClick={() => handleThumbnailClick(index)}
            className={index === currentImageIndex ? 'active' : ''}
          />
        ))}
      </div>
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
          <input
            type="file"
            onChange={handleCustomBackgroundUpload}
            accept="image/*"
          />
        </div>
        <h3>Select Clothing Options</h3>
        <div className="clothing-options">
          {clothingImages.map((image, index) => (
            <div
              key={index}
              className={`clothing-card ${selectedClothingIndex === index ? 'selected' : ''}`}
              onClick={() => handleClothingOptionClick(index)}
            >
              <img src={image} alt={`Clothing Option ${index}`} />
            </div>
          ))}
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
          <img src={processedImage} alt="Processed" />
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