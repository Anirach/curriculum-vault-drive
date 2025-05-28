// Google Drive Public API Service - No OAuth Required
// This service provides access to publicly shared Google Drive folders

export interface PublicFileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  downloadUrl?: string;
  embedUrl?: string;
}

export interface PublicDriveResponse {
  files: PublicFileItem[];
  nextPageToken?: string;
}

interface GoogleApiFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

class GoogleDrivePublicService {
  private apiKey: string;
  private defaultFolderId: string | null;

  constructor() {
    // Get API key from environment
    this.apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
    
    // Extract folder ID from the default URL in environment
    const defaultUrl = import.meta.env.VITE_GOOGLE_DRIVE_URL || '';
    this.defaultFolderId = this.extractFolderIdFromUrl(defaultUrl);
    
    console.log('🏗️ GoogleDrivePublicService initialized');
    console.log('🔑 API Key available:', !!this.apiKey);
    console.log('📁 Default Folder ID:', this.defaultFolderId);
  }

  /**
   * Get files from the default configured folder
   */
  async getDefaultFolderContents(): Promise<PublicFileItem[]> {
    if (!this.defaultFolderId) {
      console.error('❌ No default folder configured in environment variables');
      throw new Error('No default folder configured. Please check VITE_GOOGLE_DRIVE_URL in environment variables.');
    }
    
    return this.getPublicFolderContents(this.defaultFolderId);
  }

  /**
   * Extract folder ID from Google Drive share URL
   */
  extractFolderIdFromUrl(shareUrl: string): string | null {
    console.log('🔗 Extracting folder ID from URL:', shareUrl);
    
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = shareUrl.match(pattern);
      if (match) {
        console.log('✅ Found folder ID:', match[1]);
        return match[1];
      }
    }

