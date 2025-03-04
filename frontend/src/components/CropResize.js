import React, { useState, useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './CropResize.css';

function CropResize({ onNext, onBack }) {
  const [images, setImages] = useState(() => {
    const savedImages = sessionStorage.getItem('uploadedImages');
    return savedImages ? JSON.parse(savedImages) : [];
  });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCropMode, setIsCropMode] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null);
  const cropperRef = useRef(null);

  const aspectRatioOptions = [
    { label: '1:1 Square', value: 1 },
    { label: '4:3 Standard', value: 4/3 },
    { label: '16:9 Widescreen', value: 16/9 },
    { label: '3:4 Portrait', value: 3/4 },
    { label: 'Free Size', value: null }
  ];

  const handleStartCrop = () => {
    setIsCropMode(true);
    setAspectRatio(1); // Default to 1:1 when entering crop mode
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
      
      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      setCurrentImageIndex(updatedImages.length - 1);
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
                  zoomable={false}
                  ready={() => {
                    const cropper = cropperRef.current?.cropper;
                    cropper?.setAspectRatio(aspectRatio);
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
              <div className="standard-controls single-button">
                <button onClick={handleStartCrop} className="control-button primary">
                  Crop this photo
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

        <section className={`thumbnails-section ${isCropMode ? 'disabled' : ''}`}>
          <h2 className="section-title">Image Gallery</h2>
          <div className="thumbnails-grid">
            {images.map((image, index) => (
              <div 
                key={index}
                className={`thumbnail-card ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(index)}
              >
                <div className="thumbnail-image">
                  <img src={image.url} alt={`Version ${index + 1}`} />
                </div>
                <div className="thumbnail-info">
                  <span className="thumbnail-name">{image.name}</span>
                  {image.originalIndex !== undefined && (
                    <span className="thumbnail-badge">Cropped</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="continue-button-container">
          <button className="continue-button">
            Continue to Background Remover
          </button>
        </div>
      </div>
    </div>
  );
}

export default CropResize;
