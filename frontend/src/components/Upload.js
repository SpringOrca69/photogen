import React, { useState } from 'react';
import './Upload.css';

function Upload({ onNext, updateImages }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
    createPreviews(selectedFiles);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles(droppedFiles);
    createPreviews(droppedFiles);
  };

  const createPreviews = (selectedFiles) => {
    const newPreviews = selectedFiles.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file: file
    }));
    setPreviews(prevPreviews => {
      // Revoke old URLs to prevent memory leaks
      prevPreviews.forEach(preview => URL.revokeObjectURL(preview.url));
      return newPreviews;
    });
  };

  const handleDelete = (indexToDelete) => {
    URL.revokeObjectURL(previews[indexToDelete].url);
    
    setPreviews(prevPreviews => 
      prevPreviews.filter((_, index) => index !== indexToDelete)
    );
    setFiles(prevFiles => 
      prevFiles.filter((_, index) => index !== indexToDelete)
    );
  };

  const handleNextClick = () => {
    const imageData = previews.map(preview => ({
      url: preview.url,
      name: preview.name
    }));
    sessionStorage.setItem('uploadedImages', JSON.stringify(imageData));
    updateImages(imageData);
    onNext('Crop & Resize');
  };

  return (
    <div className="upload-container">
      <div 
        className="upload-area"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-label">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <h3>Drop your images here</h3>
            <p>or click to browse</p>
          </div>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="preview-section">
          <h3>Selected Images</h3>
          <div className="preview-grid">
            {previews.map((preview, index) => (
              <div key={index} className="preview-card">
                <img src={preview.url} alt={preview.name} />
                <div className="preview-info">
                  <span className="preview-name">{preview.name}</span>
                  <button 
                    onClick={() => handleDelete(index)}
                    className="delete-button"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={handleNextClick}
            className="next-button"
            disabled={previews.length === 0}
          >
            Continue to Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default Upload;
