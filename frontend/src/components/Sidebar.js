import React from 'react';
import './Sidebar.css';
import logo from '../assets/logo.png';

function Sidebar({ onMenuItemClick, activeItem, handleUndo, handleRedo, undoDisabled, redoDisabled, imagesExist }) {
  const menuItems = [
    { name: 'Upload', icon: '📤', disabled: false },
    { name: 'Crop & Resize', icon: '✂️', disabled: !imagesExist },
    { name: 'Background Remover', icon: '🎭', disabled: !imagesExist },
    { name: 'Photo Enhancement', icon: '✏️', disabled: !imagesExist },
    { name: 'Make Photo Strip', icon: '🖼️', disabled: !imagesExist },
    { name: 'Download photos in .jpeg, .png, etc.', icon: '💾', disabled: !imagesExist }
  ];

  const handleItemClick = (item) => {
    if (!item.disabled) {
      onMenuItemClick(item.name);
    }
  };

  return (
    <div className="sidebar-floating">
      <div className="sidebar-logo">
      <img className="sidebar-logo" src={logo} alt="Logo" />
      </div>
      <div className="sidebar-undo-redo">
        <div 
          className={`sidebar-icon ${undoDisabled ? 'disabled' : ''}`} 
          onClick={!undoDisabled ? handleUndo : null}
          title="Undo"
        >
          <span className="sidebar-item-icon">↩️</span>
        </div>
        <div 
          className={`sidebar-icon ${redoDisabled ? 'disabled' : ''}`} 
          onClick={!redoDisabled ? handleRedo : null}
          title="Redo"
        >
          <span className="sidebar-item-icon">↪️</span>
        </div>
      </div>
      <div className="sidebar-menu">
        {menuItems.map((item, index) => (
          <div 
            key={index} 
            className={`sidebar-icon ${activeItem === item.name ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => handleItemClick(item)}
            title={item.name}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;
