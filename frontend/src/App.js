import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Upload from './components/Upload';
import CropResize from './components/CropResize';
import BackgroundRemover from './components/BackgroundRemover';
import './App.css';
import TShirtEditor from './components/TShirtEditor';

function App() {
  const [activeComponent, setActiveComponent] = useState('Welcome');

  const handleMenuItemClick = (item) => {
    setActiveComponent(item);
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case 'Upload':
        return <Upload onNext={handleMenuItemClick} />;
      case 'Crop & Resize':
        return <CropResize />;
      case 'Background Remover':
        return <BackgroundRemover />;
      case 'T-Shirt Editor':
        return <TShirtEditor />;
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
      />
      <div className="main-content">
        {renderComponent()}
      </div>
    </div>
  );
}

export default App;