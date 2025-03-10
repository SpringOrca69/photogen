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
    const zip = new JSZip();
    const folder = zip.folder('PhotoGen_Export');

    const indicesToExport = exportAll
    ? images.map((_, i) => i)
    : selectedIndices;

    for (let index of indicesToExport) {
    const ref = exportRefs.current[index];
    if (ref && ref.getProcessedBlobAndFilename) {
        const { blob, filename } = await ref.getProcessedBlobAndFilename();
        folder.file(filename, blob);
    }
    }

    zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, exportAll ? 'All_PhotoGen_Images.zip' : 'Selected_PhotoGen_Images.zip');
    });
};

return (
    <>
    {/* ZIP Export Buttons */}
    <div className="export-buttons-container">
        <button
        className="export-zip-btn"
        onClick={() => handleExportZip(false)}
        disabled={selectedIndices.length === 0}
        >
        Export Selected
        </button>
        <button className="export-zip-btn" onClick={() => handleExportZip(true)}>
        Export All
        </button>
    </div>

    {/* Export Containers for selected images */}
    <div className="export-multiple-container">
        {selectedIndices.map((index) => (
        <ExportContainer
            key={index}
            ref={(el) => (exportRefs.current[index] = el)}
            image={images[index]}
        />
        ))}
    </div>

    {/* Hidden ExportContainers for Export All */}
    <div style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
        {images.map((image, index) => {
        if (!selectedIndices.includes(index)) {
            return (
            <ExportContainer
                key={`hidden-${index}`}
                ref={(el) => (exportRefs.current[index] = el)}
                image={image}
            />
            );
        }
        return null;
        })}
    </div>

    {/* Image Gallery */}
    <ImageGallery
        images={images}
        selectedIndices={selectedIndices}
        isEditMode={false}
        handleThumbnailClick={toggleImageSelection}
    />
    </>
);
};

export default Export;



