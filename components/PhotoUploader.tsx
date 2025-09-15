import React, { useCallback, useRef, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface PhotoUploaderProps {
  onImageUpload: (file: File) => void;
  previewUrl: string | null;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onImageUpload, previewUrl }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDraggingOver(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
    }
  };


  return (
    <div
      className={`relative w-full aspect-[3/4] border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 cursor-pointer transition-colors ${
        isDraggingOver 
        ? 'border-blue-500 bg-blue-50' 
        : 'border-slate-300 bg-white hover:border-blue-500'
      }`}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      {isDraggingOver && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
            <p className="text-lg font-semibold text-blue-600">Thả ảnh vào đây</p>
        </div>
      )}
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" className="object-contain max-w-full max-h-full rounded-md" />
      ) : (
        <div className="text-slate-500 pointer-events-none">
          <UploadIcon className="w-10 h-10 mx-auto mb-2 text-slate-400" />
          <p className="font-semibold">Nhấn hoặc kéo ảnh vào đây</p>
          <p className="text-xs mt-1">Định dạng PNG, JPG, hoặc WEBP</p>
        </div>
      )}
    </div>
  );
};