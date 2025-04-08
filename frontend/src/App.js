import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import CropResize from './components/CropResize';
import BackgroundRemover from './components/BackgroundRemover';
import './App.css';
import Export from './components/Export';
import PhotoEnhancement from './components/PhotoEnhancement';
import PhotoStrip from './components/photostrip';
import WelcomeCards from './components/WelcomeCards';
import ImageGallery from './components/ImageGallery';

function App() {
  const [activeComponent, setActiveComponent] = useState('Welcome');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [images, setImages] = useState(() => {
    const savedImages = sessionStorage.getItem('uploadedImages');
    return savedImages ? JSON.parse(savedImages) : [];
  });
  const [undoDisabled, setUndoDisabled] = useState(true);
  const [redoDisabled, setRedoDisabled] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleMenuItemClick = (item) => {
    setActiveComponent(item);
  };

  const handleUndo = () => {
    // Only allow undo for the current image
    if (images[currentImageIndex]?.editHistory?.length > 0) {
      const currentImage = images[currentImageIndex];
      const previousState = currentImage.editHistory[currentImage.editHistory.length - 1];
      
      // Save current state to redo stack
      const currentState = { ...currentImage };
      delete currentState.editHistory; // Don't include history in the saved state
      
      // Update the image with the previous state
      const updatedImages = [...images];
      updatedImages[currentImageIndex] = {
        ...previousState,
        editHistory: currentImage.editHistory.slice(0, -1) // Remove the state we just restored
      };
      
      // Add current state to redo stack for this image
      if (!updatedImages[currentImageIndex].redoHistory) {
        updatedImages[currentImageIndex].redoHistory = [];
      }
      updatedImages[currentImageIndex].redoHistory.push(currentState);
      
      // Update state
      setImages(updatedImages);
      sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
      
      // Update undo/redo buttons state
      setUndoDisabled(updatedImages[currentImageIndex].editHistory.length === 0);
      setRedoDisabled(false);
    }
  };

  const handleRedo = () => {
    // Only allow redo for the current image
    if (images[currentImageIndex]?.redoHistory?.length > 0) {
      const currentImage = images[currentImageIndex];
      const nextState = currentImage.redoHistory[currentImage.redoHistory.length - 1];
      
      // Save current state to undo stack
      const currentState = { ...currentImage };
      delete currentState.redoHistory; // Don't include redo history in the saved state
      
      // Update the image with the next state
      const updatedImages = [...images];
      
      // Ensure edit history exists
      if (!currentImage.editHistory) {
        currentImage.editHistory = [];
      }
      
      updatedImages[currentImageIndex] = {
        ...nextState,
        editHistory: [...currentImage.editHistory, currentState],
        redoHistory: currentImage.redoHistory.slice(0, -1) // Remove the state we just restored
      };
      
      // Update state
      setImages(updatedImages);
      sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
      
      // Update undo/redo buttons state
      setUndoDisabled(false);
      setRedoDisabled(updatedImages[currentImageIndex].redoHistory.length === 0);
    }
  };

  const updateImages = (newImages) => {
    // When updating images, save the current state to the edit history of the current image
    if (images.length > 0 && currentImageIndex < images.length) {
      const currentImage = images[currentImageIndex];
      
      // Create a copy of the current image without history
      const currentState = { ...currentImage };
      delete currentState.editHistory;
      delete currentState.redoHistory;
      
      // Add to edit history
      if (!currentImage.editHistory) {
        currentImage.editHistory = [];
      }
      
      // Update the image with history
      const updatedImages = [...newImages];
      if (updatedImages[currentImageIndex]) {
        if (!updatedImages[currentImageIndex].editHistory) {
          updatedImages[currentImageIndex].editHistory = [...(currentImage.editHistory || []), currentState];
        } else {
          updatedImages[currentImageIndex].editHistory.push(currentState);
        }
        
        // Clear redo history when making a new edit
        updatedImages[currentImageIndex].redoHistory = [];
      }
      
      setImages(updatedImages);
      sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
      
      // Update undo/redo buttons state
      setUndoDisabled(false);
      setRedoDisabled(true);
    } else {
      // If no current image, just update the images
      setImages(newImages);
      sessionStorage.setItem('uploadedImages', JSON.stringify(newImages));
    }
  };

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index);
  };

  const handleDeleteImage = (index) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    sessionStorage.setItem('uploadedImages', JSON.stringify(updatedImages));
    
    // Adjust currentImageIndex if needed
    if (index === currentImageIndex) {
      setCurrentImageIndex(Math.max(0, index - 1));
    } else if (index < currentImageIndex) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const renderWelcomePage = () => {
    return (
      <div className="welcome-page">
        <h1 style={{ fontSize: '3em', textAlign: 'center'}}>Welcome to Photogen</h1>
        <WelcomeCards />
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="get-started-btn" onClick={() => handleMenuItemClick('Upload')}>Get Started</button>
        </div>
      </div>
    );
  };

  const renderEditorPage = () => {
    return (
      <div className="editor-page">
        <Sidebar 
          onMenuItemClick={handleMenuItemClick} 
          activeItem={activeComponent} 
          handleUndo={handleUndo} 
          handleRedo={handleRedo} 
          undoDisabled={undoDisabled || !images[currentImageIndex]?.editHistory?.length} 
          redoDisabled={redoDisabled || !images[currentImageIndex]?.redoHistory?.length}
          imagesExist={images.length > 0}
        />
        
        <div className="editor-content">
          {renderComponent()}
        </div>
        
        {images.length > 0 && activeComponent !== 'Download photos in .jpeg, .png, etc.' && (
          <div className="image-gallery-fixed">
            <ImageGallery 
              images={images} 
              currentImageIndex={currentImageIndex} 
              handleThumbnailClick={handleThumbnailClick}
              handleDeleteImage={handleDeleteImage}
              isExportMode={false}
            />
          </div>
        )}
      </div>
    );
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case 'Upload':
        return <Upload onNext={handleMenuItemClick} updateImages={updateImages} setCurrentImageIndex={setCurrentImageIndex} />;
      case 'Crop & Resize':
        return <CropResize 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
          onNext={() => handleMenuItemClick('Background Remover')}
        />;
      case 'Background Remover':
        return <BackgroundRemover 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
          onNext={() => handleMenuItemClick('Photo Enhancement')}
          onBack={() => handleMenuItemClick('Crop & Resize')}
        />;
      case 'Photo Enhancement':
        return <PhotoEnhancement 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
        />;
      case 'Make Photo Strip':
        return <PhotoStrip 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
        />;
      case 'Download photos in .jpeg, .png, etc.':
        return <Export 
          images={images} 
          currentImageIndex={currentImageIndex}
          handleThumbnailClick={handleThumbnailClick}
          handleDeleteImage={handleDeleteImage}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="App">
      {activeComponent === 'Welcome' ? renderWelcomePage() : renderEditorPage()}
    </div>
  );
}

export default App;
