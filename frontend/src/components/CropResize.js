import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './CropResize.css';
import ImageGallery from './ImageGallery';
import CropDisplay from './shared/CropDisplay';

function CropResize({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
  const [isCropMode, setIsCropMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const cropperRef = useRef(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Store the last crop data for each image
  const [lastCropData, setLastCropData] = useState({});
  
  // Store current state of the image for display on the left
  const [currentImageState, setCurrentImageState] = useState(null);

  // Split aspect ratio options into two groups for two rows
  const aspectRatioOptionsRow1 = [
    { label: '35×45mm Passport', value: 35 / 45 },
    { label: '1:1 Square', value: 1 },
    { label: '4:3 Standard', value: 4 / 3 },
    { label: '16:9 Widescreen', value: 16 / 9 },
    { label: '3:4 Portrait', value: 3 / 4 },
    { label: 'Free Size', value: null },
  ];
  
  const aspectRatioOptionsRow2 = [
    { label: '2R (6.35×8.89cm)', value: 6.35 / 8.89 },
    { label: '3R (8.89×12.7cm)', value: 8.89 / 12.7 },
    { label: '4R (10.2×15.2cm)', value: 10.2 / 15.2 },
    { label: '5R (12.7×17.8cm)', value: 12.7 / 17.8 },
    { label: '6R (15.2×20.3cm)', value: 15.2 / 20.3 },
    { label: '8R (20.3×25.4cm)', value: 20.3 / 25.4 },
    { label: '10R (25.4×30.5cm)', value: 25.4 / 30.5 }
  ];

  const handleStartCrop = () => {
    // Store the current state of the image before starting crop mode
    setCurrentImageState({...images[currentImageIndex]});
    setIsCropMode(true);
    
    // Set aspect ratio based on previous crop or default to passport size
    const currentImage = images[currentImageIndex];
    if (currentImage.cropData && currentImage.cropData.aspectRatio) {
      setAspectRatio(currentImage.cropData.aspectRatio);
    } else {
      setAspectRatio(35/45); // Default to passport size
    }
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
        // First set crop mode and aspect ratio
        setIsCropMode(true);
        setAspectRatio(passportAspectRatio);
        
        // Use a longer timeout to ensure cropper is fully initialized
        setTimeout(() => {
          const cropper = cropperRef.current?.cropper;
          if (cropper) {
            // Get crop data from the API
            const { left, top, width, height } = data.cropData;
            
            // Reset the cropper to prepare for new cropbox
            cropper.clear();
            cropper.reset();
            
            // Apply aspect ratio first
            cropper.setAspectRatio(passportAspectRatio);
            
            // Enable cropping mode
            cropper.crop();
            
            // Wait for the cropper to be ready after reset
            setTimeout(() => {
              // Get canvas and container dimensions
              const canvasData = cropper.getCanvasData();
              const containerData = cropper.getContainerData();
              
              // Calculate the scale ratio between original image and displayed image
              const scaleX = canvasData.width / cropper.getImageData().naturalWidth;
              const scaleY = canvasData.height / cropper.getImageData().naturalHeight;
              
              // Create the cropbox with the data from backend, scaled properly
              const cropBoxData = {
                left: (left * scaleX) + canvasData.left,
                top: (top * scaleY) + canvasData.top,
                width: width * scaleX,
                height: height * scaleY
              };
              
              // Apply the cropbox
              cropper.setCropBoxData(cropBoxData);
              
              // Check if cropbox is fully visible
              const currentCropBox = cropper.getCropBoxData();
              const isOutOfBounds = 
                currentCropBox.left < 0 || 
                currentCropBox.top < 0 || 
                currentCropBox.left + currentCropBox.width > containerData.width ||
                currentCropBox.top + currentCropBox.height > containerData.height;
              
              // If the cropbox is outside visible area, adjust the view
              if (isOutOfBounds) {
                // Calculate zoom level that will fit the cropbox
                const zoomX = containerData.width / (cropBoxData.width * 1.1);
                const zoomY = containerData.height / (cropBoxData.height * 1.1);
                const zoom = Math.min(zoomX, zoomY, 1); // Don't zoom in
                
                // Apply zoom
                cropper.zoomTo(zoom);
                
                // Center the image on the crop box
                const cropCenterX = cropBoxData.left + cropBoxData.width / 2;
                const cropCenterY = cropBoxData.top + cropBoxData.height / 2;
                
                cropper.moveTo(
                  containerData.width / 2 - cropCenterX,
                  containerData.height / 2 - cropCenterY
                );
              }
            }, 200);
          }
        }, 500);
      } else {
        console.error("Face detection failed:", data.error);
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
      // Get crop data in actual pixels
      const cropData = cropper.getData(true);
      
      // Store this crop data for potential reuse
      setLastCropData({
        ...lastCropData,
        [currentImageIndex]: {
          x: cropData.x,
          y: cropData.y,
          width: cropData.width,
          height: cropData.height,
          aspectRatio: aspectRatio || NaN,
          rotation: cropData.rotate || 0
        }
      });
      
      // Update the current image with crop dimensions
      const updatedImages = [...images];
      updatedImages[currentImageIndex] = {
        ...updatedImages[currentImageIndex],
        cropData: {
          x: cropData.x,
          y: cropData.y,
          width: cropData.width,
          height: cropData.height,
          aspectRatio: aspectRatio || NaN,
          rotation: cropData.rotate || 0
        },
        // Store original dimensions for reference
        originalWidth: cropper.getImageData().naturalWidth,
        originalHeight: cropper.getImageData().naturalHeight
      };
      
      // Update images without creating a duplicate
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

  // Initialize currentImageState when component mounts or currentImageIndex changes
  useEffect(() => {
    if (images[currentImageIndex]) {
      setCurrentImageState({...images[currentImageIndex]});
    }
  }, [images, currentImageIndex]);

  // Function to render the current state of the image
  const renderCurrentImageState = () => {
    if (!currentImageState) return null;

    return (
      <div className="original-image-container">
        <CropDisplay 
          image={currentImageState}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '480px',  // Consistent with preview height
            objectFit: 'contain' 
          }}
        />
      </div>
    );
  };

  // Function to render the cropped view of an image
  const renderCroppedImage = (imageData) => {
    if (!imageData) return null;
    
    if (!imageData.cropData) {
      return (
        <img 
          src={imageData.url} 
          alt="Preview" 
          style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain' }}
        />
      );
    }
    
    return (
      <CropDisplay 
        image={imageData}
        style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain' }}
      />
    );
  };

  return (
    <div className="crop-resize-wrapper">
      <h2 className="section-title">Image Editor</h2>
      
      <div className="crop-resize-container wide-layout">
        {/* Left side - Current state of the image */}
        <div className="original-image-section">
          <h3>Current Photo</h3>
          {renderCurrentImageState()}
          {/* Adding an empty controls div for consistent spacing */}
          <div className="controls"></div>
        </div>
        
        {/* Right side - Editing Area */}
        <div className="editing-section">
          <h3>Editing Preview</h3>
          <div className={isCropMode ? "cropper-container" : "preview-container"}>
            {images.length > 0 && (
              isCropMode ? (
                <Cropper
                  ref={cropperRef}
                  src={images[currentImageIndex].url}
                  style={{ height: 480, width: '100%' }} /* Match height with preview */
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
                      cropper.setAspectRatio(aspectRatio || 35/45);
                      
                      // If image already has crop data, apply it
                      const currentImage = images[currentImageIndex];
                      if (currentImage.cropData) {
                        cropper.setData({
                          x: currentImage.cropData.x,
                          y: currentImage.cropData.y,
                          width: currentImage.cropData.width,
                          height: currentImage.cropData.height,
                          rotate: currentImage.cropData.rotation || 0
                        });
                      }
                      // If no crop data but we have last crop data, apply that
                      else if (lastCropData[currentImageIndex]) {
                        cropper.setData({
                          x: lastCropData[currentImageIndex].x,
                          y: lastCropData[currentImageIndex].y,
                          width: lastCropData[currentImageIndex].width,
                          height: lastCropData[currentImageIndex].height,
                          rotate: lastCropData[currentImageIndex].rotation || 0
                        });
                      }
                    }
                  }}
                />
              ) : (
                renderCroppedImage(images[currentImageIndex])
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
                <div className="aspect-ratio-controls-container">
                  <div className="aspect-ratio-row">
                    {aspectRatioOptionsRow1.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleAspectRatioChange(option.value)}
                        className={`aspect-ratio-button ${aspectRatio === option.value ? 'active' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="aspect-ratio-row">
                    {aspectRatioOptionsRow2.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleAspectRatioChange(option.value)}
                        className={`aspect-ratio-button ${aspectRatio === option.value ? 'active' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
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
        </div>
      </div>
      
      {/* Image Gallery Below */}
      <div className="gallery-section">
        <ImageGallery 
          images={images} 
          currentImageIndex={currentImageIndex} 
          isEditMode={isCropMode} 
          handleThumbnailClick={handleThumbnailClick} 
        />
      </div>

      <div className="continue-button-container">
        <button className="continue-button" onClick={handleContinue}>
          Continue to Background Remover
        </button>
      </div>
    </div>
  );
}

export default CropResize;