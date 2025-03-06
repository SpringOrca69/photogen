import React, { useState } from 'react';
import './BackgroundRemover.css';

function BackgroundRemover({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
  const [isEditMode, setIsEditMode] = useState(false);

  const handleThumbnailClick = (index) => {
    if (!isEditMode) {
      setCurrentImageIndex(index);
    }
  };

  const handleAddSelected = () => {
    // Placeholder function for adding selected image
    console.log('Add selected clicked');
  };

  const handleRemoveSelected = () => {
    // Placeholder function for removing selected image
    console.log('Remove selected clicked');
  };

  return (
    <div className="background-remover-wrapper">
      <div className="background-remover-container">
        <section className="editor-section">
          <h2 className="section-title">Image Editor</h2>
          <div className="editor-container">
            {images.length > 0 && (
              <div className="editor-layout">
                <div className="preview-section">
                  <div className="preview-container">
                    <img 
                      src={images[currentImageIndex].url} 
                      alt="Preview" 
                      className="preview-image"
                    />
                  </div>
                </div>
                <div className="editor-controls-section">
                  <div className="editor-controls">
                    <button 
                      onClick={handleAddSelected} 
                      className="control-button primary"
                    >
                      Add selected
                    </button>
                    <button 
                      onClick={handleRemoveSelected} 
                      className="control-button secondary"
                    >
                      Remove selected
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={`thumbnails-section ${isEditMode ? 'disabled' : ''}`}>
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
            Continue to T-Shirt Editor
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackgroundRemover;