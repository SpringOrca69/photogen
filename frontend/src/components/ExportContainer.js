import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './Export.css';

const ExportContainer = forwardRef(({ image }, ref) => {
    const [filename, setFilename] = useState('');
    const [format, setFormat] = useState('jpeg');
    const [scale, setScale] = useState(100);
    const [quality, setQuality] = useState(100);
    const [fileSize, setFileSize] = useState(null);
    const [resolution, setResolution] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (image?.url) {
            const originalName = image.name ? image.name.split('.')[0] : 'Untitled';
            setFilename(`PhotoGen — ${originalName}`);
            estimateFileSize(image.url);
        }
    }, [image]);

    useEffect(() => {
        if (image?.url) {
            estimateFileSize(image.url);
        }
    }, [scale, quality, format]);

    const estimateFileSize = (imgUrl) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imgUrl;

        img.onload = () => {
            canvas.width = (img.width * scale) / 100;
            canvas.height = (img.height * scale) / 100;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            setResolution({ width: canvas.width, height: canvas.height });

            const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality / 100 : 1);
            setFileSize((dataUrl.length * (3 / 4) / 1024).toFixed(2));
        };
    };

    const processImage = () => {
        if (!image?.url) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = image.url;

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

    // Expose method for Export.js to access processed image + name
    useImperativeHandle(ref, () => ({
        async getProcessedBlobAndFilename() {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.src = image.url;

                img.onload = () => {
                    canvas.width = (img.width * scale) / 100;
                    canvas.height = (img.height * scale) / 100;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        resolve({
                            blob,
                            filename: `${filename.trim() || 'PhotoGen -- Exported'}.${format}`
                        });
                    }, `image/${format}`, format === 'jpeg' ? quality / 100 : 1);
                };
            });
        }
    }));

    return (
        <div className="export-card">
            <div className="export-container">
                <div className="export-left">
                    <div className="export-preview">
                        <h3>Preview</h3>
                        <img src={image.url} alt="Exported preview" className="exported-image" />
                    </div>
                </div>

                <div className="export-right">
                    <h2>Export Image</h2>
                    <div className="export-options">
                        <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} />
                        <select value={format} onChange={(e) => setFormat(e.target.value)}>
                            <option value="jpeg">JPEG</option>
                            <option value="png">PNG</option>
                        </select>
                    </div>

                    <div className="slider-container">
                        <label>Size: {scale}%</label>
                        <input type="range" min="10" max="200" step="10" value={scale} onChange={(e) => setScale(parseInt(e.target.value))} />
                        <span>{resolution.width} × {resolution.height} px</span>
                    </div>

                    {format === 'jpeg' && (
                        <div className="slider-container">
                            <label>Quality: {quality}%</label>
                            <input type="range" min="10" max="100" step="5" value={quality} onChange={(e) => setQuality(parseInt(e.target.value))} />
                        </div>
                    )}

                    <p>Estimated file size: {fileSize ? `${fileSize} KB` : 'Calculating...'}</p>
                    <button onClick={processImage}>Download Image</button>
                </div>
            </div>
        </div>
    );
});

export default ExportContainer;

