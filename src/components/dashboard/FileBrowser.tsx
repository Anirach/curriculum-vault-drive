
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Folder, FileText, Search, ArrowLeft, Trash2, Download, Edit } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useUser } from '@/contexts/UserContext';
import { FileItem } from './Dashboard';
import { FolderActions } from './FolderActions';
import { toast } from '@/hooks/use-toast';

interface FileBrowserProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onFileSelect: (file: FileItem) => void;
}

export const FileBrowser = ({ currentPath, onPathChange, onFileSelect }: FileBrowserProps) => {
  const { hasPermission } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mock data structure - in real app, this would come from Google Drive API
  const [mockFileStructure, setMockFileStructure] = useState<Record<string, FileItem[]>>({
    '': [
      { id: '1', name: 'Engineering', type: 'folder', path: ['Engineering'] },
      { id: '2', name: 'Business', type: 'folder', path: ['Business'] },
      { id: '3', name: 'Arts & Sciences', type: 'folder', path: ['Arts & Sciences'] },
    ],
    'Engineering': [
      { id: '4', name: 'Computer Science', type: 'folder', path: ['Engineering', 'Computer Science'] },
      { id: '5', name: 'Mechanical Engineering', type: 'folder', path: ['Engineering', 'Mechanical Engineering'] },
      { id: '6', name: 'Electrical Engineering', type: 'folder', path: ['Engineering', 'Electrical Engineering'] },
    ],
    'Engineering/Computer Science': [
      { id: '7', name: '2024', type: 'folder', path: ['Engineering', 'Computer Science', '2024'] },
      { id: '8', name: '2023', type: 'folder', path: ['Engineering', 'Computer Science', '2023'] },
      { id: '9', name: '2022', type: 'folder', path: ['Engineering', 'Computer Science', '2022'] },
    ],
    'Engineering/Computer Science/2024': [
      { id: '10', name: 'Data Structures Curriculum.pdf', type: 'file', path: ['Engineering', 'Computer Science', '2024'], url: '/sample.pdf', size: '2.4 MB', lastModified: '2024-03-15' },
      { id: '11', name: 'Algorithms Curriculum.pdf', type: 'file', path: ['Engineering', 'Computer Science', '2024'], url: '/sample.pdf', size: '1.8 MB', lastModified: '2024-03-10' },
      { id: '12', name: 'Software Engineering Curriculum.pdf', type: 'file', path: ['Engineering', 'Computer Science', '2024'], url: '/sample.pdf', size: '3.2 MB', lastModified: '2024-03-08' },
    ],
  });

  useEffect(() => {
    const pathKey = currentPath.join('/');
    setFiles(mockFileStructure[pathKey] || []);
  }, [currentPath, refreshTrigger, mockFileStructure]);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const addNewFolder = (folderName: string) => {
    const pathKey = currentPath.join('/');
    const newId = Date.now().toString();
    const newFolder: FileItem = {
      id: newId,
      name: folderName,
      type: 'folder',
      path: [...currentPath, folderName]
    };

    setMockFileStructure(prev => ({
      ...prev,
      [pathKey]: [...(prev[pathKey] || []), newFolder]
    }));

    handleRefresh();
  };

  const renameFolder = (oldName: string, newName: string) => {
    const pathKey = currentPath.join('/');
    
    setMockFileStructure(prev => {
      const newStructure = { ...prev };
      
      // Update the folder name in the current path
      if (newStructure[pathKey]) {
        newStructure[pathKey] = newStructure[pathKey].map(item => 
          item.name === oldName && item.type === 'folder' 
            ? { ...item, name: newName, path: [...currentPath, newName] }
            : item
        );
      }
      
      // Update any nested paths that reference this folder
      const oldFolderPath = [...currentPath, oldName].join('/');
      const newFolderPath = [...currentPath, newName].join('/');
      
      // Move data from old path to new path
      if (newStructure[oldFolderPath]) {
        newStructure[newFolderPath] = newStructure[oldFolderPath].map(item => ({
          ...item,
          path: item.path.map((segment, index) => 
            index === currentPath.length && segment === oldName ? newName : segment
          )
        }));
        delete newStructure[oldFolderPath];
      }
      
      return newStructure;
    });

    handleRefresh();
  };

  const handleFolderClick = (folder: FileItem) => {
    onPathChange(folder.path);
  };

  const handleFileClick = (file: FileItem) => {
    onFileSelect(file);
  };

  const handleUpload = () => {
    if (!hasPermission('upload')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to upload files.",
        variant: "destructive",
      });
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "Upload Successful",
          description: `${file.name} has been uploaded.`,
        });
      }
    };
    input.click();
  };

  const handleDelete = (file: FileItem) => {
    if (!hasPermission('delete')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete files.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "File Deleted",
      description: `${file.name} has been deleted.`,
    });
  };

  const handleDownload = (file: FileItem) => {
    toast({
      title: "Download Started",
      description: `Downloading ${file.name}...`,
    });
  };

  const handleRenameFolder = (folderName: string) => {
    // This will be handled by the FolderActions component through the rename dialog
    console.log('Rename folder requested for:', folderName);
  };

  const handleDeleteFolder = (folderName: string) => {
    if (!hasPermission('delete')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete folders.",
        variant: "destructive",
      });
      return;
    }

    const pathKey = currentPath.join('/');
    setMockFileStructure(prev => ({
      ...prev,
      [pathKey]: prev[pathKey]?.filter(item => item.name !== folderName) || []
    }));

    toast({
      title: "Folder Deleted",
      description: `"${folderName}" has been deleted.`,
    });
    handleRefresh();
  };

  return (
    <Card className="flex-1 m-4 mr-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {currentPath.length === 0 ? 'Faculties' : currentPath[currentPath.length - 1]}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <FolderActions 
              currentPath={currentPath}
              onPathChange={onPathChange}
              onRefresh={handleRefresh}
              onAddFolder={addNewFolder}
              onRenameFolder={renameFolder}
            />
            {hasPermission('upload') && (
              <Button onClick={handleUpload} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            )}
            {currentPath.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onPathChange(currentPath.slice(0, -1))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
        </div>
        
        {/* Breadcrumb */}
        {currentPath.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span 
              className="cursor-pointer hover:text-blue-600"
              onClick={() => onPathChange([])}
            >
              Home
            </span>
            {currentPath.map((segment, index) => (
              <React.Fragment key={index}>
                <span>/</span>
                <span 
                  className="cursor-pointer hover:text-blue-600"
                  onClick={() => onPathChange(currentPath.slice(0, index + 1))}
                >
                  {segment}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No files found</p>
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div key={file.id}>
                {file.type === 'folder' ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleFolderClick(file)}
                      >
                        <div className="flex items-center space-x-3">
                          <Folder className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {hasPermission('upload') && (
                        <ContextMenuItem onClick={() => handleRenameFolder(file.name)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Rename
                        </ContextMenuItem>
                      )}
                      {hasPermission('delete') && (
                        <ContextMenuItem onClick={() => handleDeleteFolder(file.name)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ) : (
                  <div
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.size} • Modified {file.lastModified}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {hasPermission('delete') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
