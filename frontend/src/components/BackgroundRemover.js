import React, { useState, useEffect } from 'react';
import { ColorPicker } from '@wellbees/color-picker-input';
import './BackgroundRemover.css';
import formal1 from './images/formal1.png';
import formal2 from './images/formal2.png';
import formal3 from './images/formal3.png';
import ImageGallery from './ImageGallery';

const clothingImages = [formal1, formal2, formal3]; // Array of clothing images

function BackgroundRemover({ images, setImages, currentImageIndex, setCurrentImageIndex, onNext, onBack }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [backgroundColour, setBackgroundColour] = useState('#FFFFFF');
  const [customBackground, setCustomBackground] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [isImageSaved, setIsImageSaved] = useState(false);
  const [isFormalClothesEnabled, setIsFormalClothesEnabled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setIsImageSaved(false);
  }, [processedImage]);

  const handleThumbnailClick = (index) => {
    if (!isEditMode) {
      setCurrentImageIndex(index);
    }
  };

  const handleBackgroundColourChange = (colour) => {
    if (customBackground) {
      console.log('Custom background is set. Ignoring color change.');
      return; // Exit early if customBackground is set
    }
    console.log('handleBackgroundColourChange called with colour:', colour);
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

  const handleFormalClothesToggle = () => {
    setIsFormalClothesEnabled((prev) => !prev);
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
          isFormalClothesEnabled: isFormalClothesEnabled
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

return (
  <div className="background-remover-wrapper">
    <div className="background-remover-container">
      <section className="editor-section">
        <h2 className="section-title">Background Remover</h2>
        <div className="process-container">
          {processedImage ? (
            <img 
              src={processedImage} 
              alt="Processed Preview" 
              style={{ maxWidth: '100%', height: '500px' }}
            />
          ) : (
            <img 
              src={images[currentImageIndex].url} 
              alt="Original Preview" 
              style={{ maxWidth: '100%', height: '500px' }}
            />
        )}
      </div>
      <div className="background-options">
          <h3 className="section-title">Background Options</h3>
          
          <div className="color-picker-and-toggle">
            {/* Color Picker Section */}
            <div className="color-picker">
              <label className="color-picker-label">Choose Background Colour:</label>
              <ColorPicker
                value={backgroundColour}
                onChange={handleBackgroundColourChange}
                inputType="input"
              />
            </div>

            {/* Toggle for Formal Clothes */}
            <div className="formal-clothes-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isFormalClothesEnabled}
                  onChange={handleFormalClothesToggle}
                />
                Add Formal Clothes
              </label>
            </div>
          </div>

        <div className="section-divider"></div>

          {/* Custom Background Section */}
        <div className="custom-background">
            <label className="custom-background-label">Or Upload Custom Background:</label>
          <input
            type="file"
            onChange={handleCustomBackgroundUpload}
            accept="image/*"
              className="custom-background-input"
          />
        </div>
        </div>
        <div className="background-controls">
          {/* If the image is not processed, show the "Process Image" button */}
          {!processedImage && (
        <button 
          onClick={handleBackgroundRemoval}
              className="background-control-button"
          disabled={isProcessing || images.length === 0}
        >
          {isProcessing ? 'Processing...' : 'Process Image'}
        </button>
          )}

          {/* If the image is processed, show the "Reset Image" and "Save Image" buttons */}
      {processedImage && (
            <div className="button-group">
              <button 
                onClick={resetProcessedImage} 
                className="background-control-button secondary"
              >
            Reset Image
          </button>
              <button 
                onClick={saveProcessedImage} 
                className="background-control-button primary" 
                disabled={isImageSaved}
              >
            {isImageSaved ? 'Saved!' : 'Save Image'}
          </button>
        </div>
      )}
        </div>
      </section>
      {/* Replace the thumbnails section with the ImageGallery component */}
      <ImageGallery 
        images={images} 
        currentImageIndex={currentImageIndex}
        isEditMode={isEditMode} 
        handleThumbnailClick={handleThumbnailClick} 
      />
      <div className="navigation">
        <button onClick={onBack} className="navigation-button">Crop & Resize</button>
        <button onClick={onNext} className="navigation-button">Photo Enhancement</button>
      </div>
    </div>
  </div>
);
}

export default BackgroundRemover;