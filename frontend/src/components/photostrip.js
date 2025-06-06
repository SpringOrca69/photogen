import React, { useState, useEffect, useRef, useCallback } from 'react';
import './photostrip.css';

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
        const aspectRatio = img.naturalWidth / img.naturalHeight;

        // Define size for preview photos (scaled down versions)
        const maxPhotoWidth = 100;
        const maxPhotoHeight = maxPhotoWidth / aspectRatio;

        // Calculate total width and height with spacing
        const totalWidth = cols * maxPhotoWidth + (cols - 1) * spacing;
        const totalHeight = rows * maxPhotoHeight + (rows - 1) * spacing;

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
                const x = startX + c * (maxPhotoWidth + spacing);
                const y = startY + r * (maxPhotoHeight + spacing);
                ctx.drawImage(img, x, y, maxPhotoWidth, maxPhotoHeight);
            }
        }
    }, [rows, cols, spacing, photostripColor]);

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
            // Calculate dimensions for each photo in the strip
            const photoWidth = 413; // Standard passport photo width in pixels (35mm at 300dpi)
            const photoHeight = 531; // Standard passport photo height in pixels (45mm at 300dpi)

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

                    ctx.drawImage(img, x, y, photoWidth, photoHeight);
                }
            }

            // Convert canvas to image data and update the images array
            try {
                const newImageUrl = canvas.toDataURL('image/jpeg');

                const newImage = {
                    url: newImageUrl, // Use url instead of src to be consistent
                    name: `${currentImage.name || 'image'}-passport-strip.jpg`,
                    type: 'image/jpeg'
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
                                className="btn btn-secondary"
                                style={{ marginRight: '10px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRemoveInvalidImages}
                                className="btn btn-primary"
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

            <button
                className="btn btn-primary create-button"
                onClick={handleCreate}
                disabled={!currentImage || !currentImageSource}
            >
                Create Passport Strip
            </button>
        </div>
    );
};

export default PhotoStrip;
