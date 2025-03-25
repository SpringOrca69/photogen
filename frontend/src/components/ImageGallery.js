import React from 'react';
import './ImageGallery.css';

function ImageGallery({ images, currentImageIndex, selectedIndices = [], isEditMode, handleThumbnailClick, handleDeleteImage }) {
  return (
    <section className={`thumbnails-section ${isEditMode ? 'disabled' : ''}`}>
      <h2 className="section-title">Image Gallery</h2>
      <div className="thumbnails-grid">
        {images.map((image, index) => {
          const isSelected = selectedIndices.length > 0
            ? selectedIndices.includes(index)
            : currentImageIndex === index;

          return (
            <div
              key={index}
              className={`thumbnail-card ${isSelected ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(index)}
            >
              <div className="thumbnail-image">
                <img src={image.url} alt={`Version ${index + 1}`} />
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(index);
                  }}
                >
                  &times;
                </button>
              </div>
              <div className="thumbnail-info">
                <span className="thumbnail-name">{image.name}</span>
                {image.originalIndex !== undefined && (
                  <span className="thumbnail-badge">Cropped</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ImageGallery;