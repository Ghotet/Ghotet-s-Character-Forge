
import React, { useState } from 'react';
import type { CharacterImages } from '../types';

interface ImageViewerProps {
  images: CharacterImages;
}

const ImageThumbnail: React.FC<{src: string, alt: string, onClick: () => void, isSelected: boolean}> = ({src, alt, onClick, isSelected}) => {
    const imageUrl = src.startsWith('http') ? src : `data:image/png;base64,${src}`;
    return (
        <div 
            onClick={onClick}
            className={`aspect-square rounded-md overflow-hidden cursor-pointer transition-all duration-300 border-2 ${isSelected ? 'border-green-500' : 'border-gray-800 hover:border-green-600'}`}
        >
            <img src={imageUrl} alt={alt} className="w-full h-full object-cover" />
        </div>
    )
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images }) => {
  const [mainImage, setMainImage] = useState(images.main);

  const allImages = [
    { id: 'main', src: images.main, alt: 'Main portrait' },
    { id: 'front', src: images.orthos.front, alt: 'Front orthographic view' },
    { id: 'side', src: images.orthos.side, alt: 'Side orthographic view' },
    { id: 'back', src: images.orthos.back, alt: 'Back orthographic view' },
    { id: 'pose1', src: images.poses[0], alt: 'Action pose 1' },
    { id: 'pose2', src: images.poses[1], alt: 'Action pose 2' },
  ];

  return (
    <div>
      <div className="aspect-square w-full rounded-lg overflow-hidden mb-4 border border-gray-800 shadow-lg shadow-black/50">
        <img src={mainImage.startsWith('http') ? mainImage : `data:image/png;base64,${mainImage}`} alt="Main character view" className="w-full h-full object-cover" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {allImages.map(img => (
            <ImageThumbnail 
                key={img.id}
                src={img.src} 
                alt={img.alt} 
                onClick={() => setMainImage(img.src)}
                isSelected={mainImage === img.src}
            />
        ))}
      </div>
    </div>
  );
};
