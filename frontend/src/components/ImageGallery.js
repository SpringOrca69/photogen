import React from 'react';
import './ImageGallery.css';

function ImageGallery({ 
  images, 
  currentImageIndex, 
  selectedIndices = [], 
  isEditMode, 
  handleThumbnailClick,
  handleDeleteImage,
  isExportMode = false
}) {
  return (
    <section className={`thumbnails-section ${isEditMode ? 'disabled' : ''}`}>
      <h2 className="section-title">
        {isExportMode ? 'Select Images to Export' : 'Image Gallery'}
        {isExportMode && selectedIndices.length > 0 && 
          <span className="selection-count">({selectedIndices.length} selected)</span>
        }
      </h2>
      <div className="thumbnails-scroll-container">
        <div className="thumbnails-grid">
          {images.map((image, index) => {
            // In export mode, only show as selected if explicitly in selectedIndices
            // In normal mode, use currentImageIndex
            const isSelected = isExportMode
              ? selectedIndices.includes(index)
              : currentImageIndex === index;

            return (
              <div
                key={index}
                className={`thumbnail-card ${isSelected ? 'active' : ''}`}
              >
                <button 
                  className="thumbnail-delete-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(index);
                  }}
                  title="Delete image"
                >
                  ×
                </button>
                <div 
                  className="thumbnail-image"
                  onClick={() => handleThumbnailClick(index)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={image.url} alt={`Version ${index + 1}`} />
                </div>
                <div className="thumbnail-info">
                  <span className="thumbnail-name">{image.name}</span>
                  {image.originalIndex !== undefined && (
                    <span className="thumbnail-badge">Cropped</span>
                  )}
                  {isExportMode && isSelected && (
                    <span className="thumbnail-badge export-badge">Selected</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ImageGallery;
