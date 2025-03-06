import React, { useState, useEffect } from 'react';
import './Export.css';

const Export = ({ images, currentImageIndex }) => {
    const [filename, setFilename] = useState('');
    const [format, setFormat] = useState('jpeg');
    const [scale, setScale] = useState(100);
    const [quality, setQuality] = useState(100);
    const [exportedImage, setExportedImage] = useState(null);
    const [fileSize, setFileSize] = useState(null);
    const [resolution, setResolution] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (images.length > 0) {
            const latestImage = images[currentImageIndex];
            setExportedImage(latestImage.url);

            // Set default filename with "PhotoGen --" prefix
            const originalName = latestImage.name ? latestImage.name.split('.')[0] : 'Untitled';
            setFilename(`PhotoGen — ${originalName}`);
        }
    }, [images, currentImageIndex]);

    useEffect(() => {
        if (exportedImage) {
            estimateFileSize();
        }
    }, [exportedImage]);

    const estimateFileSize = () => {
        if (!exportedImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = exportedImage;

        img.onload = () => {
            canvas.width = (img.width * scale) / 100;
            canvas.height = (img.height * scale) / 100;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            setResolution({ width: canvas.width, height: canvas.height });

            const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality / 100 : 1);
            setFileSize((dataUrl.length * (3 / 4) / 1024).toFixed(2)); // Convert base64 size to KB
        };
    };

    useEffect(() => {
        estimateFileSize();
    }, [scale, quality, format]);

    const processImage = () => {
        if (!exportedImage) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = exportedImage;

        img.onload = () => {
            canvas.width = (img.width * scale) / 100;
            canvas.height = (img.height * scale) / 100;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality / 100 : 1);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename.trim() || 'PhotoGen -- Exported'}.${format}`;
            link.click();
        };
    };

    return (
        <div className="export-container">
            <div className="export-left">
                {exportedImage && (
                    <div className="export-preview">
                        <h3>Preview</h3>
                        <img src={exportedImage} alt="Exported preview" className="exported-image" />
                    </div>
                )}
            </div>

            <div className="export-right">
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
                </div>

                <div className="slider-container">
                    <label>Size: {scale}%</label>
                    <input
                        type="range"
                        min="10"
                        max="200"
                        step="10"
                        value={scale}
                        onChange={(e) => setScale(parseInt(e.target.value))}
                    />
                    <span>{resolution.width} × {resolution.height} px</span>
                </div>

                {format === 'jpeg' && (
                    <div className="slider-container">
                        <label>Quality: {quality}%</label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value))}
                        />
                    </div>
                )}

                <p>Estimated file size: {fileSize ? `${fileSize} KB` : 'Calculating...'}</p>
                <button onClick={processImage}>Download Image</button>
            </div>
        </div>
    );
};

export default Export;
