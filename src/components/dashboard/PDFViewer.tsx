
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, ExternalLink } from 'lucide-react';
import { FileItem } from './Dashboard';

interface PDFViewerProps {
  file: FileItem;
  onClose: () => void;
}

export const PDFViewer = ({ file, onClose }: PDFViewerProps) => {
  const handleDownload = () => {
    // In a real app, this would download from Google Drive
    console.log(`Downloading ${file.name}`);
  };

  return (
    <Card className="w-96 m-4 ml-2 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {file.name}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button size="sm" onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <div className="h-[calc(100vh-200px)] bg-gray-100 rounded-b-lg flex items-center justify-center">
          {file.url ? (
            <iframe
              src={file.url}
              className="w-full h-full rounded-b-lg"
              title={file.name}
            />
          ) : (
            <div className="text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>PDF Preview</p>
              <p className="text-sm">Click download to view the full document</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
