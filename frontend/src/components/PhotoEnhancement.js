// PhotoEnhancement.js
import React, { useState, useEffect } from 'react';
import './PhotoEnhancement.css';

function PhotoEnhancement({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
  // Current slider values
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [skinSmooth, setSkinSmooth] = useState(0);
  const [exposure, setExposure] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  
  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [enhancedUrl, setEnhancedUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize the preview when the component mounts or when the current image changes
  useEffect(() => {
    if (images && images.length > 0 && images[currentImageIndex]) {
      applyEnhancements();
    }
  }, [currentImageIndex, images]);

  const applyEnhancements = () => {
    if (!images || !images[currentImageIndex]) {
      setErrorMessage('No image selected');
      return;
    }
    
    setErrorMessage('');
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const originalUrl = images[currentImageIndex]?.originalUrl || images[currentImageIndex]?.url;
    
    if (!originalUrl) {
      setErrorMessage('Image source not found');
      return;
    }
    
    img.crossOrigin = 'Anonymous';
    
    // Add error handling for image loading
    img.onerror = () => {
      setErrorMessage('Failed to load image');
      console.error('Error loading image:', originalUrl);
    };

    img.onload = () => {
      // Set canvas dimensions based on the loaded image
      canvas.width = img.width;
      canvas.height = img.height;

      // Step 1: Apply base filters
      ctx.filter = `
        brightness(${brightness}%)
        contrast(${contrast}%)
        saturate(${saturation}%)
        brightness(${exposure}%)
      `;
      ctx.drawImage(img, 0, 0);

      // Step 2: Apply skin smoothing if needed
      if (skinSmooth > 0) {
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const smoothed = applySkinSmoothing(imageData, skinSmooth);
          ctx.putImageData(smoothed, 0, 0);
        } catch (err) {
          console.error('Error applying skin smoothing:', err);
        }
      }

      // Step 3: Apply sharpness
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const sharpened = applySharpen(imageData, sharpness);
        ctx.putImageData(sharpened, 0, 0);
      } catch (err) {
        console.error('Error applying sharpness:', err);
      }

      // Convert canvas to data URL and update state
      try {
        const dataUrl = canvas.toDataURL('image/jpeg');
        setEnhancedUrl(dataUrl);
        console.log('Enhanced URL updated:', dataUrl.substring(0, 50) + '...');
      } catch (err) {
        setErrorMessage('Failed to process image');
        console.error('Error creating data URL:', err);
      }
    };

    // Set the image source to trigger loading
    img.src = originalUrl;
  };

  // Load saved settings when image changes
  useEffect(() => {
    if (images && images.length > 0 && images[currentImageIndex]) {
      const { enhancementSettings } = images[currentImageIndex] || {};
      setBrightness(enhancementSettings?.brightness ?? 100);
      setContrast(enhancementSettings?.contrast ?? 100);
      setSkinSmooth(enhancementSettings?.skinSmooth ?? 0);
      setExposure(enhancementSettings?.exposure ?? 100);
      setSaturation(enhancementSettings?.saturation ?? 100);
      setSharpness(enhancementSettings?.sharpness ?? 0);
      setHasUnsavedChanges(false);
    }
  }, [currentImageIndex, images]);

  // Apply enhancements when sliders change, but don't save to image state
  useEffect(() => {
    if (images && images.length > 0 && images[currentImageIndex]) {
      applyEnhancements();
      setHasUnsavedChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightness, contrast, skinSmooth, exposure, saturation, sharpness]);

  const saveEnhancements = () => {
    if (!enhancedUrl) {
      setErrorMessage('No enhanced image to save');
      return;
    }
    
    setSaveStatus('saving');
    
    // Create a new array with the updated image
    const updatedImages = images.map((img, index) =>
      index === currentImageIndex
        ? {
            ...img,
            url: enhancedUrl,
            originalUrl: img.originalUrl || img.url,
            enhancementSettings: {
              brightness,
              contrast,
              skinSmooth,
              exposure,
              saturation,
              sharpness,
            },
          }
        : img
    );
    
    // Use the updateImages function from App.js which handles undo/redo history
    setImages(updatedImages);
    setHasUnsavedChanges(false);
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 1000);
  };
  
  const resetEnhancements = () => {
    // Reset to default values
    setBrightness(100);
    setContrast(100);
    setSkinSmooth(0);
    setExposure(100);
    setSaturation(100);
    setSharpness(0);
    
    // This will trigger the useEffect to apply these default values
    // We'll set hasUnsavedChanges to true so the user knows they need to save
    setHasUnsavedChanges(true);
  };

  // Check if we have images to work with
  const hasImages = images && images.length > 0;
  const currentImage = hasImages ? images[currentImageIndex] : null;

  return (
    <div className="photo-enhancement-wrapper">
      <div className="photo-enhancement-container">
        <div className="tools-section">
          <h3>Enhancement Tools</h3>
          
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}

          <label>Brightness: {brightness}%</label>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={brightness} 
            onChange={(e) => setBrightness(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <label>Contrast: {contrast}%</label>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={contrast} 
            onChange={(e) => setContrast(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <label>Exposure: {exposure}%</label>
          <input 
            type="range" 
            min="50" 
            max="150" 
            value={exposure} 
            onChange={(e) => setExposure(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <label>Saturation: {saturation}%</label>
          <input 
            type="range" 
            min="0" 
            max="300" 
            value={saturation} 
            onChange={(e) => setSaturation(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <label>Skin Smoothness: {skinSmooth}</label>
          <input 
            type="range" 
            min="0" 
            max="10" 
            step="1" 
            value={skinSmooth} 
            onChange={(e) => setSkinSmooth(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <label>Sharpness: {sharpness}</label>
          <input 
            type="range" 
            min="0" 
            max="5" 
            step="0.1" 
            value={sharpness} 
            onChange={(e) => setSharpness(Number(e.target.value))} 
            disabled={!hasImages}
          />

          <div className="enhancement-buttons">
            <button 
              onClick={saveEnhancements} 
              className={`btn btn-primary ${hasUnsavedChanges ? 'has-changes' : ''}`}
              disabled={!enhancedUrl || !hasImages}
            >
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Enhancements'}
            </button>
            
            <button 
              onClick={resetEnhancements} 
              className="btn btn-secondary"
              disabled={!hasImages}
            >
              Reset Enhancements
            </button>
          </div>
        </div>

        <div className="image-preview-section">
          <h3>Enhanced Preview</h3>
          {!hasImages ? (
            <div className="no-image-message">No image selected</div>
          ) : enhancedUrl ? (
            <img
              src={enhancedUrl}
              alt="Enhanced Preview"
              onMouseEnter={(e) => {
                if (currentImage && (currentImage.originalUrl || currentImage.url)) {
                  e.currentTarget.src = currentImage.originalUrl || currentImage.url;
                }
              }}
              onMouseLeave={(e) => {
                if (enhancedUrl) {
                  e.currentTarget.src = enhancedUrl;
                }
              }}
            />
          ) : currentImage ? (
            <img
              src={currentImage.url}
              alt="Original Preview"
            />
          ) : (
            <div className="no-image-message">Processing image...</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoEnhancement;

// ---------------------- UTILS -----------------------

function applySharpen(imageData, amount = 1) {
  if (amount === 0) return imageData;

  const scaled = amount * 0.3;
  const weights = [
    0, -1, 0,
    -1, 4 + scaled * 2, -1,
    0, -1, 0
  ];

  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const getIndex = (x, y) => (y * width + x) * 4;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let newValue = 0;
        let weightIndex = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const pixelIndex = getIndex(x + dx, y + dy) + c;
            newValue += data[pixelIndex] * weights[weightIndex++];
          }
        }
        output.data[getIndex(x, y) + c] = Math.min(255, Math.max(0, newValue));
      }
      output.data[getIndex(x, y) + 3] = data[getIndex(x, y) + 3];
    }
  }

  return output;
}

function applySkinSmoothing(imageData, strength = 3) {
  const { width, height, data } = imageData;
  const blurred = blurImageData(imageData, width, height, strength);
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const maskStrength = skinMask(rgbToLab(r, g, b)); // value between 0–1

    if (maskStrength > 0) {
      result[i] = lerp(r, blurred[i], maskStrength);
      result[i + 1] = lerp(g, blurred[i + 1], maskStrength);
      result[i + 2] = lerp(b, blurred[i + 2], maskStrength);
    } else {
      result[i] = r;
      result[i + 1] = g;
      result[i + 2] = b;
    }

    result[i + 3] = data[i + 3];
  }

  return new ImageData(result, width, height);
}

function blurImageData(imageData, width, height, radius) {
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);
  const w4 = width * 4;
  const kernel = [];

  for (let i = -radius; i <= radius; i++) kernel.push(1);
  const kSize = kernel.length;
  const half = Math.floor(kSize / 2);

  // Horizontal blur
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -half; k <= half; k++) {
        const ix = Math.min(width - 1, Math.max(0, x + k));
        const idx = (y * width + ix) * 4;
        r += src[idx];
        g += src[idx + 1];
        b += src[idx + 2];
      }
      const idx = (y * width + x) * 4;
      out[idx] = r / kSize;
      out[idx + 1] = g / kSize;
      out[idx + 2] = b / kSize;
      out[idx + 3] = src[idx + 3];
    }
  }

  // Vertical blur
  const final = new Uint8ClampedArray(out.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = -half; k <= half; k++) {
        const iy = Math.min(height - 1, Math.max(0, y + k));
        const idx = (iy * width + x) * 4;
        r += out[idx];
        g += out[idx + 1];
        b += out[idx + 2];
      }
      const idx = (y * width + x) * 4;
      final[idx] = r / kSize;
      final[idx + 1] = g / kSize;
      final[idx + 2] = b / kSize;
      final[idx + 3] = out[idx + 3];
    }
  }

  return final;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ---- Color Conversions ----

function rgbToLab(r, g, b) {
  // Convert sRGB to linear RGB
  let [lr, lg, lb] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // Linear RGB to XYZ
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / 1.00000;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;

  // XYZ to Lab
  const f = v => v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + 16 / 116;
  const fx = f(x), fy = f(y), fz = f(z);

  const L = (116 * fy) - 16;
  const A = 500 * (fx - fy);
  const B = 200 * (fy - fz);

  return [L, A, B];
}

function skinMask([L, A, B]) {
  if (L < 30 || L > 90) return 0;    // skip very dark/light areas
  if (A < 8 || A > 26) return 0;     // exclude dull red/brown
  if (B < 5 || B > 26) return 0;     // reduce tolerance for orange/brown

  return 1;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
