import React from 'react';
import './Sidebar.css';

function Sidebar({ onMenuItemClick, activeItem, handleUndo, handleRedo, undoDisabled, redoDisabled, setUndoDisabled, setRedoDisabled }) {
  const menuItems = [
    { name: 'Upload', icon: '📤' },
    { name: 'Crop & Resize', icon: '✂️' },
    { name: 'Background Remover', icon: '🎭' },
    { name: 'T-Shirt Editor', icon: '👕' },
    { name: 'Photo Enhancement', icon: '✏️' },
    { name: 'Download photos in .jpeg, .png, etc.', icon: '💾' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Photogen
      </div>
      <div className="sidebar-undo-redo" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div 
          className={`sidebar-item ${undoDisabled ? 'disabled' : ''}`} 
          onClick={!undoDisabled ? handleUndo : null}
        >
          <span className="sidebar-item-icon">↩️</span>
        </div>
        <div 
          className={`sidebar-item ${redoDisabled ? 'disabled' : ''}`} 
          onClick={!redoDisabled ? handleRedo : null}
        >
          <span className="sidebar-item-icon">↪️</span>
        </div>
      </div>
      {menuItems.map((item, index) => (
        <div 
          key={index} 
          className={`sidebar-item ${activeItem === item.name ? 'active' : ''}`}
          onClick={() => onMenuItemClick(item.name)}
        >
          <span className="sidebar-item-icon">{item.icon}</span>
          {item.name}
        </div>
      ))}
    </div>
  );
}

export default Sidebar;