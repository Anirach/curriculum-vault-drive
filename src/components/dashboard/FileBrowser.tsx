import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Folder, FileText, Search, ArrowLeft, Trash2, Download, Edit } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useUser } from '@/contexts/UserContext';
import { FileItem } from './Dashboard';
import { FolderActions, FolderActionsRef } from './FolderActions';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/types/user';

interface FileBrowserProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onFileSelect: (file: FileItem) => void;
  rootFolders?: FileItem[];
  userRole?: UserRole;
  accessToken?: string;
}

export const FileBrowser = ({ currentPath, onPathChange, onFileSelect, rootFolders, userRole, accessToken }: FileBrowserProps) => {
  const { hasPermission } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const folderActionsRef = useRef<FolderActionsRef>(null);
  const isDriveReadonly = !!rootFolders;

  const fetchFilesLocal = useCallback(async (folderIdToFetch: string, token: string) => {
    console.log('Fetching files from Google Drive...', { folderId: folderIdToFetch });
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderIdToFetch}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink)&access_token=${token}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Google Drive API error during fetchFilesLocal:', response.status, errorData);
        throw new Error(`Google Drive API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (!data.files || !Array.isArray(data.files)) {
        console.log('No files found or invalid response structure in fetchFilesLocal.');
        setFiles([]);
        return;
      }

      console.log('Files fetched successfully in fetchFilesLocal:', data.files.length);
      interface GoogleDriveFileItem {
        id: string;
        name: string;
        mimeType: string;
        size?: string;
        modifiedTime?: string;
        webViewLink?: string;
      }
      const items = (data.files as GoogleDriveFileItem[]).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file' as 'folder' | 'file',
        path: [], // path is managed at the Dashboard level
        url: item.mimeType !== 'application/vnd.google-apps.folder' ? item.webViewLink : undefined,
        size: item.size,
        lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
      }));
      setFiles(items);
    } catch (error) {
      console.error('Error fetching files in fetchFilesLocal:', error);
      setFiles([]);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดึงข้อมูลจาก Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    console.log('FileBrowser useEffect triggered', { currentPath, hasRootFolders: !!rootFolders, hasAccessToken: !!accessToken });

    if (currentPath.length === 0 && rootFolders) {
      console.log('Setting files to rootFolders');
      setFiles(rootFolders);
    } else if (currentPath.length > 0 && accessToken) {
      const folderIdToFetch = currentPath[currentPath.length - 1];
      console.log('Attempting to fetch files for subfolder:', folderIdToFetch);
      fetchFilesLocal(folderIdToFetch, accessToken);
    } else {
      console.log('Not at root with rootFolders or in subfolder with accessToken, clearing files');
      setFiles([]);
    }
  }, [currentPath, refreshTrigger, rootFolders, accessToken, fetchFilesLocal]);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getParentIdForNewFolder = (): string | undefined => {
    if (currentPath.length === 0) {
      const driveUrl = localStorage.getItem('driveUrl');
      if (!driveUrl) {
        console.error('getParentIdForNewFolder: driveUrl not found in localStorage.');
        return undefined;
      }
      const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match || !match[1]) {
         console.error('getParentIdForNewFolder: Invalid driveUrl format.', driveUrl);
         return undefined;
      }
      return match[1];
    } else {
      return currentPath[currentPath.length - 1];
    }
  };

  const addNewFolder = async (folderName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const parentId = getParentIdForNewFolder();

      if (!parentId) {
        console.error('addNewFolder: Failed to determine parentId.', { currentPath });
        throw new Error('ไม่สามารถระบุโฟลเดอร์หลักสำหรับสร้างโฟลเดอร์ได้');
      }

      console.log('Attempting to create folder with parent ID:', parentId);

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Google Drive API error during folder creation:', response.status, errorData);
        const errorMessage = errorData?.error?.message || response.statusText || "Unknown error";
        throw new Error(`เกิดข้อผิดพลาดในการสร้างโฟลเดอร์: ${errorMessage}`);
      }

      toast({
        title: "สร้างโฟลเดอร์สำเร็จ",
        description: `สร้างโฟลเดอร์ "${folderName}" ใน Google Drive เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถสร้างโฟลเดอร์ใน Google Drive ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  const renameFolder = async (oldName: string, newName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const folderToRename = files.find(f => f.name === oldName && f.type === 'folder');
      if (!folderToRename?.id) {
        throw new Error('ไม่พบโฟลเดอร์ที่ต้องการเปลี่ยนชื่อ');
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderToRename.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`เกิดข้อผิดพลาดในการเปลี่ยนชื่อโฟลเดอร์: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "เปลี่ยนชื่อโฟลเดอร์สำเร็จ",
        description: `เปลี่ยนชื่อโฟลเดอร์เป็น "${newName}" เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`เกิดข้อผิดพลาดในการลบโฟลเดอร์: ${response.status} ${response.statusText}`);
      }

      toast({
        title: "ลบโฟลเดอร์สำเร็จ",
        description: `ลบโฟลเดอร์เรียบร้อยแล้ว`,
      });

      handleRefresh();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถลบโฟลเดอร์ได้",
        variant: "destructive",
      });
      throw error;
    }
  };

  // ปรับปรุงฟังก์ชัน getFolderName อีกครั้ง
  const getFolderName = (folderId: string): string => {
    // ตรวจสอบใน rootFolders เสมอ เพราะ rootFolders ควรมีข้อมูลของโฟลเดอร์ระดับบนทั้งหมด
    const rootFolder = rootFolders?.find(f => f.id === folderId);
    if (rootFolder) {
      return rootFolder.name;
    }
    // หากไม่เจอใน rootFolders (อาจเป็นโฟลเดอร์ที่สร้างขึ้นใหม่ใน subfolder)
    // ให้ค้นหาในรายการ files ที่แสดงอยู่ในปัจจุบัน
    const currentFolder = files.find(f => f.id === folderId);
     if (currentFolder) {
       return currentFolder.name;
     }
    // หากยังไม่เจอ (อาจเป็นโฟลเดอร์แม่ที่ไม่ได้อยู่ใน files ปัจจุบัน)
    // เราไม่มีข้อมูลชื่อของโฟลเดอร์แม่ที่ลึกๆ นอกเหนือจากที่ fetch มาใน rootFolders หรือ files ปัจจุบัน
    // ในสถานการณ์นี้ เราจำเป็นต้องมีวิธีเก็บชื่อโฟลเดอร์ที่เข้าชมไว้
    // หรือ fetch ข้อมูลชื่อของโฟลเดอร์นั้นๆ โดยเฉพาะ
    // แต่เพื่อแก้ไขปัญหาเบื้องต้นตามภาพ ให้แสดง ID ไปก่อนถ้าหาชื่อไม่ได้จริงๆ
    console.warn(`getFolderName: Could not find name for folder ID ${folderId}. Displaying ID.`);
    return folderId;
  };


  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      const newPath = [...currentPath, item.id];
      onPathChange(newPath);
    } else {
      onFileSelect(item);
    }
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
        // TODO: Implement actual Google Drive upload logic
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

    // TODO: Implement actual Google Drive delete logic for files
    toast({
      title: "File Deleted",
      description: `${file.name} has been deleted.`,
    });
    handleRefresh();
  };

  const handleDownload = (file: FileItem) => {
     if (file.url) {
       window.open(file.url, '_blank');
       toast({
         title: "Download Started",
         description: `Downloading ${file.name}...`,
       });
     } else {
       toast({
         title: "Download Failed",
         description: `Cannot download ${file.name}. URL not available.`,
         variant: "destructive",
       });
     }
  };

  const handleRenameFolder = (folderName: string) => {
    if (folderActionsRef.current) {
      folderActionsRef.current.openRenameDialog(folderName);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!hasPermission('delete')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete folders.",
        variant: "destructive",
      });
      return;
    }

    const folderToDelete = files.find(f => f.name === folderName && f.type === 'folder');
    if (!folderToDelete?.id) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบโฟลเดอร์ที่ต้องการลบ",
        variant: "destructive",
      });
      return;
    }

    await deleteFolder(folderToDelete.id);
    handleRefresh();
  };

  return (
    <Card className="flex-1 m-4 mr-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {currentPath.length === 0 ? 'Faculties' : getFolderName(currentPath[currentPath.length - 1])}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <FolderActions
              ref={folderActionsRef}
              currentPath={currentPath}
              onPathChange={onPathChange}
              onRefresh={handleRefresh}
              onAddFolder={addNewFolder}
              onRenameFolder={renameFolder}
              disabled={!accessToken}
              userRole={userRole as UserRole}
              accessToken={accessToken}
              files={files}
              rootFolders={rootFolders}
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
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {/* เปลี่ยน Home เป็น Faculties */}
          <span
            className="cursor-pointer hover:text-blue-600"
            onClick={() => onPathChange([])}
          >
            Faculties
          </span>
          {currentPath.map((folderId, index) => (
            <div key={index} className="flex items-center">
              <span>/</span>
              <span
                className="cursor-pointer hover:text-blue-600"
                onClick={() => onPathChange(currentPath.slice(0, index + 1))}
              >
                {/* ใช้ getFolderName เพื่อแสดงชื่อโฟลเดอร์ */}
                {getFolderName(folderId)}
              </span>
            </div>
          ))}
        </div>

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
                        onClick={() => handleItemClick(file)}
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
                      {hasPermission('rename') && (
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
                    onClick={() => handleItemClick(file)}
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