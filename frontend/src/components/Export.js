import React, { useState, useRef, useEffect } from 'react';
import './Export.css';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ImageGallery from './ImageGallery';
import ExportContainer from './ExportContainer';

const Export = ({ images, currentImageIndex }) => {
const [selectedIndices, setSelectedIndices] = useState([]);
const [errors, setErrors] = useState({});

const exportRefs = useRef({});

useEffect(() => {
    window.scrollTo(0, 0);
}, []);

const toggleImageSelection = (index) => {
    setSelectedIndices((prev) =>
    prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
    complianceCheck(index);
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

const complianceCheck = async (index) => {
    
    const imageDataUrl = await imageUrlToDataUrl(images[index].url);
    
    const response = await fetch('/api/compliance-checker/checks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageDataUrl
        }),
    });
  
    if (!response.ok) {
        throw new Error('Compliance check failed');
    }
  
    const result = await response.json();

    if (!result.compliant){
        setErrors((prevErrors) => ({ ...prevErrors, [index]: result.errors }));
    }
};

const isDataUrl = (url) => {
    return url.startsWith('data:');
};

async function imageUrlToDataUrl(url) {
    if (isDataUrl(url)) return url;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
  
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    } catch (error) {
        console.error("Error converting imageUrl to dataUrl:", error);
    }
}

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
            errors={errors[index] || []}
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



