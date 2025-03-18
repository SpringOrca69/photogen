import React, { useState, useEffect } from 'react';
import './Upload.css';

function Upload({ onNext, updateImages }) {
  const [files, setFiles] = useState([]);
  const [toBeUploaded, setToBeUploaded] = useState([]);

  useEffect(() => {
    const storedImages = JSON.parse(sessionStorage.getItem('toBeUploaded'));
    if (storedImages && storedImages.length > 0) {
      const restoredPreviews = storedImages.map(image => ({
        url: image.base64,
        name: image.name,
        file: null
      }));
      setToBeUploaded(restoredPreviews);
    }
  }, []);

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
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
    setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
    createPreviews(droppedFiles);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const saveToSessionStorage = async (allPreviews) => {
    const imageData = await Promise.all(allPreviews.map(async (preview) => {
      let base64 = preview.url;
      if (preview.file) {
        base64 = await fileToBase64(preview.file);
      }
      return {
        name: preview.name,
        base64: base64
      };
    }));
    sessionStorage.setItem('toBeUploaded', JSON.stringify(imageData));
  };

  const createPreviews = async (selectedFiles) => {
    const newPreviews = selectedFiles.map(file => ({
      url: URL.createObjectURL(file),
      name: file.name,
      file: file
    }));
    setToBeUploaded(prevPreviews => {
      const updated = [...prevPreviews, ...newPreviews];
      saveToSessionStorage(updated);
      return updated;
    });
  };

  const handleDelete = (indexToDelete) => {
    URL.revokeObjectURL(toBeUploaded[indexToDelete].url);

    const updatedPreviews = toBeUploaded.filter((_, index) => index !== indexToDelete);
    setToBeUploaded(updatedPreviews);
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
    saveToSessionStorage(updatedPreviews);
  };

  const handleNextClick = async () => {
    const imageData = await Promise.all(toBeUploaded.map(async (preview) => {
      let base64 = preview.url;
      if (preview.file) {
        base64 = await fileToBase64(preview.file);
      }
      return {
        name: preview.name,
        base64: base64,
        url: preview.url // Preserve the object URL for new images
      };
    }));

    // Retrieve existing uploadedImages from sessionStorage
    const existingImages = JSON.parse(sessionStorage.getItem('uploadedImages')) || [];

    // Append new images to the existing ones
    const updatedImages = [...existingImages, ...imageData];

    // Store the updated list in sessionStorage
    sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));

    // Transform data so that CropResize receives { name, url } instead of base64
    const transformedData = updatedImages.map((img) => ({
      name: img.name,
      url: img.url || img.base64 // Preserve the original URL if it exists
    }));

    updateImages(transformedData);
    setToBeUploaded([]);
    setFiles([]);
    sessionStorage.removeItem('toBeUploaded');
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

      {toBeUploaded.length > 0 && (
        <div className="preview-section">
          <h3>Selected Images</h3>
          <div className="preview-grid">
            {toBeUploaded.map((preview, index) => (
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
            disabled={toBeUploaded.length === 0}
          >
            Continue to Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default Upload;