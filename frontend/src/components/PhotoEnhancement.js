// PhotoEnhancement.js
import React, { useState, useEffect } from 'react';
import './PhotoEnhancement.css';
import ImageGallery from './ImageGallery';

function PhotoEnhancement({ images, setImages, currentImageIndex, setCurrentImageIndex }) {
const [brightness, setBrightness] = useState(100);
const [contrast, setContrast] = useState(100);
const [skinSmooth, setSkinSmooth] = useState(0);
const [exposure, setExposure] = useState(100);
const [saturation, setSaturation] = useState(100);
const [sharpness, setSharpness] = useState(0);
const [enhancedUrl, setEnhancedUrl] = useState('');
const [saveStatus, setSaveStatus] = useState('idle');

const updateCurrentImageSettings = () => {
    const updatedImages = [...images];
    updatedImages[currentImageIndex] = {
    ...updatedImages[currentImageIndex],
    enhancementSettings: {
        brightness,
        contrast,
        skinSmooth,
        exposure,
        saturation,
        sharpness,
    },
    };
    setImages(updatedImages);
    sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
};

const applyEnhancements = () => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const originalUrl = images[currentImageIndex]?.originalUrl || images[currentImageIndex]?.url;
    img.crossOrigin = 'Anonymous';
    img.src = originalUrl;

    img.onload = () => {
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
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const smoothed = applySkinSmoothing(imageData, skinSmooth);
        ctx.putImageData(smoothed, 0, 0);
    }

    // Step 3: Apply sharpness
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpened = applySharpen(imageData, sharpness);
    ctx.putImageData(sharpened, 0, 0);

    setEnhancedUrl(canvas.toDataURL());
    };
};

useEffect(() => {
    if (images[currentImageIndex]) {
    const { enhancementSettings } = images[currentImageIndex];
    setBrightness(enhancementSettings?.brightness ?? 100);
    setContrast(enhancementSettings?.contrast ?? 100);
    setSkinSmooth(enhancementSettings?.skinSmooth ?? 0);
    setExposure(enhancementSettings?.exposure ?? 100);
    setSaturation(enhancementSettings?.saturation ?? 100);
    setSharpness(enhancementSettings?.sharpness ?? 0);
    }
}, [currentImageIndex]);

useEffect(() => {
    if (images[currentImageIndex]) {
    applyEnhancements();
    updateCurrentImageSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [brightness, contrast, skinSmooth, exposure, saturation, sharpness]);

const saveEnhancements = () => {
    setSaveStatus('saving');
    const updatedImages = images.map((img, index) =>
    index === currentImageIndex
        ? {
            ...img,
            url: enhancedUrl,
            originalUrl: img.originalUrl || img.url,
        }
        : img
    );
    setImages(updatedImages);
    sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
    setTimeout(() => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
    }, 1000);
};

return (
    <div className="photo-enhancement-wrapper">
    <div className="photo-enhancement-container">
        <div className="tools-section">
        <h3>Enhancement Tools</h3>

        <label>Brightness: {brightness}%</label>
        <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />

        <label>Contrast: {contrast}%</label>
        <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />

        <label>Exposure: {exposure}%</label>
        <input type="range" min="50" max="150" value={exposure} onChange={(e) => setExposure(Number(e.target.value))} />

        <label>Saturation: {saturation}%</label>
        <input type="range" min="0" max="300" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} />

        <label>Skin Smoothness: {skinSmooth}</label>
        <input type="range" min="0" max="10" step="1" value={skinSmooth} onChange={(e) => setSkinSmooth(Number(e.target.value))} />

        <label>Sharpness: {sharpness}</label>
        <input type="range" min="0" max="5" step="0.1" value={sharpness} onChange={(e) => setSharpness(Number(e.target.value))} />

        <button onClick={saveEnhancements}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Enhancements'}
        </button>
        </div>

        <div className="image-preview-section">
        <h3>Enhanced Preview</h3>
        {enhancedUrl && (
            <img
            src={enhancedUrl}
            alt="Enhanced Preview"
            onMouseEnter={(e) => (e.currentTarget.src = images[currentImageIndex].originalUrl || images[currentImageIndex].url)}
            onMouseLeave={(e) => (e.currentTarget.src = enhancedUrl)}
            />
        )}
        </div>
    </div>

    <div className="image-gallery-container">
        <ImageGallery
        images={images}
        currentImageIndex={currentImageIndex}
        handleThumbnailClick={(index) => setCurrentImageIndex(index)}
        />
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





