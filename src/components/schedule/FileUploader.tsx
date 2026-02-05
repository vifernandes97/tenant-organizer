import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, GripVertical, Play, FileText, FileSpreadsheet, Presentation, FileIcon, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getFileIcon, 
  getFileTypeLabel, 
  formatFileSize, 
  isImageFile, 
  isVideoFile 
} from './FilePreview';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

const ACCEPTED_FILE_TYPES = 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

interface ExistingMedia {
  id: string;
  image_url: string;
  media_type?: string;
  alt_text?: string | null;
}

interface FileUploaderProps {
  files: File[];
  existingFiles?: ExistingMedia[];
  onFilesChange: (files: File[]) => void;
  onExistingFileRemove?: (id: string) => void;
  onAltTextChange?: (id: string, altText: string) => void;
  maxFiles?: number;
  showAltText?: boolean;
}

function getMaxSizeForFile(file: File): number {
  if (file.type.startsWith('video/')) return MAX_VIDEO_SIZE;
  if (file.type.startsWith('image/')) return MAX_IMAGE_SIZE;
  return MAX_DOCUMENT_SIZE;
}

function getMediaTypeForFile(file: File): 'image' | 'video' | 'document' {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  return 'document';
}

export function FileUploader({
  files,
  existingFiles = [],
  onFilesChange,
  onExistingFileRemove,
  onAltTextChange,
  maxFiles = 10,
  showAltText = false,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const totalFiles = files.length + existingFiles.length;

  const handleFileChange = useCallback(
    (inputFiles: FileList | null) => {
      if (!inputFiles) return;

      const newFiles = Array.from(inputFiles).filter((file) => {
        const maxSize = getMaxSizeForFile(file);
        const maxSizeMB = maxSize / (1024 * 1024);
        
        if (file.size > maxSize) {
          toast.error(`${file.name} excede ${maxSizeMB}MB`);
          return false;
        }
        return true;
      });

      const available = maxFiles - totalFiles;
      if (newFiles.length > available) {
        toast.error(`Máximo de ${maxFiles} arquivos permitido`);
        newFiles.splice(available);
      }

      onFilesChange([...files, ...newFiles]);
    },
    [files, totalFiles, maxFiles, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileChange(e.dataTransfer.files);
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onFilesChange(newFiles);
  };

  const renderFilePreview = (
    file: { name: string; url: string; mediaType?: string; size?: number },
    isNew: boolean,
    key: string,
    onRemove: () => void
  ) => {
    const isImage = isImageFile(file.name, file.mediaType);
    const isVideo = isVideoFile(file.name, file.mediaType);
    const Icon = getFileIcon(file.name, file.mediaType);
    const label = getFileTypeLabel(file.name, file.mediaType);

    return (
      <div key={key} className="group relative">
        <div className="aspect-square relative">
          {isImage ? (
            <img
              src={file.url}
              alt=""
              className="h-full w-full rounded-md object-cover"
            />
          ) : isVideo ? (
            <div className="h-full w-full rounded-md bg-muted flex items-center justify-center relative">
              <video src={file.url} className="h-full w-full rounded-md object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-black/60 p-2">
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full w-full rounded-md bg-muted flex flex-col items-center justify-center p-2">
              <Icon className="h-8 w-8 text-muted-foreground mb-1" />
              <span className="text-[10px] font-medium text-muted-foreground text-center line-clamp-2">
                {file.name.length > 12 ? file.name.slice(0, 9) + '...' : file.name}
              </span>
              <span className="text-[9px] text-muted-foreground/70">{label}</span>
              {file.size && (
                <span className="text-[9px] text-muted-foreground/50">{formatFileSize(file.size)}</span>
              )}
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="absolute left-1 top-1 cursor-grab rounded bg-black/50 p-0.5">
            <GripVertical className="h-3 w-3 text-white" />
          </div>
          
          {isNew && (
            <div className="absolute right-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              Novo
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        className={`relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <div className="flex items-center gap-2 mb-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Arraste arquivos ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {totalFiles}/{maxFiles} arquivos • Imagens 10MB • Vídeos 50MB • Docs 25MB
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          PDF, DOCX, XLSX, PPTX, imagens e vídeos
        </p>
      </div>

      {/* File Previews */}
      {(existingFiles.length > 0 || files.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {/* Existing Files */}
          {existingFiles.map((media) => {
            const fileName = media.image_url.split('/').pop() || 'arquivo';
            return renderFilePreview(
              { 
                name: fileName, 
                url: media.image_url, 
                mediaType: media.media_type 
              },
              false,
              media.id,
              () => onExistingFileRemove?.(media.id)
            );
          })}

          {/* New Files */}
          {files.map((file, index) => {
            return renderFilePreview(
              { 
                name: file.name, 
                url: URL.createObjectURL(file), 
                mediaType: getMediaTypeForFile(file),
                size: file.size 
              },
              true,
              `new-${index}`,
              () => removeFile(index)
            );
          })}
        </div>
      )}
    </div>
  );
}

export { getMediaTypeForFile };
