import React from 'react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  reviewCount?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 'md',
  showValue = true,
  reviewCount,
}) => {
  const fullStars = Math.floor(rating);
  const partialStar = rating % 1;
  const emptyStars = 5 - fullStars - (partialStar > 0 ? 1 : 0);
  
  const sizesClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };
  
  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };
  
  const renderStars = () => {
    const stars = [];
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className={`${sizesClass[size]} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    
    // Partial star
    if (partialStar > 0) {
      const percent = Math.round(partialStar * 100);
      stars.push(
        <div key="partial" className="relative">
          <svg className={`${sizesClass[size]} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div className="absolute top-0 left-0 overflow-hidden" style={{ width: `${percent}%` }}>
            <svg className={`${sizesClass[size]} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      );
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className={`${sizesClass[size]} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    
    return stars;
  };
  
  return (
    <div className="flex items-center">
      <div className="flex mr-1">
        {renderStars()}
      </div>
      {showValue && (
        <span className={`${textSize[size]} font-medium text-gray-700`}>
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={`${textSize[size]} text-gray-500 ml-1`}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
};

export default StarRating;