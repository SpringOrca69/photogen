import React, { useState, useRef } from 'react';
import './Export.css';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ImageGallery from './ImageGallery';
import ExportContainer from './ExportContainer';

const Export = ({ images, currentImageIndex }) => {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const exportRefs = useRef({});

  const toggleImageSelection = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleExportZip = async (exportAll = false) => {
    try {
      const zip = new JSZip();
      const folder = zip.folder('PhotoGen_Export');

      const indicesToExport = exportAll
        ? Array.from({ length: images.length }, (_, i) => i)
        : selectedIndices;
        
      if (indicesToExport.length === 0) {
        alert("Please select at least one image to export");
        return;
      }

      let exportedCount = 0;
      let errorCount = 0;
      
      for (let index of indicesToExport) {
        try {
          const ref = exportRefs.current[index];
          if (ref && ref.getProcessedBlobAndFilename) {
            const { blob, filename } = await ref.getProcessedBlobAndFilename();
            folder.file(filename, blob);
            exportedCount++;
          } else {
            console.error(`Export reference not available for index ${index}`);
            errorCount++;
          }
        } catch (err) {
          console.error(`Failed to export image at index ${index}:`, err);
          errorCount++;
        }
      }

      if (exportedCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, exportAll ? 'All_PhotoGen_Images.zip' : 'Selected_PhotoGen_Images.zip');
        
        if (errorCount > 0) {
          alert(`Export completed with ${errorCount} errors. ${exportedCount} images were exported successfully.`);
        }
      } else {
        alert("No images could be exported. Please try selecting different images.");
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + (err.message || "Unknown error"));
    }
  };

  const handleSingleExport = (index) => {
    const ref = exportRefs.current[index];
    if (ref && ref.getProcessedBlobAndFilename) {
      ref.getProcessedBlobAndFilename().then(({ blob, filename }) => {
        saveAs(blob, filename);
      }).catch(err => {
        console.error("Single export failed:", err);
        alert("Export failed: " + (err.message || "Unknown error"));
      });
    }
  };

  return (
    <div className="export-page">
      <h2>Export Images</h2>
      
      {/* ZIP Export Buttons */}
      <div className="export-buttons-container">
        <button
          className="export-zip-btn"
          onClick={() => handleExportZip(false)}
          disabled={selectedIndices.length === 0}
        >
          Export Selected ({selectedIndices.length})
        </button>
        <button 
          className="export-zip-btn" 
          onClick={() => handleExportZip(true)}
          disabled={images.length === 0}
        >
          Export All ({images.length})
        </button>
      </div>

      {/* Export Preview for currently selected image */}
      {images.length > 0 && (
        <div className="current-export-preview">
          <h3>Current Image Preview</h3>
          <ExportContainer
            ref={el => { exportRefs.current[currentImageIndex] = el; }}
            image={images[currentImageIndex]}
          />
          <button 
            className="export-single-btn"
            onClick={() => handleSingleExport(currentImageIndex)}
          >
            Export This Image
          </button>
        </div>
      )}

      {/* Hidden ExportContainers for all images */}
      <div style={{ display: 'none' }}>
        {images.map((image, index) => {
          if (index !== currentImageIndex) {
            return (
              <ExportContainer
                key={`hidden-${index}`}
                ref={(el) => { exportRefs.current[index] = el; }}
                image={image}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Image Gallery */}
      <h3>Select Images to Export</h3>
      <p>Click on images to select/deselect them for batch export</p>
      <ImageGallery
        images={images}
        currentImageIndex={currentImageIndex}
        selectedIndices={selectedIndices}
        isEditMode={false}
        handleThumbnailClick={toggleImageSelection}
      />
      
      {images.length === 0 && (
        <div className="no-images-message">
          <p>No images available for export. Please upload and process some images first.</p>
        </div>
      )}
    </div>
  );
};

export default Export;



