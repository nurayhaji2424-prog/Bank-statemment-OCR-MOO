import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { CloseIcon } from './icons/CloseIcon';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  files: File[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, files }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(event.target.files || []);
    if (newFiles.length === 0) return;
    
    const updatedFiles = [...files];
    // Add only new files, preventing duplicates by name
    newFiles.forEach(newFile => {
        if (!files.some(f => f.name === newFile.name)) {
            updatedFiles.push(newFile);
        }
    });

    onFilesChange(updatedFiles);
    // Reset input value to allow re-selecting the same file if removed
    if (inputRef.current) {
        inputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileNameToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedFiles = files.filter(file => file.name !== fileNameToRemove);
    onFilesChange(updatedFiles);
  };

  const handleClearFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFilesChange([]);
    if (inputRef.current) {
        inputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition-all duration-300"
      onClick={triggerFileSelect}
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileSelect}
        accept="image/*,application/pdf"
        className="hidden"
        multiple // Enable multiple file selection
      />
      {files.length > 0 ? (
        <div className="space-y-4">
            <ul className="space-y-3 text-left">
                {files.map(file => (
                    <li key={file.name} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                        <div className="flex items-center space-x-2 overflow-hidden">
                            <FileIcon className="w-6 h-6 text-teal-500 flex-shrink-0" />
                            <span className="text-gray-700 font-medium truncate" title={file.name}>{file.name}</span>
                        </div>
                        <button
                            onClick={(e) => handleRemoveFile(file.name, e)}
                            className="p-1 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600"
                            aria-label={`Remove ${file.name}`}
                        >
                            <CloseIcon className="w-5 h-5"/>
                        </button>
                    </li>
                ))}
            </ul>
             <div className="flex items-center justify-center space-x-4 pt-4">
                <button
                    onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }}
                    className="text-sm text-teal-600 font-semibold hover:underline"
                >
                    Add more files
                </button>
                <button
                    onClick={handleClearFiles}
                    className="text-sm text-red-500 hover:text-red-600 hover:underline"
                >
                    Clear all
                </button>
            </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <UploadIcon className="w-16 h-16 text-gray-400" />
          <p className="text-gray-700 font-semibold">
            Click to browse or drag & drop file(s)
          </p>
          <p className="text-gray-500 text-sm">PDF or Image (PNG, JPG)</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
