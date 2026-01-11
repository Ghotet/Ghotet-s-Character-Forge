import React, { useState, useEffect } from 'react';
import type { ImagePart } from '../types'; // Import ImagePart

interface ImageGridProps {
  images: ImagePart[]; // Changed from string[] to ImagePart[]
  onSelect: (image: ImagePart) => void; // Changed from string to ImagePart
}

export const ImageGrid: React.FC<ImageGridProps> = ({ images, onSelect }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className={`transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        <h2 className="text-2xl font-bold text-center mb-6 text-green-400">Select a Concept</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((imgPart, index) => ( // Changed img to imgPart
            <div
            key={index}
            className="group aspect-[3/4] cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-green-500 hover:shadow-[0_0_20px_rgba(50,255,50,0.6)] transition-all duration-300"
            onClick={() => onSelect(imgPart)}
            >
            <img 
                src={imgPart.data.startsWith('http') ? imgPart.data : `data:${imgPart.mimeType};base64,${imgPart.data}`} // Use ImagePart properties
                alt={`Concept ${index + 1}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            </div>
        ))}
        </div>
    </div>
  );
};