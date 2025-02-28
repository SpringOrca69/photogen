import React from 'react';
import './ImageGallery.css';

// FOR TESTING ONLY

function ImageGallery({ images, currentImageIndex, isCropMode, handleThumbnailClick }) {
  return (
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
  );
}

export default ImageGallery;