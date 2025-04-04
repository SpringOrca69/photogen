import React, { useState, useEffect } from 'react';
import './TShirtEditor.css';
import formal1 from './images/formal1.png';
import formal2 from './images/formal2.png';
import formal3 from './images/formal3.png';
import ImageGallery from './ImageGallery';
import CropDisplay from './shared/CropDisplay';

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

  // Function to render the cropped image
  const renderCroppedImage = (imageData) => {
    if (!imageData) return null;
    
    return (
      <CropDisplay 
        image={imageData}
        className="tshirt-image"
        style={{ maxWidth: '100%', maxHeight: '400px' }}
      />
    );
  };

  const applyShirtOverlay = (userImg, shirtImg, cropData) => {
    // Create a canvas to composite the images
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions based on the shirt image
    canvas.width = shirtImg.width;
    canvas.height = shirtImg.height;
    
    // Position for user image on shirt (adjust these values as needed)
    const shirtPositionX = canvas.width * 0.3; // 30% from left
    const shirtPositionY = canvas.height * 0.2; // 20% from top
    const userImageWidth = canvas.width * 0.4; // 40% of shirt width
    const userImageHeight = canvas.height * 0.3; // 30% of shirt height
    
    // Draw the shirt image first
    ctx.drawImage(shirtImg, 0, 0, canvas.width, canvas.height);
    
    // Draw the user image on top, applying crop if present
    if (cropData) {
      // Use the exact crop coordinates when drawing
      ctx.drawImage(
        userImg,
        cropData.x,
        cropData.y,
        cropData.width,
        cropData.height,
        shirtPositionX,
        shirtPositionY,
        userImageWidth,
        userImageHeight
      );
    } else {
      // Draw the entire user image
      ctx.drawImage(
        userImg, 
        shirtPositionX, 
        shirtPositionY, 
        userImageWidth, 
        userImageHeight
      );
    }
    
    return canvas.toDataURL('image/png');
  };

  const handleApplyShirt = async () => {
    if (selectedClothingIndex === null || images.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Load user image
      const userImage = new Image();
      userImage.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        userImage.onload = resolve;
        userImage.onerror = reject;
        userImage.src = images[currentImageIndex].url;
      });
      
      // Load clothing/shirt image
      const shirtImage = new Image();
      shirtImage.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        shirtImage.onload = resolve;
        shirtImage.onerror = reject;
        shirtImage.src = clothingImages[selectedClothingIndex];
      });
      
      // Apply the overlay
      const currentImage = images[currentImageIndex];
      const compositeImageUrl = applyShirtOverlay(
        userImage,
        shirtImage,
        currentImage.cropData
      );
      
      // Set the result
      setProcessedImage(compositeImageUrl);
    } catch (error) {
      console.error("Error applying shirt overlay:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="tshirt-editor-container">
      <h2>T-Shirt Editor</h2>

      {/* Show only the preview area with the current image */}
      <div className="editor-area">
        <div className="image-preview">
          {images.length > 0 && 
            <CropDisplay 
              image={images[currentImageIndex]}
              className="tshirt-image"
              style={{ maxWidth: '100%', maxHeight: '400px' }}
            />
          }
        </div>
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
          onClick={handleApplyShirt}
          disabled={isProcessing || images.length === 0 || selectedClothingIndex === null}
        >
          {isProcessing ? 'Processing...' : 'Apply Selected Shirt'}
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

      {/* Image Gallery at the bottom */}
      <ImageGallery
        images={images}
        currentImageIndex={currentImageIndex}
        isEditMode={false}
        handleThumbnailClick={(index) => setCurrentImageIndex(index)}
      />

      <div className="navigation">
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

export default TShirtEditor;