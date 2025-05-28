import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, GraduationCap, Home, ExternalLink } from 'lucide-react';
import { googleDriveSimple } from '@/services/googleDriveSimple';
import { useNavigate } from 'react-router-dom';

interface PublicDashboardProps {
  defaultDriveUrl?: string;
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({ 
  defaultDriveUrl = import.meta.env.VITE_GOOGLE_DRIVE_URL || ''
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
      console.log('🔄 Checking folder accessibility...');
      
      // Just check if the folder is accessible
      await googleDriveSimple.getPublicFolderContents();
      
      toast({
        title: "✅ Folder Ready",
        description: "Google Drive folder is accessible and ready to use.",
      });

    } catch (error) {
      console.error('❌ Error accessing folder:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Unable to access folder";
      
      toast({
        title: "❌ Access Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, folderConfig.configured]);

  // Check folder accessibility on component mount
  useEffect(() => {
    handleLoadFolder();
  }, [handleLoadFolder]);

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

      </div>
    </div>
  );
};
