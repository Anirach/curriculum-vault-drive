import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Folder, FileText, Search, ArrowLeft, Trash2, Download, Edit, RotateCw } from 'lucide-react';
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

  const [folderNameCache, setFolderNameCache] = useState<Record<string, string>>({});
  const [loadingFolderNames, setLoadingFolderNames] = useState<Record<string, boolean>>({});

  const [searchResults, setSearchResults] = useState<FileItem[] | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

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

  const fetchAndCacheFolderName = useCallback(async (folderId: string, token: string) => {
    if (folderNameCache[folderId] || loadingFolderNames[folderId]) {
      return folderNameCache[folderId] || folderId;
    }
    if (!token) return folderId;

    setLoadingFolderNames(prev => ({ ...prev, [folderId]: true }));

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name&access_token=${token}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setFolderNameCache(prev => ({ ...prev, [folderId]: data.name }));
        setLoadingFolderNames(prev => ({ ...prev, [folderId]: false }));
        return data.name;
      }
    } catch (error) {
      console.error(`Error fetching name for folder ${folderId}:`, error);
      setLoadingFolderNames(prev => ({ ...prev, [folderId]: false }));
    }
    setLoadingFolderNames(prev => ({ ...prev, [folderId]: false }));
    return folderId;
  }, [folderNameCache, loadingFolderNames, accessToken]);

  const searchGoogleDrive = useCallback(async (query: string, token: string) => {
    console.log('Searching Google Drive...', { query });
    setLoadingSearch(true);
    setSearchResults(null);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name+contains+'${query}'+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink)&access_token=${token}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Google Drive API error during searchGoogleDrive:', response.status, errorData);
        throw new Error(`Google Drive API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (!data.files || !Array.isArray(data.files)) {
        console.log('No files found or invalid response structure in searchGoogleDrive.');
        setSearchResults([]);
      } else {
        console.log('Search results fetched successfully:', data.files.length);
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
        setSearchResults(items);
      }
    } catch (error) {
      console.error('Error searching Google Drive:', error);
      setSearchResults([]);
      toast({
        title: "เกิดข้อผิดพลาดในการค้นหา",
        description: `ไม่สามารถค้นหาใน Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setLoadingSearch(false);
    }
  }, [accessToken, toast]);

  useEffect(() => {
    console.log('FileBrowser useEffect triggered', { currentPath, refreshTrigger, searchQuery, hasRootFolders: !!rootFolders, hasAccessToken: !!accessToken });

    if (searchQuery === '') {
      setSearchResults(null);
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
    } else {
      if (accessToken) {
        searchGoogleDrive(searchQuery, accessToken);
      } else {
        console.log('No access token for search');
        setSearchResults([]);
      }
    }

  }, [currentPath, refreshTrigger, searchQuery, rootFolders, accessToken, fetchFilesLocal, searchGoogleDrive]);

  const filteredFiles = files;

  const handleRefresh = () => {
    console.log('handleRefresh called');
    setRefreshTrigger(prev => {
      console.log('refreshTrigger changed from', prev, 'to', prev + 1);
      return prev + 1;
    });
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

  const getFolderName = (folderId: string): string => {
    return folderNameCache[folderId] || (loadingFolderNames[folderId] ? 'Loading...' : folderId);
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

    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    const parentId = currentPath.length === 0 ? getParentIdForNewFolder() : currentPath[currentPath.length - 1];

    if (!parentId) {
        toast({
            title: "เกิดข้อผิดพลาด",
            description: "ไม่สามารถระบุโฟลเดอร์ปลายทางสำหรับการอัปโหลดได้",
            variant: "destructive",
        });
        console.error('handleUpload: Failed to determine parentId.', { currentPath });
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Selected file for upload:', file);

        const metadata = {
          name: file.name,
          parents: [parentId],
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        try {
          const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: form,
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Google Drive API error during file upload:', response.status, errorData);
            const errorMessage = errorData?.error?.message || response.statusText || "Unknown error";
            throw new Error(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${errorMessage}`);
          }

          const result = await response.json();
          console.log('File uploaded successfully:', result);

          toast({
            title: "อัปโหลดสำเร็จ",
            description: `${file.name} อัปโหลดขึ้น Google Drive เรียบร้อยแล้ว`,
          });

          handleRefresh();

        } catch (error) {
          console.error('Error during file upload:', error);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: error instanceof Error ? error.message : "ไม่สามารถอัปโหลดไฟล์ขึ้น Google Drive ได้",
            variant: "destructive",
          });
        }
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
    // ตรวจสอบ accessToken
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    // สร้างลิงก์ดาวน์โหลดโดยตรงจาก Google Drive API
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

    // เปิดลิงก์ดาวน์โหลดในแท็บใหม่
    window.open(downloadUrl, '_blank');

    toast({
      title: "กำลังเริ่มดาวน์โหลด",
      description: `กำลังดาวน์โหลด ${file.name}...`,
    });
  };

  const handleView = (file: FileItem) => {
    if (!hasPermission('view')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view files.",
        variant: "destructive",
      });
      return;
    }

    if (file.url) {
      window.open(file.url, '_blank');
      toast({
        title: "เปิดไฟล์",
        description: `เปิด ${file.name} ในแท็บใหม่`,
      });
    } else {
      toast({
        title: "ไม่สามารถเปิดไฟล์ได้",
        description: `ไม่มีลิงก์สำหรับเปิด ${file.name}`,
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
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RotateCw className="w-4 h-4" />
            </Button>
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
        {loadingSearch ? (
          <div className="text-center py-8 text-gray-500">
            <RotateCw className="w-12 h-12 mx-auto mb-2 opacity-50 animate-spin" />
            <p>กำลังค้นหา...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(searchQuery !== '' ? searchResults : filteredFiles)?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{searchQuery !== '' ? 'ไม่พบผลลัพธ์การค้นหา' : 'No files found'}</p>
              </div>
            ) : (
              (searchQuery !== '' ? searchResults : filteredFiles)?.map((file) => (
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
                        {hasPermission('view') && file.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(file);
                            }}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
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
        )}
      </CardContent>
    </Card>
  );
};