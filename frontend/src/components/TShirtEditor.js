import React, { useState } from 'react';
import './TShirtEditor.css';

function TShirtEditor({ onNext, onBack }) {
  const [images, setImages] = useState(() => {
    const savedImages = sessionStorage.getItem('uploadedImages');
    return savedImages ? JSON.parse(savedImages) : [];
  });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleThumbnailClick = (index) => {
    if (!isEditMode) {
      setCurrentImageIndex(index);
    }
  };

  const handleAddShirt = () => {
    // Placeholder function for adding shirt
    console.log('Add shirt clicked');
  };

  const handleRemoveShirt = () => {
    // Placeholder function for removing shirt
    console.log('Remove shirt clicked');
  };

  return (
    <div className="tshirt-editor-wrapper">
      <div className="tshirt-editor-container">
        <section className="editor-section">
          <h2 className="section-title">T-Shirt Editor</h2>
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
                      onClick={handleAddShirt} 
                      className="control-button primary"
                    >
                      Add Shirt
                    </button>
                    <button 
                      onClick={handleRemoveShirt} 
                      className="control-button secondary"
                    >
                      Remove Shirt
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
            Continue to Next Step
          </button>
        </div>
      </div>
    </div>
  );
}

export default TShirtEditor;