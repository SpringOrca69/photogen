import React from 'react';
import './Sidebar.css';

function Sidebar({ onMenuItemClick, activeItem }) {
  const menuItems = [
    { name: 'Upload', icon: '📤' },
    { name: 'Crop & Resize', icon: '✂️' },
    { name: 'Background Remover', icon: '🎭' },
    { name: 'T-Shirt Editor', icon: '👕' },
    { name: 'Download photos in .jpeg, .png, etc.', icon: '💾' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        Photogen
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