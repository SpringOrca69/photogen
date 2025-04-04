import React, { useRef, useEffect } from 'react';
import './ImageGallery.css';
import CropDisplay from './shared/CropDisplay';

function ImageGallery({ images, currentImageIndex, selectedIndices = [], isEditMode, handleThumbnailClick }) {
  const galleryRef = useRef(null);
  
  // Scroll active thumbnail into view when currentImageIndex changes
  useEffect(() => {
    if (galleryRef.current && currentImageIndex !== null && currentImageIndex !== undefined) {
      // Find the active thumbnail element
      const thumbnailElements = galleryRef.current.querySelectorAll('.thumbnail-card');
      if (thumbnailElements[currentImageIndex]) {
        thumbnailElements[currentImageIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentImageIndex]);
  
  // Add effect to adjust body padding when component mounts/unmounts
  useEffect(() => {
    // Set padding when component mounts
    document.body.style.paddingBottom = '230px';
    
    // Reset padding when component unmounts
    return () => {
      document.body.style.paddingBottom = '0';
    };
  }, []);
  
  // Simple thumbnail rendering function
  const renderThumbnail = (image, index) => {
    const isActive = index === currentImageIndex;
    const isSelected = selectedIndices.includes(index);
    const thumbnailClass = `thumbnail-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`;
    
    return (
      <div 
        key={index} 
        className={thumbnailClass}
        onClick={() => handleThumbnailClick(index)}
      >
        <div className="thumbnail-wrapper">
          <div className="thumbnail-image">
            <CropDisplay 
              image={image}
              style={{ 
                objectFit: 'contain',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          </div>
        </div>
        <div className="thumbnail-info">
          <span className="thumbnail-name">{image.name || `Image ${index + 1}`}</span>
          {isActive && <span className="thumbnail-badge">Selected</span>}
        </div>
      </div>
    );
  };

  return (
    <section className={`thumbnails-section ${isEditMode ? 'disabled' : ''}`}>
      <h2 className="section-title">Image Gallery</h2>
      <div className="thumbnails-grid" ref={galleryRef}>
        {images.map((image, index) => renderThumbnail(image, index))}
      </div>
    </section>
  );
}

export default ImageGallery;