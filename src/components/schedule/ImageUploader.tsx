import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, X, GripVertical, Play, Film } from 'lucide-react';
import { toast } from 'sonner';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

interface MediaFile extends File {
  mediaType?: 'image' | 'video';
}

interface ExistingMedia {
  id: string;
  image_url: string;
  media_type?: string;
  alt_text?: string | null;
}

interface MediaUploaderProps {
  images: File[];
  existingImages?: ExistingMedia[];
  onImagesChange: (images: File[]) => void;
  onExistingImageRemove?: (id: string) => void;
  onAltTextChange?: (id: string, altText: string) => void;
  maxImages?: number;
  showAltText?: boolean;
}

export function ImageUploader({
  images,
  existingImages = [],
  onImagesChange,
  onExistingImageRemove,
  onAltTextChange,
  maxImages = 10,
  showAltText = false,
}: MediaUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const totalImages = images.length + existingImages.length;

  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith('video/');
  };

  const isVideoUrl = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const handleFileChange = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newFiles = Array.from(files).filter((file) => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
          toast.error(`${file.name} não é uma imagem ou vídeo válido`);
          return false;
        }
        
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        const maxSizeMB = maxSize / (1024 * 1024);
        
        if (file.size > maxSize) {
          toast.error(`${file.name} excede ${maxSizeMB}MB`);
          return false;
        }
        return true;
      });

      const available = maxImages - totalImages;
      if (newFiles.length > available) {
        toast.error(`Máximo de ${maxImages} mídias permitido`);
        newFiles.splice(available);
      }

      onImagesChange([...images, ...newFiles]);
    },
    [images, totalImages, maxImages, onImagesChange]
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

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
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
        onClick={() => document.getElementById('media-upload')?.click()}
      >
        <input
          id="media-upload"
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <div className="flex items-center gap-2 mb-2">
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
          <Film className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Arraste imagens ou vídeos, ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground">
          {totalImages}/{maxImages} mídias • Imagens até 10MB • Vídeos até 50MB
        </p>
      </div>

      {/* Media Previews */}
      {(existingImages.length > 0 || images.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {/* Existing Media */}
          {existingImages.map((media) => {
            const isVideo = media.media_type === 'video' || isVideoUrl(media.image_url);
            return (
              <div key={media.id} className="group relative">
                <div className="aspect-square relative">
                  {isVideo ? (
                    <div className="h-full w-full rounded-md bg-muted flex items-center justify-center">
                      <video
                        src={media.image_url}
                        className="h-full w-full rounded-md object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="rounded-full bg-black/60 p-2">
                          <Play className="h-4 w-4 text-white" fill="white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media.image_url}
                      alt={media.alt_text || ''}
                      className="h-full w-full rounded-md object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExistingImageRemove?.(media.id);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute left-1 top-1 cursor-grab rounded bg-black/50 p-0.5">
                    <GripVertical className="h-3 w-3 text-white" />
                  </div>
                  {isVideo && (
                    <div className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      Vídeo
                    </div>
                  )}
                </div>
                {showAltText && (
                  <Input
                    type="text"
                    placeholder="Alt text..."
                    value={media.alt_text || ''}
                    onChange={(e) => onAltTextChange?.(media.id, e.target.value)}
                    className="mt-1 h-7 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            );
          })}

          {/* New Media */}
          {images.map((file, index) => {
            const isVideo = isVideoFile(file);
            return (
              <div key={`new-${index}`} className="group relative">
                <div className="aspect-square relative">
                  {isVideo ? (
                    <div className="h-full w-full rounded-md bg-muted flex items-center justify-center">
                      <video
                        src={URL.createObjectURL(file)}
                        className="h-full w-full rounded-md object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="rounded-full bg-black/60 p-2">
                          <Play className="h-4 w-4 text-white" fill="white" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="h-full w-full rounded-md object-cover"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute right-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {isVideo ? 'Vídeo Novo' : 'Novo'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
