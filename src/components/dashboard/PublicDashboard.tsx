import React, { useState, useEffect, useCallback } from 'react';
import { PDFViewer } from './PDFViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Folder, File, Download, Eye, RefreshCw, GraduationCap, Search, Home, ExternalLink } from 'lucide-react';
import { googleDriveSimple, SimpleFileItem } from '@/services/googleDriveSimple';
import { useNavigate } from 'react-router-dom';

interface PublicDashboardProps {
  defaultDriveUrl?: string;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({ 
  defaultDriveUrl = import.meta.env.VITE_GOOGLE_DRIVE_URL || ''
}) => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<SimpleFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SimpleFileItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Get folder configuration
  const folderConfig = googleDriveSimple.getConfigurationStatus();

  const handleLoadFolder = useCallback(async () => {
    if (!folderConfig.configured) {
      toast({
        title: "⚠️ Configuration Required",
        description: "No Google Drive folder configured. Please check environment variables.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Loading folder information...');
      
      const folderContents = await googleDriveSimple.getPublicFolderContents();
      
      setFiles(folderContents);
      
      toast({
        title: "✅ Folder Ready",
        description: "Click on the folder link below to access all files directly.",
      });

    } catch (error) {
      console.error('❌ Error loading folder:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Unable to access folder";
      
      toast({
        title: "❌ Loading Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, folderConfig.configured]);

  // Load files from the default configured folder on component mount
  useEffect(() => {
    handleLoadFolder();
  }, [handleLoadFolder]);

  const handleFileClick = useCallback((file: SimpleFileItem) => {
    if (file.id === 'embed_view' && folderConfig.folderUrl) {
      // Open the Google Drive folder in a new tab
      window.open(folderConfig.folderUrl, '_blank');
      return;
    }
    
    if (file.type === 'folder') {
      toast({
        title: "📁 Folder Access",
        description: "Click on the main folder link above to browse all folders and files.",
      });
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    }
  }, [folderConfig.folderUrl, toast]);

  const handleDownload = useCallback((file: SimpleFileItem) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    } else {
      toast({
        title: "ℹ️ Download",
        description: "Click on the main folder link to access downloadable files.",
      });
    }
  }, [toast]);

  const formatFileSize = (bytes: string | undefined): string => {
    if (!bytes) return '';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (file: SimpleFileItem) => {
    if (file.type === 'folder') {
      return <Folder className="h-5 w-5 text-blue-500" />;
    }
    if (file.id === 'embed_view') {
      return <ExternalLink className="h-5 w-5 text-green-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header matching admin Dashboard */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">Curriculum Vault Drive</span>
              <span className="text-sm text-gray-500 font-normal">- Public Access</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6">

        {/* Configuration Status Card */}
        {!folderConfig.configured && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      ⚠️ No Google Drive folder configured
                    </p>
                    <p className="text-yellow-700 text-sm mb-3">
                      Please configure a Google Drive folder URL in the environment variables.
                    </p>
                    <p className="text-yellow-700 text-sm">
                      Set VITE_GOOGLE_DRIVE_URL to a public Google Drive folder link.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && folderConfig.configured && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Loading folder information...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Google Drive Folder Access */}
        {folderConfig.configured && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-green-500" />
                Access Curriculum Folder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Click the button below to open the Google Drive folder with all curriculum files:
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(folderConfig.folderUrl!, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Curriculum Folder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLoadFolder}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {/* Embedded folder view */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Or browse files here:</p>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                    <iframe
                      src={folderConfig.embedUrl!}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                      title="Google Drive Folder"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* File Browser and Viewer Layout matching admin Dashboard */}
        <div className="flex h-[calc(100vh-64px)]">
          <div className="flex-1 flex">
            {/* File Browser Section */}
            <Card className="flex-1 mr-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Curriculum Files
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchTerm ? (
                      <>
                        <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No files found matching "{searchTerm}"</p>
                      </>
                    ) : (
                      <>
                        <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No files in this folder</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedFile?.id === file.id ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                        }`}
                        onClick={() => handleFileClick(file)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(file)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              {file.type === 'file' && file.size && (
                                <span>{formatFileSize(file.size)}</span>
                              )}
                              {file.modifiedTime && (
                                <span>
                                  {new Date(file.modifiedTime).toLocaleDateString('en-US')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {file.type === 'file' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(file);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PDF Viewer Section matching admin Dashboard */}
            {selectedFile && selectedFile.type === 'file' && selectedFile.downloadUrl && (
              <PDFViewer 
                file={{
                  id: selectedFile.id,
                  name: selectedFile.name,
                  type: 'file',
                  path: [],
                  url: selectedFile.webViewLink,
                  downloadUrl: selectedFile.downloadUrl,
                  size: selectedFile.size,
                  lastModified: selectedFile.modifiedTime 
                    ? new Date(selectedFile.modifiedTime).toLocaleDateString() 
                    : undefined,
                  mimeType: selectedFile.mimeType
                }} 
                onClose={() => setSelectedFile(null)} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
