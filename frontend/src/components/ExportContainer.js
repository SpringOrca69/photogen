import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './Export.css';

const ExportContainer = forwardRef(({ image, errors = [], onDelete }, ref) => {
    const [filename, setFilename] = useState('');
    const [format, setFormat] = useState('jpeg');
    const [quality, setQuality] = useState(90);
    const [scale, setScale] = useState(100);
    const [resolution, setResolution] = useState({ width: 0, height: 0 });
    const [fileSize, setFileSize] = useState(null);
    const [processedImage, setProcessedImage] = useState(null);
    
    // Get base name without extension
    useEffect(() => {
        if (image && image.name) {
            const baseName = image.name.split('.').slice(0, -1).join('.');
            setFilename(baseName || 'image');
        }
    }, [image]);
    
    // Calculate resolution and file size when parameters change
    useEffect(() => {
        if (image && image.url) {
            const img = new Image();
            img.onload = () => {
                const scaledWidth = Math.round((img.width * scale) / 100);
                const scaledHeight = Math.round((img.height * scale) / 100);
                
                setResolution({
                    width: scaledWidth,
                    height: scaledHeight
                });
                
                // Estimate file size
                const canvas = document.createElement('canvas');
                canvas.width = scaledWidth;
                canvas.height = scaledHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
                
                const dataURL = canvas.toDataURL(`image/${format}`, quality / 100);
                const binary = atob(dataURL.split(',')[1]);
                const estimatedSize = Math.round(binary.length / 1024); // KB
                
                setFileSize(estimatedSize);
                setProcessedImage(dataURL);
            };
            
            img.src = image.url;
        }
    }, [image, scale, format, quality]);
    
    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        getProcessedBlobAndFilename: async () => {
            // Create a proper filename with extension
            const extension = format === 'jpeg' ? 'jpg' : format;
            const fullFilename = `${filename}.${extension}`;
            
            // Convert data URL to Blob
            const response = await fetch(processedImage);
            const blob = await response.blob();
            
            return {
                blob,
                filename: fullFilename
            };
        }
    }));
    
    const processImage = () => {
        if (processedImage) {
            const link = document.createElement('a');
            const extension = format === 'jpeg' ? 'jpg' : format;
            link.download = `${filename}.${extension}`;
            link.href = processedImage;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    
    if (!image) return null;
    
    return (
        <div className="export-card">
            {onDelete && (
                <button 
                    className="export-delete-btn" 
                    onClick={onDelete}
                    title="Remove from export"
                >
                    ×
                </button>
            )}
            
            <div className="export-container-row">
                <div className="export-left">
                    <div className="export-preview">
                        {image.url && (
                            <img 
                                src={image.url} 
                                alt={image.name || 'Preview'} 
                                className="exported-image" 
                            />
                        )}
                    </div>
                </div>

                <div className="export-right">
                    <h2>Export Image</h2>
                    <div className="export-options">
                        <input 
                            type="text" 
                            value={filename} 
                            onChange={(e) => setFilename(e.target.value)} 
                            placeholder="Filename"
                        />
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
                    <button onClick={processImage} className="btn btn-primary">Download Image</button>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="compliance-errors">
                    <h3>Image may not be compliant with standards:</h3>
                    <ul>
                        {errors.map((error, i) => (
                            <li key={i}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
});

export default ExportContainer;
