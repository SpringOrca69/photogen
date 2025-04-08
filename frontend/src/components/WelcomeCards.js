import React, { useState } from 'react';
import ReactCardFlip from 'react-card-flip';
import './WelcomeCards.css';

const WelcomeCards = () => {
  // State to track which cards are flipped
  const [flippedCards, setFlippedCards] = useState({
    upload: false,
    enhance: false,
    crop: false,
    strip: false
  });

  // Card data for consistent rendering
  const cardData = [
    {
      id: 'upload',
      frontTitle: 'Upload Photos',
      frontIcon: '📤',
      backContent: 'Upload your photos easily from your device. We support various formats including JPG, PNG, and more.'
    },
    {
      id: 'enhance',
      frontTitle: 'Enhance Photos',
      frontIcon: '✨',
      backContent: 'Improve your photos with our enhancement tools. Adjust brightness, contrast, saturation and more.'
    },
    {
      id: 'crop',
      frontTitle: 'Crop & Resize',
      frontIcon: '✂️',
      backContent: 'Crop and resize your photos to fit perfect dimensions for your needs. Custom and preset ratios available.'
    },
    {
      id: 'strip',
      frontTitle: 'Create Photo Strip',
      frontIcon: '🖼️',
      backContent: 'Create beautiful photo strips and collages from your images. Perfect for passport photos and more.'
    }
  ];

  // Handle hover for a specific card
  const handleCardHover = (id, isHovering) => {
    setFlippedCards(prev => ({ ...prev, [id]: isHovering }));
  };

  return (
    <div className="welcome-cards-container">
      {cardData.map(card => (
        <div 
          key={card.id} 
          className="card-hover-area"
          onMouseEnter={() => handleCardHover(card.id, true)}
          onMouseLeave={() => handleCardHover(card.id, false)}
        >
          <ReactCardFlip 
            isFlipped={flippedCards[card.id]} 
            flipDirection="horizontal"
            containerClassName={`card-flip-container ${flippedCards[card.id] ? 'is-hovered' : ''}`}
          >
            {/* Front Side */}
            <div className="welcome-card front">
              <div className="card-icon">{card.frontIcon}</div>
              <h3>{card.frontTitle}</h3>
            </div>
            
            {/* Back Side */}
            <div className="welcome-card back">
              <p>{card.backContent}</p>
            </div>
          </ReactCardFlip>
        </div>
      ))}
    </div>
  );
};

export default WelcomeCards;
