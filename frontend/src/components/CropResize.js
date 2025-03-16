import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './CropResize.css';
import ImageGallery from './ImageGallery';

function CropResize({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
  const [isCropMode, setIsCropMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const cropperRef = useRef(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  const aspectRatioOptions = [
    { label: '35×45mm Passport', value: 35/45 },
    { label: '1:1 Square', value: 1 },
    { label: '4:3 Standard', value: 4/3 },
    { label: '16:9 Widescreen', value: 16/9 },
    { label: '3:4 Portrait', value: 3/4 },
    { label: 'Free Size', value: null }
  ];

  const handleStartCrop = () => {
    setIsCropMode(true);
    // Always set default to passport size
    setAspectRatio(35/45);
  };

  const handleAutoDetect = async () => {
    if (!images[currentImageIndex]) return;
    
    setIsAutoDetecting(true);
    
    try {
      // Get the current image data
      let imageData = images[currentImageIndex].url;
      
      // Ensure the URL is a data URL
      if (!imageData.startsWith('data:')) {
        try {
          const response = await fetch(imageData);
          const blob = await response.blob();
          imageData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          console.error("Error converting image to data URL:", err);
          throw new Error("Could not process image data");
        }
      }
      
      // Make sure we have valid image data before proceeding
      if (!imageData || imageData.length < 100) {
        throw new Error("Invalid image data");
      }
      
      // Use passport photo aspect ratio
      const passportAspectRatio = 35/45;
      
      const response = await fetch('/api/auto-crop/improved-detect-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          aspectRatio: passportAspectRatio
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsCropMode(true);
        setAspectRatio(passportAspectRatio);
        
        // Wait for the cropper to be ready
        setTimeout(() => {
          const cropper = cropperRef.current?.cropper;
          if (cropper) {
            const { x, y, width, height } = data.cropData;
            
            // Set the cropbox using the data from backend
            cropper.setCropBoxData({
              left: x,
              top: y,
              width: width,
              height: height
            });
            
            // Ensure the right aspect ratio is maintained
            cropper.setAspectRatio(passportAspectRatio);
          }
        }, 300); // Increase timeout to ensure cropper is fully initialized
      } else {
        console.error("Face detection failed:", data.error);
        // Show a user-friendly error message
        alert("Face detection failed. Please try manual cropping or a different image.");
      }
    } catch (error) {
      console.error("Error contacting auto-crop API:", error);
      alert("Unable to detect face. Please try manual cropping.");
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
    const cropper = cropperRef.current?.cropper;
    
    if (cropper) {
      cropper.setAspectRatio(ratio);
      if (ratio === null) {
        cropper.setDragMode('crop');
      }
    }
  };

  const handleCancelCrop = () => {
    setIsCropMode(false);
    setAspectRatio(null);
  };

  const handleSaveCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas();
      const croppedImage = croppedCanvas.toDataURL();
      
      const newImage = {
        url: croppedImage,
        name: `${images[currentImageIndex].name}_cropped`,
        originalIndex: currentImageIndex
      };
      
      const updatedImages = images.map((img, index) => 
        index === currentImageIndex ? newImage : img
      );
      setImages(updatedImages);
      sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));

      setIsCropMode(false);
      setAspectRatio(null);
    }
  };

  const handleThumbnailClick = (index) => {
    if (!isCropMode) {
      setCurrentImageIndex(index);
    }
  };

  const handleContinue = () => {
    // Navigate to next component
    window.location.href = '#background-remover';
  };

  return (
    <div className="crop-resize-wrapper">
      <div className="crop-resize-container">
        <section className="editor-section">
          <h2 className="section-title">Image Editor</h2>
          <div className="cropper-container">
            {images.length > 0 && (
              isCropMode ? (
                <Cropper
                  ref={cropperRef}
                  src={images[currentImageIndex].url}
                  style={{ height: 500, width: '100%' }}
                  aspectRatio={aspectRatio}
                  guides={true}
                  viewMode={2}
                  dragMode="crop"
                  cropBoxMovable={true}
                  cropBoxResizable={true}
                  autoCropArea={0.8}
                  background={true}
                  responsive={true}
                  zoomable={true}
                  zoomOnTouch={false}
                  zoomOnWheel={false}
                  ready={() => {
                    const cropper = cropperRef.current?.cropper;
                    if (cropper) {
                      cropper.setAspectRatio(aspectRatio || 35/45); // Default to passport size
                    }
                  }}
                />
              ) : (
                <div className="preview-container">
                  <img 
                    src={images[currentImageIndex].url} 
                    alt="Preview" 
                    style={{ maxWidth: '100%', maxHeight: '500px' }}
                  />
                </div>
              )
            )}
          </div>

          <div className="controls">
            {!isCropMode ? (
              <div className="standard-controls">
                <button onClick={handleStartCrop} className="control-button primary">
                  Crop Manually
                </button>
                <button 
                  onClick={handleAutoDetect} 
                  className="control-button primary auto-detect"
                  disabled={isAutoDetecting}
                >
                  {isAutoDetecting ? 'Detecting...' : 'Auto-Detect Face'}
                </button>
              </div>
            ) : (
              <div className="crop-controls">
                <div className="aspect-ratio-controls">
                  {aspectRatioOptions.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleAspectRatioChange(option.value)}
                      className={`aspect-ratio-button ${aspectRatio === option.value ? 'active' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="crop-actions">
                  <button onClick={handleCancelCrop} className="control-button secondary">
                    Cancel
                  </button>
                  <button onClick={handleSaveCrop} className="control-button primary">
                    Save Crop
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <ImageGallery 
          images={images} 
          currentImageIndex={currentImageIndex} 
          isEditMode={isCropMode} 
          handleThumbnailClick={handleThumbnailClick} 
        />

        <div className="continue-button-container">
          <button className="continue-button" onClick={handleContinue}>
            Continue to Background Remover
          </button>
        </div>
      </div>
    </div>
  );
}

export default CropResize;