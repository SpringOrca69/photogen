import React, { useState, useEffect } from 'react';
import './TShirtEditor.css';
import formal1 from './images/formal1.png';
import formal2 from './images/formal2.png';
import formal3 from './images/formal3.png';

const clothingImages = [formal1, formal2, formal3]; // Array of clothing images

function TShirtEditor({ onNext, onBack }) {
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

  const handleClothesReplacement = async () => {
    if (images.length === 0 || selectedClothingIndex === null) return;
    
    setIsProcessing(true);
    try {
      const imageDataUrl = await imageUrlToDataUrl(images[currentImageIndex].url);
      const clothingDataUrl = await imageUrlToDataUrl(clothingImages[selectedClothingIndex]);
    
      const response = await fetch('/api/clothes-replacement/replace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          clothing: clothingDataUrl,
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
      <h2>T-Shirt Editor</h2>
      <div className="thumbnails">
      {images.map((image, index) => (
        <div
          key={index}
          className={`thumbnail-card ${index === currentImageIndex ? 'active' : ''}`}
          onClick={() => handleThumbnailClick(index)}
        >
          <img
            src={image.url}
            alt={`Thumbnail ${index}`}
          />
        </div>
      ))}
    </div>
      <div>
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
          onClick={handleClothesReplacement}
          disabled={isProcessing || images.length === 0 || selectedClothingIndex === null}
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

export default TShirtEditor;