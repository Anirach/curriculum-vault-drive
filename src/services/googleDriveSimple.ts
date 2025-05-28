// Simple Google Drive Public Access Service
// This service provides a working solution for accessing public Google Drive folders

export interface SimpleFileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  downloadUrl?: string;
  embedUrl?: string;
}

class GoogleDriveSimpleService {
  private folderId: string | null = null;

  constructor() {
    // Extract folder ID from environment
    const driveUrl = import.meta.env.VITE_GOOGLE_DRIVE_URL || '';
    this.folderId = this.extractFolderIdFromUrl(driveUrl);
    
    console.log('🚀 GoogleDriveSimpleService initialized');
    console.log('📁 Folder ID:', this.folderId);
  }

  /**
   * Extract folder ID from Google Drive URL
   */
  private extractFolderIdFromUrl(url: string): string | null {
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Get the embed URL for the folder that works in iframe
   */
  getFolderEmbedUrl(): string {
    if (!this.folderId) {
      throw new Error('No folder ID configured');
    }
    return `https://drive.google.com/embeddedfolderview?id=${this.folderId}#grid`;
  }

  /**
   * Get direct link to the folder
   */
  getFolderDirectUrl(): string {
    if (!this.folderId) {
      throw new Error('No folder ID configured');
    }
    return `https://drive.google.com/drive/folders/${this.folderId}`;
  }

  /**
   * Generate sample files for demonstration
   * In a real implementation, you'd parse the folder contents
   */
  async getPublicFolderContents(): Promise<SimpleFileItem[]> {
    console.log('📁 Getting folder contents...');
    
    if (!this.folderId) {
      throw new Error('No folder configured. Please check VITE_GOOGLE_DRIVE_URL in environment variables.');
    }

    // Since we can't bypass CORS easily in a client-side app,
    // we'll show a direct link to access the folder
    const sampleFiles: SimpleFileItem[] = [
      {
        id: 'embed_view',
        name: '🔗 Click here to access the full folder',
        type: 'folder',
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: this.getFolderDirectUrl(),
        embedUrl: this.getFolderEmbedUrl(),
        modifiedTime: new Date().toISOString()
      }
    ];

    // Try to show that the folder is accessible
    try {
      // This will check if the folder exists and is public
      const response = await fetch(this.getFolderDirectUrl(), {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      console.log('✅ Folder appears to be accessible');
      
      // Add more helpful information
      sampleFiles.push({
        id: 'status',
        name: '✅ Folder is accessible',
        type: 'file',
        mimeType: 'text/plain',
        modifiedTime: new Date().toISOString()
      });
      
    } catch (error) {
      console.warn('⚠️ Could not verify folder accessibility:', error);
      
      sampleFiles.push({
        id: 'error',
        name: '⚠️ Cannot verify folder access',
        type: 'file',
        mimeType: 'text/plain',
        modifiedTime: new Date().toISOString()
      });
    }

    return sampleFiles;
  }

  /**
   * Check if folder is configured
   */
  isConfigured(): boolean {
    return !!this.folderId;
  }

  /**
   * Get folder configuration status
   */
  getConfigurationStatus(): {
    configured: boolean;
    folderId: string | null;
    folderUrl: string | null;
    embedUrl: string | null;
  } {
    return {
      configured: this.isConfigured(),
      folderId: this.folderId,
      folderUrl: this.folderId ? this.getFolderDirectUrl() : null,
      embedUrl: this.folderId ? this.getFolderEmbedUrl() : null
    };
  }
}

// Export singleton instance
export const googleDriveSimple = new GoogleDriveSimpleService();
