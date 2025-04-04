import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import CropResize from './components/CropResize';
import BackgroundRemover from './components/BackgroundRemover';
import './App.css';
import TShirtEditor from './components/TShirtEditor';
import Export from './components/Export';
import PhotoEnhancement from './components/PhotoEnhancement';
import PhotoStrip from './components/photostrip';
import './components/shared/CropDisplay'; // Make sure the shared component is imported

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
    setUndoStack(prevUndoStack => {
      if (prevUndoStack.length > 0) {
        const previousImages = prevUndoStack[prevUndoStack.length - 1];
        setRedoStack(prevRedoStack => [...prevRedoStack, images]);
        setImages(previousImages);
        sessionStorage.setItem('uploadedImages', JSON.stringify(previousImages));
        setRedoDisabled(false);
        if (prevUndoStack.length === 1) {
          setUndoDisabled(true);
        }
        return prevUndoStack.slice(0, -1);
      }
      return prevUndoStack;
    });
  };

  const handleRedo = () => {
    setRedoStack(prevRedoStack => {
      if (prevRedoStack.length > 0) {
        const nextImages = prevRedoStack[prevRedoStack.length - 1];
        setUndoStack(prevUndoStack => [...prevUndoStack, images]);
        setImages(nextImages);
        sessionStorage.setItem('uploadedImages', JSON.stringify(nextImages));
        setUndoDisabled(false);
        if (prevRedoStack.length === 1) {
          setRedoDisabled(true);
        }
        return prevRedoStack.slice(0, -1);
      }
      return prevRedoStack;
    });
  };

  const updateImages = (newImages) => {
    setUndoStack(prevUndoStack => [...prevUndoStack, images]);
    setImages(newImages);
    sessionStorage.setItem('uploadedImages', JSON.stringify(newImages));
    setRedoStack([]);
    setUndoDisabled(false);
    setRedoDisabled(true);
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case 'Upload':
        return <Upload onNext={handleMenuItemClick} updateImages={updateImages} />;
      case 'Crop & Resize':
        return <CropResize 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
        />;
      case 'Background Remover':
        return <BackgroundRemover 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
        />;
      case 'T-Shirt Editor':
        return <TShirtEditor 
          images={images} 
          setImages={updateImages} 
          currentImageIndex={currentImageIndex}
          setCurrentImageIndex={setCurrentImageIndex}
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
        />;
      default:
        return (
          <div className="welcome-content">
            <h1>Welcome to Photogen</h1>
            <p>Select an option from the sidebar to get started</p>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <Sidebar 
        onMenuItemClick={handleMenuItemClick} 
        activeItem={activeComponent} 
        handleUndo={handleUndo} 
        handleRedo={handleRedo} 
        undoDisabled={undoDisabled} 
        redoDisabled={redoDisabled} 
      />
      <div className="main-content">
        {renderComponent()}
      </div>
    </div>
  );
}

export default App;