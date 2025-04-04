import React, { useState, useEffect } from 'react';
import './PhotoEnhancement.css';
import ImageGallery from './ImageGallery';
import CropDisplay from './shared/CropDisplay';

function PhotoEnhancement({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
const [brightness, setBrightness] = useState(100);
const [contrast, setContrast] = useState(100);
const [skinSmooth, setSkinSmooth] = useState(0);
const [enhancedUrl, setEnhancedUrl] = useState('');

const resetEnhancements = () => {
    setBrightness(100);
    setContrast(100);
    setSkinSmooth(0);
};

const applyEnhancements = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    // Ensure we always use originalUrl if available
    const originalUrl = images[currentImageIndex]?.originalUrl || images[currentImageIndex]?.url;
    img.src = originalUrl;

    img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) blur(${skinSmooth}px)`;
    ctx.drawImage(img, 0, 0);
    setEnhancedUrl(canvas.toDataURL());
    };
};

useEffect(() => {
    if (images[currentImageIndex]) {
    const originalUrl = images[currentImageIndex].originalUrl || images[currentImageIndex].url;

    // Check if no adjustments (default state), load saved enhanced image directly
    if (brightness === 100 && contrast === 100 && skinSmooth === 0) {
        // Just display the image with crop dimensions applied visually
        setEnhancedUrl(images[currentImageIndex].url);
    } else {
        // Apply filters on original image only if adjustments are present
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = originalUrl;

        img.onload = () => {
        // Use full image for processing
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw full image first (processing happens on the full image)
        ctx.drawImage(img, 0, 0);

        // Apply filters to the full image
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) blur(${skinSmooth}px)`;

        // Set the enhanced URL
        setEnhancedUrl(canvas.toDataURL());
        };
    }
    }
}, [brightness, contrast, skinSmooth, currentImageIndex, images]);

// Function to display the cropped view when rendering
const renderWithCropApplied = () => {
  const image = images[currentImageIndex];

  if (!image || !enhancedUrl) return null;

  // Create a modified image object with the enhanced URL but keeping the crop data
  const enhancedImage = {
    ...image,
    url: enhancedUrl
  };
  
  return (
    <CropDisplay 
      image={enhancedImage}
      className="enhanced-image"
      style={{ 
        objectFit: 'contain', 
        maxWidth: '100%', 
        maxHeight: '500px',
        margin: '0 auto',
        display: 'block'
      }}
    />
  );
};

const saveEnhancements = () => {
    const updatedImages = images.map((img, index) =>
    index === currentImageIndex
        ? {
            ...img,
            url: enhancedUrl,
            originalUrl: img.originalUrl || img.url, // always keep original
        }
        : img
    );
    sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
    setImages(updatedImages);
};

return (
    <div className="photo-enhancement-wrapper">
    <div className="photo-enhancement-container">
        <div className="tools-section">
        <h3>Enhancement Tools</h3>
        <label>Brightness: {brightness}%</label>
        <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(e.target.value)} />

        <label>Contrast: {contrast}%</label>
        <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(e.target.value)} />

        <label>Skin Smoothness: {skinSmooth}px</label>
        <input type="range" min="0" max="10" value={skinSmooth} onChange={(e) => setSkinSmooth(e.target.value)} />

        <button onClick={saveEnhancements}>Save Enhancements</button>
        </div>

        <div className="image-preview-section">
        <h3>Enhanced Preview</h3>
        {enhancedUrl && renderWithCropApplied()}
        </div>
    </div>

    <div className="image-gallery-container">
        <ImageGallery
        images={images}
        currentImageIndex={currentImageIndex}
        handleThumbnailClick={(index) => {
            setCurrentImageIndex(index);
            resetEnhancements();
        }}
        />
    </div>
    </div>
);
}

export default PhotoEnhancement;


