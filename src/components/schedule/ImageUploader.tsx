import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: File[];
  existingImages?: { id: string; image_url: string }[];
  onImagesChange: (images: File[]) => void;
  onExistingImageRemove?: (id: string) => void;
  maxImages?: number;
}

export function ImageUploader({
  images,
  existingImages = [],
  onImagesChange,
  onExistingImageRemove,
  maxImages = 10,
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const totalImages = images.length + existingImages.length;

  const handleFileChange = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newFiles = Array.from(files).filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          return false;
        }
        return true;
      });

      const available = maxImages - totalImages;
      if (newFiles.length > available) {
        toast.error(`Máximo de ${maxImages} imagens permitido`);
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
        onClick={() => document.getElementById('image-upload')?.click()}
      >
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arraste imagens ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground">
          {totalImages}/{maxImages} imagens
        </p>
      </div>

      {/* Image Previews */}
      {(existingImages.length > 0 || images.length > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {/* Existing Images */}
          {existingImages.map((img) => (
            <div key={img.id} className="group relative aspect-square">
              <img
                src={img.image_url}
                alt=""
                className="h-full w-full rounded-md object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExistingImageRemove?.(img.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute left-1 top-1 cursor-grab rounded bg-black/50 p-0.5">
                <GripVertical className="h-3 w-3 text-white" />
              </div>
            </div>
          ))}

          {/* New Images */}
          {images.map((file, index) => (
            <div key={`new-${index}`} className="group relative aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="h-full w-full rounded-md object-cover"
              />
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
                Novo
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
