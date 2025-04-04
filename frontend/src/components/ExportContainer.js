import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ExportContainer.css';
import CropDisplay from './shared/CropDisplay';

const ExportContainer = forwardRef(({ image }, ref) => {
    const [format, setFormat] = useState('jpeg');
    const [quality, setQuality] = useState(90);
    const [scale, setScale] = useState(100);
    const [resolution, setResolution] = useState({ width: 0, height: 0 });
    const [fileSize, setFileSize] = useState(0);

    // Use a better function for updating the preview to avoid circular dependencies
    const updatePreview = React.useCallback(() => {
        if (!image?.url) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            try {
                if (image.cropData) {
                    canvas.width = (image.cropData.width * scale) / 100;
                    canvas.height = (image.cropData.height * scale) / 100;

                    // Draw only the cropped portion
                    ctx.drawImage(
                        img,
                        image.cropData.x, image.cropData.y,
                        image.cropData.width, image.cropData.height,
                        0, 0,
                        canvas.width, canvas.height
                    );
                } else {
                    canvas.width = (img.width * scale) / 100;
                    canvas.height = (img.height * scale) / 100;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }

                setResolution({ width: canvas.width, height: canvas.height });

                const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality / 100 : 1);
                setFileSize((dataUrl.length * (3 / 4) / 1024).toFixed(2));
            } catch (err) {
                console.error("Error generating preview:", err);
            }
        };
        
        img.onerror = () => {
            console.error("Failed to load image for preview");
        };
        
        img.src = image.url;
    }, [image, format, quality, scale]);

    useEffect(() => {
        updatePreview();
    }, [updatePreview]);

    useImperativeHandle(ref, () => ({
        getProcessedBlobAndFilename: async () => {
            return new Promise((resolve, reject) => {
                if (!image?.url) {
                    reject(new Error("No image available"));
                    return;
                }
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    try {
                        // Handle cropping if crop data is available
                        if (image.cropData) {
                            canvas.width = (image.cropData.width * scale) / 100;
                            canvas.height = (image.cropData.height * scale) / 100;

                            // Draw only the cropped portion
                            ctx.drawImage(
                                img,
                                image.cropData.x, image.cropData.y,
                                image.cropData.width, image.cropData.height,
                                0, 0,
                                canvas.width, canvas.height
                            );
                        } else {
                            canvas.width = (img.width * scale) / 100;
                            canvas.height = (img.height * scale) / 100;
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        }

                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    resolve({
                                        blob,
                                        filename: `${image.name || 'image'}.${format}`
                                    });
                                } else {
                                    reject(new Error("Failed to create image blob"));
                                }
                            },
                            `image/${format}`,
                            format === 'jpeg' ? quality / 100 : undefined
                        );
                    } catch (err) {
                        reject(err);
                    }
                };
                
                img.onerror = () => {
                    reject(new Error("Failed to load image"));
                };
                
                img.src = image.url;
            });
        }
    }), [image, format, quality, scale]);

    const renderPreviewImage = () => {
        if (!image) return null;
        
        return (
            <CropDisplay 
                image={image}
                className="preview-image"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
        );
    };

    return (
        <div className="export-container">
            <div className="export-preview">
                {renderPreviewImage()}
            </div>
            <div className="export-controls">
                <div className="control-group">
                    <label>Format:</label>
                    <select 
                        value={format} 
                        onChange={(e) => setFormat(e.target.value)}
                    >
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                    </select>
                </div>
                
                {format === 'jpeg' && (
                    <div className="control-group">
                        <label>Quality: {quality}%</label>
                        <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value))}
                        />
                    </div>
                )}
                
                <div className="control-group">
                    <label>Scale: {scale}%</label>
                    <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        value={scale}
                        onChange={(e) => setScale(parseInt(e.target.value))}
                    />
                </div>
                
                <div className="export-info">
                    <p>Resolution: {resolution.width}×{resolution.height}px</p>
                    <p>File Size: ~{fileSize} KB</p>
                </div>
            </div>
        </div>
    );
});

export default ExportContainer;