    console.warn('❌ Could not extract folder ID from URL');
    return null;
  }

  /**
   * Get files from a public Google Drive folder
   * Uses multiple methods to try to access public folders
   */
  async getPublicFolderContents(folderId: string): Promise<PublicFileItem[]> {
    console.log('📁 Fetching folder contents for ID:', folderId);

    // Method 1: Try Google Drive API without authentication (for public folders)
    console.log('🔑 Trying API access for public folder...');
    const apiFiles = await this.tryApiAccess(folderId);
    if (apiFiles && apiFiles.length > 0) {
      console.log(`✅ Successfully fetched ${apiFiles.length} files via API`);
      return apiFiles;
    }

    // Method 2: Try public folder export methods
    console.log('🌐 Trying public folder export methods...');
    const exportFiles = await this.tryPublicFolderExport(folderId);
    if (exportFiles && exportFiles.length > 0) {
      console.log(`✅ Successfully fetched ${exportFiles.length} files via export`);
      return exportFiles;
    }

    // Method 3: Try embedded folder view parsing
    console.log('📤 Trying embedded folder view...');
    const embedFiles = await this.tryEmbeddedFolderView(folderId);
    if (embedFiles && embedFiles.length > 0) {
      console.log(`✅ Successfully fetched ${embedFiles.length} files via embed`);
      return embedFiles;
    }

    // If all methods fail, throw an error
    console.error('❌ All access methods failed');
    throw new Error('Cannot access the public folder. Please ensure the folder is shared with "Anyone with the link" and has viewer permissions, or contact the administrator.');
  }

  /**
   * Try to access public folder using Google Drive API without authentication
   */
  async tryApiAccess(folderId: string): Promise<PublicFileItem[] | null> {
    try {
      // Method 1: Try with API key (if available)
      if (this.apiKey) {
        console.log('🔑 Trying API with key...');
        const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,parents)&key=${this.apiKey}&orderBy=name`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.files && Array.isArray(data.files) && data.files.length > 0) {
            console.log(`✅ API with key successful: ${data.files.length} files`);
            return this.transformApiResponse(data.files);
          }
        } else {
          console.warn(`⚠️ API with key failed: ${response.status} ${response.statusText}`);
        }
      }

      // Method 2: Try API without key (sometimes works for public folders)
      console.log('🌐 Trying API without key...');
      const publicApiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,parents)&orderBy=name`;
      
      const publicResponse = await fetch(publicApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (publicResponse.ok) {
        const publicData = await publicResponse.json();
        if (publicData.files && Array.isArray(publicData.files) && publicData.files.length > 0) {
          console.log(`✅ Public API successful: ${publicData.files.length} files`);
          return this.transformApiResponse(publicData.files);
        }
      } else {
        console.warn(`⚠️ Public API failed: ${publicResponse.status} ${publicResponse.statusText}`);
      }

      return null;
    } catch (error) {
      console.warn('⚠️ API access failed:', error);
      return null;
    }
  }

  /**
   * Try to get folder contents using public export URLs
   */
  async tryPublicFolderExport(folderId: string): Promise<PublicFileItem[] | null> {
    try {
      console.log('📤 Trying public folder export methods...');
      
      // Method 1: Try RSS feed (sometimes available for public folders)
      try {
        const rssUrl = `https://drive.google.com/feed/folder/${folderId}`;
        console.log('📡 Trying RSS feed:', rssUrl);
        
        const rssResponse = await fetch(rssUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/rss+xml, application/xml, text/xml',
          }
        });
        
        if (rssResponse.ok) {
          const rssText = await rssResponse.text();
          const rssFiles = this.parseRSSForFiles(rssText);
          if (rssFiles && rssFiles.length > 0) {
            console.log(`✅ RSS feed successful: ${rssFiles.length} files`);
            return rssFiles;
          }
        }
      } catch (rssError) {
        console.warn('⚠️ RSS method failed:', rssError);
      }

      // Method 2: Try direct folder access
      try {
        const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
        console.log('🔗 Trying direct folder access:', folderUrl);
        
        const response = await fetch(folderUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (compatible; curriculum-vault-drive)'
          }
        });
        
        if (response.ok) {
          console.log('📄 Got folder HTML, attempting to parse...');
          const htmlContent = await response.text();
          const htmlFiles = this.parseHTMLForFiles(htmlContent, folderId);
          if (htmlFiles && htmlFiles.length > 0) {
            console.log(`✅ HTML parsing successful: ${htmlFiles.length} files`);
            return htmlFiles;
          }
        }
      } catch (directError) {
        console.warn('⚠️ Direct access failed:', directError);
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Public folder export failed:', error);
      return null;
    }
  }

  /**
   * Try embedded folder view to extract file information
   */
  async tryEmbeddedFolderView(folderId: string): Promise<PublicFileItem[] | null> {
    try {
      console.log('📺 Trying embedded folder view...');
      
      const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
      console.log('🔗 Embed URL:', embedUrl);
      
      const response = await fetch(embedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        console.log('📄 Got embed HTML, attempting to parse...');
        
        const files = this.parseHTMLForFiles(html, folderId);
        if (files && files.length > 0) {
          console.log(`✅ Embed parsing successful: ${files.length} files`);
          return files;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Embedded folder view failed:', error);
      return null;
    }
  }

  /**
   * Parse HTML content to extract file information
   */
  private parseHTMLForFiles(html: string, folderId: string): PublicFileItem[] | null {
    try {
      console.log('🔍 Parsing HTML for file information...');
      
      const files: PublicFileItem[] = [];
      
      // Pattern 1: Look for JSON data structures in script tags
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          // Look for file data patterns in JavaScript
          const filePatterns = [
            /\["([a-zA-Z0-9_-]{20,})",\s*"([^"]+)",\s*"([^"]*)",/g,
            /"id":\s*"([a-zA-Z0-9_-]{20,})",\s*"name":\s*"([^"]+)"/g
          ];
          
          for (const pattern of filePatterns) {
            let match;
            while ((match = pattern.exec(script)) !== null) {
              const [, id, name, mimeType] = match;
              if (id && name && id.length > 15) {
                files.push({
                  id: id,
                  name: name,
                  type: mimeType?.includes('folder') ? 'folder' : 'file',
                  mimeType: mimeType || 'application/octet-stream',
                  webViewLink: `https://drive.google.com/file/d/${id}/view`,
                  downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
                  embedUrl: `https://drive.google.com/file/d/${id}/preview`,
                  modifiedTime: new Date().toISOString()
                });
              }
            }
          }
        }
      }
      
      // Pattern 2: Look for file links in HTML
      const linkPattern = /href="\/file\/d\/([a-zA-Z0-9_-]{20,})\/[^"]*"[^>]*>([^<]+)</g;
      let linkMatch;
      while ((linkMatch = linkPattern.exec(html)) !== null) {
        const [, id, name] = linkMatch;
        if (id && name && !files.find(f => f.id === id)) {
          files.push({
            id: id,
            name: name.trim(),
            type: 'file',
            mimeType: 'application/octet-stream',
            webViewLink: `https://drive.google.com/file/d/${id}/view`,
            downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
            embedUrl: `https://drive.google.com/file/d/${id}/preview`,
            modifiedTime: new Date().toISOString()
          });
        }
      }
      
      // Pattern 3: Look for folder links
      const folderPattern = /href="\/drive\/folders\/([a-zA-Z0-9_-]{20,})"[^>]*>([^<]+)</g;
      let folderMatch;
      while ((folderMatch = folderPattern.exec(html)) !== null) {
        const [, id, name] = folderMatch;
        if (id && name && !files.find(f => f.id === id)) {
          files.push({
            id: id,
            name: name.trim(),
            type: 'folder',
            mimeType: 'application/vnd.google-apps.folder',
            webViewLink: `https://drive.google.com/drive/folders/${id}`,
            modifiedTime: new Date().toISOString()
          });
        }
      }
      
      if (files.length > 0) {
        console.log(`✅ Successfully parsed ${files.length} files from HTML`);
        return files;
      }
      
      console.warn('⚠️ No file data found in HTML content');
      return null;
    } catch (error) {
      console.error('❌ Error parsing HTML:', error);
      return null;
    }
  }

  /**
   * Parse RSS feed for file information
   */
  private parseRSSForFiles(rssContent: string): PublicFileItem[] | null {
    try {
      console.log('📡 Parsing RSS content for files...');
      
      const files: PublicFileItem[] = [];
      
      // Parse RSS XML content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rssContent, 'text/xml');
      
      const items = xmlDoc.querySelectorAll('item');
      
      items.forEach((item) => {
        try {
          const title = item.querySelector('title')?.textContent;
          const link = item.querySelector('link')?.textContent;
          const pubDate = item.querySelector('pubDate')?.textContent;
          
          if (title && link) {
            // Extract file ID from link
            const idMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            const id = idMatch ? idMatch[1] : `rss_${Date.now()}_${Math.random()}`;
            
            files.push({
              id: id,
              name: title,
              type: 'file',
              mimeType: 'application/octet-stream',
              webViewLink: link,
              downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
              embedUrl: `https://drive.google.com/file/d/${id}/preview`,
              modifiedTime: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
            });
          }
        } catch (itemError) {
          console.warn('⚠️ Error parsing RSS item:', itemError);
        }
      });
      
      return files.length > 0 ? files : null;
    } catch (error) {
      console.warn('⚠️ Error parsing RSS:', error);
      return null;
    }
  }

  /**
   * Transform API response to our internal format
   */
  private transformApiResponse(files: GoogleApiFile[]): PublicFileItem[] {
    return files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
      downloadUrl: file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`,
      embedUrl: `https://drive.google.com/file/d/${file.id}/preview`,
    }));
  }

  /**
   * Get direct download link for a file
   */
  getFileDownloadUrl(fileId: string): string {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Get embed URL for viewing files (works for PDFs, images, etc.)
   */
  getFileEmbedUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Get view URL for files
   */
  getFileViewUrl(fileId: string): string {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  /**
   * Get embed URL for the entire folder
   */
  getFolderEmbedUrl(folderId: string): string {
    return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
  }

  /**
   * Check if a Google Drive URL is accessible
   */
  async checkIfPublic(shareUrl: string): Promise<boolean> {
    const folderId = this.extractFolderIdFromUrl(shareUrl);
    if (!folderId) return false;

    try {
      // Try to access the folder's embed view
      const embedUrl = this.getFolderEmbedUrl(folderId);
      const response = await fetch(embedUrl, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      console.log('📍 Folder accessibility check completed');
      return true;
    } catch (error) {
      console.error('❌ Error checking folder accessibility:', error);
      return false;
    }
  }

  /**
   * Get the public instructions for making a folder accessible
   */
  getPublicAccessInstructions(): string[] {
    return [
      '1. Open Google Drive and navigate to the folder you want to share',
      '2. Right-click on the folder and select "Share"',
      '3. Click "Change to anyone with the link"',
      '4. Set permission to "Viewer"',
      '5. Click "Copy link" to get the URL',
      '6. Use this URL in the environment configuration'
    ];
  }
}

export const googleDrivePublic = new GoogleDrivePublicService();
