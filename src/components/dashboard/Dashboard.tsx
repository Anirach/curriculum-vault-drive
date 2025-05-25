
import React, { useState } from 'react';
import { Header } from './Header';
import { FileBrowser } from './FileBrowser';
import { PDFViewer } from './PDFViewer';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string[];
  url?: string;
  size?: string;
  lastModified?: string;
}

export const Dashboard = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 flex">
          <FileBrowser 
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onFileSelect={setSelectedFile}
          />
          {selectedFile && selectedFile.type === 'file' && (
            <PDFViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
          )}
        </div>
      </div>
    </div>
  );
};
