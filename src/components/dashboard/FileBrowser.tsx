import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Folder, FileText, Search, ArrowLeft, Trash2, Download, Edit, RotateCw, Share2, FolderUp, ChevronLeft } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { useUser } from '@/contexts/UserContext';
import { FileItem, GoogleDriveFile } from './Dashboard';
import { FolderActions, FolderActionsRef } from './FolderActions';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/types/user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FileBrowserProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onFileSelect: (file: FileItem) => void;
  rootFolders?: FileItem[];
  userRole?: UserRole;
  accessToken?: string;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string, role: 'reader' | 'writer') => Promise<void>;
  folderName: string;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, onShare, folderName }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'reader' | 'writer'>('reader');
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!email) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "กรุณาระบุอีเมลของผู้ใช้ที่ต้องการแชร์",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSharing(true);
      await onShare(email, role);
      toast({
        title: "แชร์โฟลเดอร์สำเร็จ",
        description: `แชร์โฟลเดอร์ "${folderName}" กับ ${email} แล้ว`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแชร์โฟลเดอร์ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แชร์โฟลเดอร์ "{folderName}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">อีเมลผู้ใช้</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>สิทธิ์การเข้าถึง</Label>
            <div className="flex space-x-4">
              <Button
                variant={role === 'reader' ? 'default' : 'outline'}
                onClick={() => setRole('reader')}
                className="flex-1"
              >
                อ่านอย่างเดียว
              </Button>
              <Button
                variant={role === 'writer' ? 'default' : 'outline'}
                onClick={() => setRole('writer')}
                className="flex-1"
              >
                แก้ไขได้
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={handleShare} disabled={isSharing}>
            {isSharing ? 'กำลังแชร์...' : 'แชร์'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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

  const driveUrl = localStorage.getItem('driveUrl');

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null);

  const fetchFolderContents = useCallback(async (folderId: string, token: string, allItems: FileItem[] = []): Promise<FileItem[]> => {
    console.log('Fetching contents of folder...', { folderId });
    let pageToken: string | null = null;
    let currentFolderItems: FileItem[] = [];

    try {
      do {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken, files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)&access_token=${token}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? '&pageToken=' + pageToken : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Google Drive API error during fetchFolderContents:', response.status, errorData);
          throw new Error(`Google Drive API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          const items: FileItem[] = data.files.map((item: GoogleDriveFile) => ({
            id: item.id,
            name: item.name,
            type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            path: [], // path is managed at the Dashboard level
            url: item.webViewLink,
            downloadUrl: item.webContentLink, // ใช้ webContentLink สำหรับ downloadUrl
            size: item.size,
            lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
            parents: item.parents,
            mimeType: item.mimeType, // เพิ่ม mimeType เพื่อใช้ในการตรวจสอบประเภทไฟล์
          }));
          currentFolderItems = [...currentFolderItems, ...items];
          pageToken = data.nextPageToken || null;
          console.log(`Fetched page for folder ${folderId}, found ${data.files.length} items, next page token: ${pageToken}`);
        } else {
           console.log('No items found or invalid response structure on a page in fetchFolderContents.');
           pageToken = null; // Stop pagination
        }
      } while (pageToken);

      // Add current folder items to the total list
      allItems = [...allItems, ...currentFolderItems];

      // Recursively fetch contents of subfolders
      for (const item of currentFolderItems) {
        if (item.type === 'folder') {
          allItems = await fetchFolderContents(item.id, token, allItems);
        }
      }

      return allItems;

    } catch (error) {
      console.error(`Error fetching contents for folder ${folderId}:`, error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดึงข้อมูลโฟลเดอร์จาก Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      throw error; // Rethrow to propagate error
    }
  }, [toast]);

  // ฟังก์ชันใหม่สำหรับดึง Direct Children เท่านั้น
  const fetchDirectChildren = useCallback(async (folderId: string, token: string): Promise<FileItem[]> => {
    console.log('Fetching direct children of folder...', { folderId });
    let allFiles: FileItem[] = [];
    let pageToken: string | null = null;

    try {
      do {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken, files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)&access_token=${token}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? '&pageToken=' + pageToken : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error('Google Drive API error during fetchDirectChildren:', response.status, errorData);
          throw new Error(`Google Drive API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.files && Array.isArray(data.files)) {
          const items: FileItem[] = data.files.map((item: GoogleDriveFile) => ({
            id: item.id,
            name: item.name,
            type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            path: [], // path is managed at the Dashboard level
            url: item.webViewLink,
            downloadUrl: item.webContentLink, // ใช้ webContentLink สำหรับ downloadUrl
            size: item.size,
            lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
            parents: item.parents,
            mimeType: item.mimeType, // เพิ่ม mimeType เพื่อใช้ในการตรวจสอบประเภทไฟล์
          }));
          allFiles = [...allFiles, ...items];
          pageToken = data.nextPageToken || null;
          console.log(`Fetched page for direct children of ${folderId}, found ${data.files.length} items, next page token: ${pageToken}`);
        } else {
           console.log('No items found or invalid response structure on a page in fetchDirectChildren.');
           pageToken = null; // Stop pagination
        }
      } while (pageToken);

      console.log('Fetched direct children successfully:', allFiles.length);
      return allFiles;

    } catch (error) {
      console.error(`Error fetching direct children for folder ${folderId}:`, error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดึงข้อมูลโฟลเดอร์จาก Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
      throw error; // Rethrow to propagate error
    }
  }, [toast]);

  // แก้ไข useEffect สำหรับการโหลดไฟล์
  useEffect(() => {
    const loadFiles = async () => {
      if (!accessToken || searchQuery !== '') {
        return;
      }

      const match = driveUrl?.match(/folders\/([a-zA-Z0-9_-]+)/);
      const rootFolderId = match ? match[1] : null;
      const targetFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : rootFolderId;

      if (!targetFolderId) {
        setFiles([]);
        return;
      }

      try {
        if (currentPath.length === 0 && targetFolderId) {
          const directChildren = await fetchDirectChildren(targetFolderId, accessToken);
          setFiles(directChildren);
        } else if (currentPath.length > 0 && targetFolderId) {
          const directChildren = await fetchDirectChildren(targetFolderId, accessToken);
          setFiles(directChildren);
        }
      } catch (error) {
        console.error('Failed to load files:', error);
        setFiles([]);
      }
    };

    loadFiles();
  }, [currentPath, accessToken, driveUrl, searchQuery, fetchDirectChildren]); // ลบ files ออกจาก dependencies

  // แยก useEffect สำหรับการค้นหา
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || !accessToken) {
        setSearchResults(null);
        return;
      }

      setLoadingSearch(true);
      try {
        const filteredResults = files.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    };

    performSearch();
  }, [searchQuery, accessToken, files]);

  // แยก useEffect สำหรับการโหลดชื่อโฟลเดอร์
  useEffect(() => {
    const fetchFolderNames = async () => {
      if (!accessToken || currentPath.length === 0) return;
      
      const newFolderNames: Record<string, string> = {};
      const newLoadingStates: Record<string, boolean> = {};
      
      for (const folderId of currentPath) {
        if (!folderNameCache[folderId] && !loadingFolderNames[folderId]) {
          newLoadingStates[folderId] = true;
          try {
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name&access_token=${accessToken}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (response.ok) {
              const data = await response.json();
              newFolderNames[folderId] = data.name;
            }
          } catch (error) {
            console.error(`Error fetching name for folder ${folderId}:`, error);
          } finally {
            newLoadingStates[folderId] = false;
          }
        }
      }

      if (Object.keys(newFolderNames).length > 0) {
        setFolderNameCache(prev => ({ ...prev, ...newFolderNames }));
      }
      if (Object.keys(newLoadingStates).length > 0) {
        setLoadingFolderNames(prev => ({ ...prev, ...newLoadingStates }));
      }
    };

    fetchFolderNames();
  }, [currentPath, accessToken, folderNameCache, loadingFolderNames]);

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

  // เพิ่มฟังก์ชันสำหรับเปลี่ยนชื่อไฟล์
  const renameFile = async (fileId: string, newName: string) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
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
        const errorMessage = errorData?.error?.message || response.statusText || "Unknown error";
        throw new Error(`เกิดข้อผิดพลาดในการเปลี่ยนชื่อไฟล์: ${errorMessage}`);
      }

      toast({
        title: "เปลี่ยนชื่อไฟล์สำเร็จ",
        description: `เปลี่ยนชื่อไฟล์เป็น "${newName}" เรียบร้อยแล้ว`,
      });

      handleRefresh(); // รีเฟรชรายการหลังจากเปลี่ยนชื่อ
    } catch (error) {
      console.error('Error renaming file:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนชื่อไฟล์ได้",
        variant: "destructive",
      });
      throw error; // Rethrow to propagate error
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

  const handleItemClick = useCallback(async (item: FileItem) => {
    if (item.type === 'folder') {
      const newPath = [...currentPath, item.id];
      onPathChange(newPath);
    } else {
      console.log('File clicked, attempting to fetch content...', item);
      if (!accessToken) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่พบ Access Token ไม่สามารถเปิดไฟล์ได้",
          variant: "destructive",
        });
        return;
      }

      try {
        let fileContentUrl: string;

        // สำหรับ Google Native files (Docs, Sheets, etc.) ที่แปลงเป็น PDF
        if (item.mimeType && item.mimeType.startsWith('application/vnd.google-apps.')) {
          // ใช้ export endpoint สำหรับ Google Docs
          fileContentUrl = `https://www.googleapis.com/drive/v3/files/${item.id}/export?mimeType=application/pdf`;
        } else {
          // ใช้ alt=media endpoint สำหรับไฟล์ทั่วไป
          fileContentUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;
        }

        console.log('Fetching file content from:', fileContentUrl);

        // ดึงเนื้อหาไฟล์โดยตรงจาก Google Drive API
        const response = await fetch(fileContentUrl, {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/pdf' // ระบุว่าเราต้องการ PDF
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching file content:', response.status, errorText);
          toast({
            title: "เกิดข้อผิดพลาดในการเปิดไฟล์",
            description: `ไม่สามารถดึงเนื้อหาไฟล์ได้: ${response.statusText || response.status}`,
            variant: "destructive",
          });
          return;
        }

        // รับเนื้อหาไฟล์เป็น Blob
        const fileBlob = await response.blob();
        const blobUrl = URL.createObjectURL(fileBlob);

        // ส่ง Blob URL และข้อมูล FileItem ไปให้ Dashboard/PDFViewer
        onFileSelect({...item, url: blobUrl});

      } catch (error) {
        console.error('Error in handleItemClick fetching file content:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: `ไม่สามารถเปิดไฟล์ได้: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
    }
  }, [currentPath, onPathChange, onFileSelect, accessToken, toast]);

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

  const handleDelete = async (file: FileItem) => {
    if (!hasPermission('delete')) {
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่มีสิทธิ์ในการลบไฟล์",
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

    try {
      // ยืนยันการลบ
      if (!window.confirm(`คุณต้องการลบไฟล์ "${file.name}" ใช่หรือไม่?`)) {
        return;
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "ลบไฟล์สำเร็จ",
        description: `ลบไฟล์ "${file.name}" เรียบร้อยแล้ว`,
      });

      // รีเฟรชรายการไฟล์
      handleRefresh();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถลบไฟล์ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (!accessToken) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่พบ Access Token กรุณาเข้าสู่ระบบใหม่",
        variant: "destructive",
      });
      return;
    }

    try {
      let downloadLink: string;

      // สำหรับ Google Native files (Docs, Sheets, etc.)
      if (file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.')) {
        // ใช้ export endpoint สำหรับ Google Docs เป็น PDF และเพิ่ม access_token ใน URL
        downloadLink = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf&access_token=${accessToken}`;
      } else {
        // ใช้ webContentLink สำหรับไฟล์ทั่วไป
        // หรือ fallback ไปใช้ alt=media endpoint ถ้า webContentLink ไม่มี
        downloadLink = file.downloadUrl || `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${accessToken}`;
      }

      if (!downloadLink) {
         toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่พบลิงก์ดาวน์โหลดสำหรับไฟล์นี้",
          variant: "destructive",
        });
        return;
      }

      // เปิดลิงก์ดาวน์โหลดในแท็บใหม่ เพื่อให้เบราว์เซอร์จัดการการดาวน์โหลด
      // สำหรับไฟล์ Google Native, การเปิดในแท็บใหม่จะทริกเกอร์การดาวน์โหลด PDF โดยตรง
      window.open(downloadLink, '_blank');

      toast({
        title: "กำลังเริ่มดาวน์โหลด",
        description: `กำลังดาวน์โหลด ${file.name}`,
      });
    } catch (error) {
      console.error('Error preparing download link:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเตรียมลิงก์ดาวน์โหลดได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  const handleView = async (file: FileItem) => {
    if (!hasPermission('view')) {
      toast({
        title: "ไม่มีสิทธิ์",
        description: "คุณไม่มีสิทธิ์ในการดูไฟล์",
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

    try {
      let fileUrl: string;

      // สำหรับ Google Native files (Docs, Sheets, etc.)
      if (file.mimeType && file.mimeType.startsWith('application/vnd.google-apps.')) {
        // ใช้ export endpoint สำหรับ Google Docs
        fileUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=application/pdf&access_token=${accessToken}`;
      } else {
        // ใช้ webViewLink สำหรับไฟล์ทั่วไป
        fileUrl = file.url || '';
      }

      if (!fileUrl) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเปิดไฟล์ได้",
          variant: "destructive",
        });
        return;
      }

      // เปิดไฟล์ในแท็บใหม่
      window.open(fileUrl, '_blank');
      toast({
        title: "เปิดไฟล์",
        description: `เปิด ${file.name} ในแท็บใหม่`,
      });
    } catch (error) {
      console.error('Error opening file:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถเปิดไฟล์ได้: ${error instanceof Error ? error.message : String(error)}`,
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

  // เพิ่มฟังก์ชันสำหรับจัดการการเปลี่ยนชื่อไฟล์ (เปิด prompt)
  const handleRenameFile = (file: FileItem) => {
      if (!hasPermission('rename')) { // Assuming 'rename' permission exists
          toast({
              title: "ไม่มีสิทธิ์",
              description: "คุณไม่มีสิทธิ์ในการเปลี่ยนชื่อไฟล์",
              variant: "destructive",
          });
          return;
      }

      const newName = window.prompt(`เปลี่ยนชื่อไฟล์ "${file.name}" เป็น:`, file.name);
      if (newName !== null && newName.trim() !== '' && newName.trim() !== file.name) {
          renameFile(file.id, newName.trim());
      } else if (newName !== null && newName.trim() === '') {
           toast({
              title: "ข้อผิดพลาด",
              description: "ชื่อไฟล์ใหม่ต้องไม่ว่างเปล่า",
              variant: "destructive",
          });
      }
  };

  const handleShareFolder = async (email: string, role: 'reader' | 'writer') => {
    if (!selectedFolder || !accessToken) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${selectedFolder.id}/permissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: role,
            type: 'user',
            emailAddress: email,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to share folder');
      }

      toast({
        title: "แชร์โฟลเดอร์สำเร็จ",
        description: `แชร์โฟลเดอร์ "${selectedFolder.name}" กับ ${email} แล้ว`,
      });
    } catch (error) {
      console.error('Error sharing folder:', error);
      throw error;
    }
  };

  const renderFileItem = (item: FileItem) => {
    const isFolder = item.type === 'folder';
    const Icon = isFolder ? FolderUp : FileText;

    return (
      <div
        key={item.id}
        className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg cursor-pointer group"
        onClick={() => isFolder ? onPathChange([...currentPath, item.id]) : onFileSelect(item)}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-gray-500" />
          <span className="text-sm">{item.name}</span>
        </div>
        {isFolder && userRole === 'Admin' && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFolder(item);
              setShowShareDialog(true);
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
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
            {searchResults?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{searchQuery !== '' ? 'ไม่พบผลลัพธ์การค้นหา' : (currentPath.length === 0 ? 'ไม่พบข้อมูลใน Root Folder นี้' : 'ไม่พบข้อมูลในโฟลเดอร์นี้')}</p>
              </div>
            ) : (
              searchResults?.map((file) => (
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
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
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

                          {/* ไอคอน View, Download, Delete กลับมาแสดงตรงนี้ */}
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
                            {hasPermission('rename') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameFile(file);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
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
                      </ContextMenuTrigger>

                      <ContextMenuContent>
                        {hasPermission('rename') && (
                          <ContextMenuItem onClick={() => handleRenameFile(file)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Rename
                          </ContextMenuItem>
                        )}
                        {hasPermission('delete') && (
                          <ContextMenuItem onClick={() => handleDelete(file)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </ContextMenuItem>
                        )}
                        {hasPermission('view') && file.url && (
                          <ContextMenuItem onClick={() => handleView(file)}>
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </ContextMenuItem>
                        )}
                        <ContextMenuItem onClick={() => handleDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => {
          setShowShareDialog(false);
          setSelectedFolder(null);
        }}
        onShare={handleShareFolder}
        folderName={selectedFolder?.name || ''}
      />
    </Card>
  );
};