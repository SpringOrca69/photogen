import React, { useState, useEffect, useRef, useCallback } from 'react';
import './photostrip.css';
import ImageGallery from './ImageGallery';
import CropDisplay from './shared/CropDisplay'; // Add this import

// Debug helper component to display image details
const ImageDebugger = ({ image, index, isSelected }) => {
    const imageSource = image.url || image.src;
    const style = {
        padding: '8px',
        margin: '4px 0',
        border: isSelected ? '2px solid blue' : '1px solid #ccc',
        borderRadius: '4px',
        background: imageSource ? '#efffef' : '#ffeeee'
    };

    return (
        <div style={style}>
            <strong>Image {index}</strong> {isSelected && '(Selected)'}
            <div style={{ fontSize: '11px' }}>
                <div><strong>Name:</strong> {image.name || '[unnamed]'}</div>
                <div><strong>Has source:</strong> {Boolean(imageSource).toString()}</div>
                {imageSource && (
                    <>
                        <div><strong>Source length:</strong> {imageSource.length}</div>
                        <div><strong>Type:</strong> {image.type || 'unknown'}</div>
                        <div>
                            <strong>Preview:</strong><br />
                            <img
                                src={imageSource}
                                alt="Debug preview"
                                style={{
                                    maxWidth: '50px',
                                    maxHeight: '50px',
                                    border: '1px solid #999'
                                }}
                                onError={(e) => {
                                    e.target.style.background = "#faa";
                                    e.target.alt = "Failed to load";
                                    console.error(`Image {index} failed to load in debug preview`);
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const PhotoStrip = ({ images, setImages, currentImageIndex, setCurrentImageIndex }) => {
    const [rows, setRows] = useState(2);
    const [cols, setColumns] = useState(3);
    const [spacing, setSpacing] = useState(10);
    const [photostripColor, setPhotostripColor] = useState('#FFFFFF');
    const [errorMessage, setErrorMessage] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [invalidImagesCount, setInvalidImagesCount] = useState(0);

    // Add refs for preview canvas and image
    const previewCanvasRef = useRef(null);
    const previewImageRef = useRef(null);

    // Helper function to get image source consistently
    const getImageSource = (image) => {
        return image ? (image.url || image.src) : null;
    };

    // Improved validation in useEffect
    useEffect(() => {
        if (images.length === 0) return;
        setErrorMessage('');

        // Validate image index
        if (currentImageIndex < 0 || currentImageIndex >= images.length) {
            setCurrentImageIndex(0);
            return;
        }

        // Validate image object and its source
        const currentImg = images[currentImageIndex];
        const imageSource = getImageSource(currentImg);

        if (!currentImg) {
            setErrorMessage('Selected image is undefined');
        } else if (!imageSource) {
            setErrorMessage('Image source is missing');

            // Try to find a valid image to use instead
            const validImageIndex = images.findIndex(img => getImageSource(img));
            if (validImageIndex >= 0 && validImageIndex !== currentImageIndex) {
                setCurrentImageIndex(validImageIndex);
            }
        }
    }, [currentImageIndex, images, setCurrentImageIndex]);

    // Function to draw preview with useCallback to ensure proper dependency handling
    const updatePreview = useCallback(() => {
        if (!previewCanvasRef.current || !previewImageRef.current ||
            !previewImageRef.current.complete || !previewImageRef.current.naturalWidth) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');

        // Calculate dimensions
        const img = previewImageRef.current;
        const currentImage = images[currentImageIndex];
        
        // Handle crop data if present
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.naturalWidth;
        let sourceHeight = img.naturalHeight;
        
        if (currentImage.cropData) {
            sourceX = currentImage.cropData.x;
            sourceY = currentImage.cropData.y;
            sourceWidth = currentImage.cropData.width;
            sourceHeight = currentImage.cropData.height;
        }
        
        // Calculate aspect ratio of the source (cropped or original)
        const aspectRatio = sourceWidth / sourceHeight;

        // Define size for preview photos based on aspect ratio
        const maxPhotoWidth = 100;
        const photoWidth = maxPhotoWidth;
        const photoHeight = photoWidth / aspectRatio; // Maintain aspect ratio

        // Calculate total width and height with spacing
        const totalWidth = cols * photoWidth + (cols - 1) * spacing;
        const totalHeight = rows * photoHeight + (rows - 1) * spacing;

        // Adjust canvas size if needed - this clears the canvas
        canvas.width = Math.max(300, totalWidth);
        canvas.height = Math.max(200, totalHeight);

        // After resizing canvas (which clears it), redraw background
        ctx.fillStyle = photostripColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center the strip in the canvas
        const startX = (canvas.width - totalWidth) / 2;
        const startY = (canvas.height - totalHeight) / 2;

        // Draw the passport photos in a grid
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * (photoWidth + spacing);
                const y = startY + r * (photoHeight + spacing);
                
                // Draw the image with crop applied if present
                ctx.drawImage(
                    img, 
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    x, y, photoWidth, photoHeight
                );
            }
        }
    }, [rows, cols, spacing, photostripColor, images, currentImageIndex]);

    // Set up the preview image
    useEffect(() => {
        if (!images.length || currentImageIndex < 0 || !previewCanvasRef.current) return;

        const currentImage = images[currentImageIndex];
        const currentImageSource = getImageSource(currentImage);

        if (!currentImageSource) return;

        if (!previewImageRef.current) {
            previewImageRef.current = new Image();
        }

        previewImageRef.current.onload = updatePreview;
        previewImageRef.current.crossOrigin = "anonymous";
        previewImageRef.current.src = currentImageSource;

    }, [images, currentImageIndex, updatePreview]);

    // Update preview when parameters change
    useEffect(() => {
        updatePreview();
    }, [updatePreview]);

    // Handle removing invalid images
    const handleRemoveInvalidImages = () => {
        const validImages = images.filter(img => getImageSource(img));
        if (validImages.length < images.length) {
            setInvalidImagesCount(images.length - validImages.length);
            setShowConfirmDialog(true);
        } else {
            alert("No invalid images found to remove.");
        }
    };

    // Confirmation handler
    const confirmRemoveInvalidImages = () => {
        const validImages = images.filter(img => getImageSource(img));
        setImages(validImages);
        setCurrentImageIndex(Math.min(currentImageIndex, validImages.length - 1));
        setShowConfirmDialog(false);
    };

    // Early return for empty images array
    if (images.length === 0) {
        return (
            <div className="passport-strip-container empty-state">
                <h2>No Images Available</h2>
                <p>Please upload an image first to create passport strips.</p>
            </div>
        );
    }

    const currentImage = images[currentImageIndex];
    const currentImageSource = getImageSource(currentImage);

    const handleCreate = () => {
        // Validate image before proceeding
        if (!currentImage || !currentImageSource) {
            setErrorMessage("Cannot create passport strip: Selected image has no valid source data");
            return;
        }

        const canvas = document.createElement('canvas');
        const img = new Image();

        img.onload = () => {
            // Get source dimensions for drawing (apply crop if present)
            let sourceX = 0;
            let sourceY = 0;
            let sourceWidth = img.width;
            let sourceHeight = img.height;
            
            if (currentImage.cropData) {
                sourceX = currentImage.cropData.x;
                sourceY = currentImage.cropData.y;
                sourceWidth = currentImage.cropData.width;
                sourceHeight = currentImage.cropData.height;
            }
            
            // Calculate aspect ratio
            const aspectRatio = sourceWidth / sourceHeight;

            // Standard size for each photo, but maintain the cropped aspect ratio
            const basePhotoHeight = 531; // Standard passport photo height in pixels (45mm at 300dpi)
            const photoWidth = Math.round(basePhotoHeight * aspectRatio);
            const photoHeight = basePhotoHeight;

            // Set canvas size based on rows, columns and spacing
            const totalWidth = cols * photoWidth + (cols - 1) * spacing;
            const totalHeight = rows * photoHeight + (rows - 1) * spacing;

            canvas.width = totalWidth;
            canvas.height = totalHeight;

            const ctx = canvas.getContext('2d');

            // Fill background
            ctx.fillStyle = photostripColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the passport photos in a grid
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const x = c * (photoWidth + spacing);
                    const y = r * (photoHeight + spacing);

                    // Always use drawImage with 9 parameters to properly handle crop
                    ctx.drawImage(
                        img,
                        sourceX, sourceY, sourceWidth, sourceHeight,
                        x, y, photoWidth, photoHeight
                    );
                }
            }

            // Convert canvas to image data and update the images array
            try {
                const newImageUrl = canvas.toDataURL('image/jpeg');

                const newImage = {
                    url: newImageUrl,
                    name: `${currentImage.name || 'image'}-passport-strip.jpg`,
                    type: 'image/jpeg',
                    // Don't copy crop data to the strip image
                    originalWidth: totalWidth,
                    originalHeight: totalHeight
                };

                const newImages = [...images, newImage];
                setImages(newImages);
                setCurrentImageIndex(newImages.length - 1);
                setErrorMessage(''); // Clear any errors on success
            } catch (err) {
                setErrorMessage("Failed to create passport strip: " + err.message);
            }
        };

        // Add error handling for image loading
        img.onerror = () => {
            setErrorMessage("Error: Failed to load the selected image. Please try again or select a different image.");
        };

        try {
            img.crossOrigin = "anonymous";
            img.src = currentImageSource;
        } catch (err) {
            setErrorMessage("Failed to load the selected image: " + err.message);
        }
    };

    const handleThumbnailClick = (index) => {
        setCurrentImageIndex(index);
    };

    const handleDeleteImage = (index) => {
        const updatedImages = images.filter((_, i) => i !== index);
        setImages(updatedImages);

        // Adjust currentImageIndex if the deleted image was selected or if we need to prevent index out of bounds
        if (index === currentImageIndex || currentImageIndex >= updatedImages.length) {
            setCurrentImageIndex(Math.max(0, updatedImages.length - 1));
        } else if (index < currentImageIndex) {
            // If we deleted an image before the selected one, decrement the currentImageIndex
            setCurrentImageIndex(currentImageIndex - 1);
        }
    };

    // Add a function to render the current image with crop applied
    const renderCurrentImage = () => {
        const image = images[currentImageIndex];
        
        if (!image) {
            return <div className="no-image-placeholder">No image selected</div>;
        }
        
        return (
            <CropDisplay 
                image={image}
                className="current-image"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
        );
    };

    return (
        <div className="passport-strip-container">
            <h2>Create Passport Photo Strip</h2>

            {/* Confirmation dialog */}
            {showConfirmDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '400px'
                    }}>
                        <h3>Confirm Removal</h3>
                        <p>Remove {invalidImagesCount} invalid images from the list?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                style={{ marginRight: '10px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoveInvalidImages}
                                style={{ backgroundColor: '#d33', color: 'white' }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {errorMessage && (
                <div style={{
                    padding: '10px',
                    margin: '10px 0',
                    backgroundColor: '#ffeeee',
                    border: '1px solid #ff6666',
                    borderRadius: '4px'
                }}>
                    <strong>Error:</strong> {errorMessage}
                </div>
            )}

            <div className="passport-controls">
                <div className="control-group">
                    <label>Rows:</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                </div>

                <div className="control-group">
                    <label>Columns:</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={cols}
                        onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                </div>

                <div className="control-group">
                    <label>Spacing (px):</label>
                    <input
                        type="number"
                        min="0"
                        max="50"
                        value={spacing}
                        onChange={(e) => setSpacing(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                </div>

                <div className="control-group">
                    <label>Photostrip Color:</label>
                    <input
                        type="color"
                        value={photostripColor}
                        onChange={(e) => {
                            const newColor = e.target.value;
                            setPhotostripColor(newColor);
                            // Force immediate preview update on next tick
                            setTimeout(updatePreview, 0);
                        }}
                    />
                </div>
            </div>

            <div className="preview">
                <h3>Real-time Preview</h3>
                <div className="preview-container" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <canvas
                        ref={previewCanvasRef}
                        width={400}
                        height={300}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: '#f8f8f8',
                            maxWidth: '100%'
                        }}
                    />
                    <p style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
                        This preview updates as you change the parameters
                    </p>
                </div>
            </div>

            <div className="current-image-display">
                <h3>Selected Image Preview</h3>
                <div className="current-image-container">
                    {renderCurrentImage()}
                </div>
            </div>

            <button
                className="create-button"
                onClick={handleCreate}
                disabled={!currentImage || !currentImageSource}
            >
                Create Passport Strip
            </button>

            <div className="image-gallery-container">
                <ImageGallery
                    images={images}
                    currentImageIndex={currentImageIndex}
                    handleThumbnailClick={handleThumbnailClick}
                    handleDeleteImage={handleDeleteImage}
                    isEditMode={false}
                />
            </div>
        </div>
    );
};

export default PhotoStrip;