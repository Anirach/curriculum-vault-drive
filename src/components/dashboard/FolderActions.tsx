
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { FolderPlus, Edit, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';
import { FileItem } from './Dashboard';

interface FolderActionsProps {
  currentPath: string[];
  onPathChange: (path: string[]) => void;
  onRefresh: () => void;
}

export const FolderActions = ({ currentPath, onPathChange, onRefresh }: FolderActionsProps) => {
  const { hasPermission } = useUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');

  const canManageFolders = hasPermission('upload'); // Using upload permission for folder management

  const handleCreateFolder = () => {
    if (!canManageFolders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create folders.",
        variant: "destructive",
      });
      return;
    }

    if (!newFolderName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a valid folder name.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would call the Google Drive API
    toast({
      title: "Folder Created",
      description: `"${newFolderName}" has been created successfully.`,
    });

    setNewFolderName('');
    setIsCreateOpen(false);
    onRefresh();
  };

  const handleRenameFolder = () => {
    if (!canManageFolders) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to rename folders.",
        variant: "destructive",
      });
      return;
    }

    if (!renameFolderName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter a valid folder name.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would call the Google Drive API
    toast({
      title: "Folder Renamed",
      description: `Folder has been renamed to "${renameFolderName}".`,
    });

    setRenameFolderName('');
    setIsRenameOpen(false);
    onRefresh();
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

    // In a real app, this would call the Google Drive API
    toast({
      title: "Folder Deleted",
      description: `"${folderName}" has been deleted successfully.`,
    });

    onRefresh();
  };

  const openRenameDialog = (folderName: string) => {
    setSelectedFolder(folderName);
    setRenameFolderName(folderName);
    setIsRenameOpen(true);
  };

  return (
    <div className="flex items-center space-x-2">
      {canManageFolders && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Folder Name</label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Name</label>
              <Input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Enter new name"
                onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder()}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameFolder}>
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const FolderContextMenu = ({ 
  folder, 
  onRename, 
  onDelete 
}: { 
  folder: FileItem; 
  onRename: (name: string) => void; 
  onDelete: (name: string) => void;
  children: React.ReactNode;
}) => {
  const { hasPermission } = useUser();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* This will wrap the folder item */}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {hasPermission('upload') && (
          <ContextMenuItem onClick={() => onRename(folder.name)}>
            <Edit className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
        )}
        {hasPermission('delete') && (
          <ContextMenuItem onClick={() => onDelete(folder.name)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
