import React, { useState, useEffect } from 'react';
import './Export.css';

const Export = () => {
    const [filename, setFilename] = useState('download');
    const [format, setFormat] = useState('jpeg');
    const [scale, setScale] = useState(1);
    const [quality, setQuality] = useState(0.8); // JPEG quality
    const [exportedImage, setExportedImage] = useState(null);
    const [fileSize, setFileSize] = useState(null);

    // Load the latest edited image from sessionStorage
    useEffect(() => {
        const savedImages = JSON.parse(sessionStorage.getItem('uploadedImages')) || [];
        if (savedImages.length > 0) {
            setExportedImage(savedImages[savedImages.length - 1].url); // Get the most recent image
        }
    }, []);

    // Function to process image (scaling, format conversion, and size estimation)
    const processImage = () => {
        if (!exportedImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = exportedImage;

        img.onload = () => {
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality : 1);
            setFileSize((dataUrl.length * (3 / 4) / 1024).toFixed(2)); // Convert base64 size to KB

            // Trigger download
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename.trim() || 'exported_image'}.${format}`;
            link.click();
        };
    };

    return (
        <div className="export-container">
            <h2>Export Image</h2>
            <div className="export-options">
                <input
                    type="text"
                    placeholder="Filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                />
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                </select>
                <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                />
            </div>

            {/* Show JPEG Quality Slider only when JPEG is selected */}
            {format === 'jpeg' && (
                <div className="quality-control">
                    <label>Quality: {quality}</label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                    />
                </div>
            )}

            {exportedImage && (
                <div className="export-preview">
                    <h3>Preview</h3>
                    <img src={exportedImage} alt="Exported preview" className="exported-image" />
                    {fileSize && <p>Estimated file size: {fileSize} KB</p>}
                    <button onClick={processImage}>Download Image</button>
                </div>
            )}
        </div>
    );
};

export default Export;


