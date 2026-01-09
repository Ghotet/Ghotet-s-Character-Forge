
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
            className={`aspect-square rounded-md overflow-hidden cursor-pointer transition-all duration-300 border-2 bg-black ${isSelected ? 'border-green-500' : 'border-gray-800 hover:border-green-600'}`}
        >
            <img src={imageUrl} alt={alt} className="w-full h-full object-contain" />
        </div>
    )
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ images }) => {
  const [mainImage, setMainImage] = useState(images.main);

  const allImages = [
    { id: 'main', src: images.main, alt: 'Source Image' },
    { id: 'neutral', src: images.poses[0], alt: 'Neutral Pose' },
    { id: 'joy', src: images.poses[1], alt: 'Joy Expression' },
    { id: 'anger', src: images.poses[2], alt: 'Anger Expression' },
    { id: 'thought', src: images.poses[3], alt: 'Thoughtful Pose' },
  ];

  return (
    <div>
      <div className="aspect-square w-full rounded-lg overflow-hidden mb-4 border border-gray-800 shadow-lg shadow-black/50 bg-black">
        <img src={mainImage.startsWith('http') ? mainImage : `data:image/png;base64,${mainImage}`} alt="Main character view" className="w-full h-full object-contain transition-all duration-300" />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {allImages.map(img => img.src && (
            <ImageThumbnail 
                key={img.id}
                src={img.src} 
                alt={img.alt} 
                onClick={() => setMainImage(img.src)}
                isSelected={mainImage === img.src}
            />
        ))}
      </div>
      <p className="text-[9px] text-gray-600 uppercase mt-4 tracking-widest text-center">Biometric Variant Slots</p>
    </div>
  );
};
