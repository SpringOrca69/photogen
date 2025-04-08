import React, { useEffect } from 'react';
import './EmptyState.css';

const EmptyState = ({ images }) => {
  console.log("EmptyState function call with", images.length, "images");
  useEffect(() => {
    console.log(`EmptyState mounted/updated with ${images.length} images`);
  }, [images]);

  return (
    <div className="empty-state" style={{ backgroundColor: 'pink', padding: '20px', border: '2px dashed blue', display: 'block' }}>
      <h2 style={{ color: 'blue', fontSize: '26px' }}>No Images Uploaded</h2>
      <p style={{ color: 'darkred', fontSize: '18px' }}>Please upload images to access this feature.</p>
    </div>
  );
};

export default EmptyState;
