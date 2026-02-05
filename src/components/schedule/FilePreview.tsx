import { FileText, FileSpreadsheet, FileIcon, Play, Image as ImageIcon, Presentation } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mediaType?: string;
  className?: string;
}

export function getFileIcon(fileName: string, mediaType?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Check by media type first
  if (mediaType === 'video' || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return Play;
  }
  if (mediaType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return ImageIcon;
  }
  
  // Documents
  if (['pdf'].includes(ext)) {
    return FileText;
  }
  if (['doc', 'docx'].includes(ext)) {
    return FileText;
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return FileSpreadsheet;
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return Presentation;
  }
  
  return FileIcon;
}

export function getFileTypeLabel(fileName: string, mediaType?: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (mediaType === 'video' || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
    return 'Vídeo';
  }
  if (mediaType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'Imagem';
  }
  if (['pdf'].includes(ext)) {
    return 'PDF';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'Word';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'Excel';
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return 'PowerPoint';
  }
  
  return ext.toUpperCase() || 'Arquivo';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(fileName: string, mediaType?: string): boolean {
  if (mediaType === 'image') return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

export function isVideoFile(fileName: string, mediaType?: string): boolean {
  if (mediaType === 'video') return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
}

export function isDocumentFile(fileName: string, mediaType?: string): boolean {
  if (mediaType === 'document') return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext);
}

export function FilePreview({ fileName, fileUrl, fileSize, mediaType, className = '' }: FilePreviewProps) {
  const Icon = getFileIcon(fileName, mediaType);
  const label = getFileTypeLabel(fileName, mediaType);
  const isImage = isImageFile(fileName, mediaType);
  const isVideo = isVideoFile(fileName, mediaType);
  
  // For images and videos, show actual preview
  if (isImage) {
    return (
      <img
        src={fileUrl}
        alt={fileName}
        className={`h-full w-full rounded-md object-cover ${className}`}
      />
    );
  }
  
  if (isVideo) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <video src={fileUrl} className="h-full w-full rounded-md object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/60 p-2">
            <Play className="h-4 w-4 text-white" fill="white" />
          </div>
        </div>
      </div>
    );
  }
  
  // For documents, show icon with file info
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center rounded-md bg-muted p-2 ${className}`}>
      <Icon className="h-6 w-6 text-muted-foreground mb-1" />
      <span className="text-[10px] font-medium text-muted-foreground text-center line-clamp-2">
        {fileName.length > 15 ? fileName.slice(0, 12) + '...' : fileName}
      </span>
      <span className="text-[9px] text-muted-foreground/70">{label}</span>
      {fileSize && (
        <span className="text-[9px] text-muted-foreground/50">{formatFileSize(fileSize)}</span>
      )}
    </div>
  );
}
