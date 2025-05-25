import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { FileBrowser } from './FileBrowser';
import { PDFViewer } from './PDFViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string[];
  url?: string;
  size?: string;
  lastModified?: string;
}

interface GDriveFile {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: string;
  modifiedTime?: string;
}

export const Dashboard = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [driveUrl, setDriveUrl] = useState<string>('https://drive.google.com/drive/folders/1RkqDZwaOuBT1V-UyUF1ujaagTYwy4oTj?usp=sharing');
  const [showConfig, setShowConfig] = useState(false);
  const [inputUrl, setInputUrl] = useState(driveUrl);
  const [clientId, setClientId] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<'Admin' | 'Viewer'>('Viewer');
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // mock: สมมติว่า hierarchy เป็น array ของ FileItem (folder)
  const [rootFolders, setRootFolders] = useState<FileItem[]>([]);

  useEffect(() => {
    // Auto login: ดึง accessToken/userEmail/userRole จาก localStorage ถ้ามี
    const storedToken = localStorage.getItem('accessToken');
    const storedEmail = localStorage.getItem('userEmail');
    const storedRole = localStorage.getItem('userRole');
    const savedDriveUrl = localStorage.getItem('driveUrl');
    const savedClientId = localStorage.getItem('clientId');
    if (storedToken && storedEmail && storedRole) {
      setAccessToken(storedToken);
      setUserEmail(storedEmail);
      setUserRole(storedRole as 'Admin' | 'Viewer');
    }
    if (savedDriveUrl) {
      setDriveUrl(savedDriveUrl);
      setInputUrl(savedDriveUrl);
    }
    if (savedClientId) {
      setClientId(savedClientId);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const tokenMatch = hash.match(/access_token=([^&]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
        // เรียก Google API เพื่อดึง user email
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            const email = data.email;
            setUserEmail(email);
            localStorage.setItem('userEmail', email);
            let role: 'Admin' | 'Viewer' = 'Viewer';
            if (email === 'anirach.m@fitm.kmutnb.ac.th') {
              setUserRole('Admin');
              role = 'Admin';
            } else {
              setUserRole('Viewer');
            }
            localStorage.setItem('userRole', role);
            // หลัง login สำเร็จ กลับไป Dashboard (ไม่ต้องปิด Dialog อัตโนมัติ)
            window.location.hash = '';
          })
          .catch(() => { alert('ไม่สามารถดึงข้อมูลผู้ใช้ได้'); });
      }
    }
  }, []);

  useEffect(() => {
    // Extract folderId จาก driveUrl
    const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = match ? match[1] : null;

    if (!folderId) {
      setRootFolders([]);
      return;
    }

    // Fetch data from Google Drive API if accessToken is available
    if (accessToken) {
      fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Google Drive API error');
          return res.json();
        })
        .then(data => {
          if (!data.files || !Array.isArray(data.files)) {
            setRootFolders([]);
            return;
          }
          const items = (data.files as any[]).map((item) => ({
            id: item.id,
            name: item.name,
            type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file' as 'folder' | 'file',
            path: [item.name], // This path structure needs refinement for subfolders
            url: item.mimeType !== 'application/vnd.google-apps.folder' ? `https://drive.google.com/uc?id=${item.id}&export=download` : undefined,
            size: item.size,
            lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
          }));
          setRootFolders(items);
        })
        .catch((e) => {
          console.error('Error fetching root folders from Google Drive:', e);
          setRootFolders([]);
          alert('ไม่สามารถดึงข้อมูลจาก Google Drive ได้ กรุณาตรวจสอบ URL และสิทธิ์การเข้าถึง');
        });
    } else {
      // Fallback to mock scraper if no accessToken (or for testing)
      fetch(`https://gdrive-folder-scraper.api.dev/folder/${folderId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.files || !Array.isArray(data.files)) {
            setRootFolders([]);
            return;
          }
          const items = (data.files as any[]).map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type === 'folder' ? 'folder' : 'file' as 'folder' | 'file',
            path: [item.name],
            url: item.type === 'file' ? `https://drive.google.com/uc?id=${item.id}&export=download` : undefined,
            size: item.size,
            lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
          }));
          setRootFolders(items);
        })
        .catch(() => setRootFolders([]));
    }
  }, [driveUrl, accessToken]); // Added accessToken as a dependency

  // ฟังก์ชันสำหรับเริ่ม OAuth flow
  const handleGoogleLogin = () => {
    if (!clientId) {
      alert('กรุณากรอก Google OAuth Client ID');
      return;
    }
    const redirectUri = window.location.origin;
    const scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true`;
    window.open(authUrl, '_blank', 'width=500,height=600');
  };

  // ฟังก์ชันสำหรับบันทึก Drive URL (admin เท่านั้น)
  const handleSaveDriveUrl = () => {
    localStorage.setItem('driveUrl', inputUrl);
    localStorage.setItem('clientId', clientId);
    setDriveUrl(inputUrl);
    setClientId(clientId);
    setShowConfig(false);
    // trigger useEffect [driveUrl] เพื่อรีเฟรช rootFolders
  };

  // ฟังก์ชันสำหรับทดสอบการเข้าถึง Google Drive
  const handleTestAccess = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // ดึง folderId จาก inputUrl
      const match = inputUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = match ? match[1] : null;
      if (!folderId) {
        setTestResult('❌ ไม่พบ folderId ใน URL');
        setIsTesting(false);
        return;
      }
      if (!accessToken) {
        setTestResult('❌ กรุณา Login with Google ก่อน');
        setIsTesting(false);
        return;
      }
      // เรียก Google Drive API
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        setTestResult('❌ ไม่สามารถเข้าถึง Google Drive ได้');
        setIsTesting(false);
        return;
      }
      const data = await res.json();
      setTestResult(`✅ เข้าถึงได้: พบ ${data.files?.length || 0} ไฟล์/โฟลเดอร์`);
    } catch (e) {
      setTestResult('❌ เกิดข้อผิดพลาดขณะทดสอบ');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onConfigDrive={() => setShowConfig(true)} />
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตั้งค่า Google Drive URL</DialogTitle>
          </DialogHeader>
          <Input value={inputUrl} onChange={e => setInputUrl(e.target.value)} placeholder="Google Drive Folder URL" />
          <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Google OAuth Client ID" className="mt-2" />
          <div className="flex items-center space-x-2 mt-2">
            <Button variant="secondary" onClick={handleGoogleLogin}>Login with Google</Button>
            <Button variant="outline" onClick={handleTestAccess} disabled={isTesting}>
              {isTesting ? 'กำลังทดสอบ...' : 'Test Access'}
            </Button>
          </div>
          {testResult && (
            <div className="mt-2 text-sm">
              {testResult}
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveDriveUrl}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex h-[calc(100vh-64px)]">
        <div className="flex-1 flex">
          <FileBrowser 
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onFileSelect={setSelectedFile}
            rootFolders={rootFolders}
            userRole={userRole}
            accessToken={accessToken}
          />
          {selectedFile && selectedFile.type === 'file' && (
            <PDFViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
          )}
        </div>
      </div>
    </div>
  );
};
