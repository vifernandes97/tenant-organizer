import JSZip from 'jszip';
import { toast } from 'sonner';

interface DownloadFile {
  url: string;
  name: string;
}

export async function downloadPostFilesAsZip(files: DownloadFile[], zipName: string) {
  if (files.length === 0) return;

  const toastId = toast.loading('Preparando download...', { duration: Infinity });

  try {
    const zip = new JSZip();
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      toast.loading(`Baixando arquivo ${i + 1} de ${files.length}...`, { id: toastId });

      try {
        const response = await fetch(file.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        zip.file(file.name, blob);
        successCount++;
      } catch (err) {
        console.warn(`Falha ao baixar ${file.name}:`, err);
      }
    }

    if (successCount === 0) {
      toast.error('Não foi possível baixar nenhum arquivo.', { id: toastId });
      return;
    }

    toast.loading('Gerando ZIP...', { id: toastId });
    const blob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFileName(zipName) + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      successCount === files.length
        ? `${successCount} arquivos baixados com sucesso!`
        : `${successCount} de ${files.length} arquivos baixados.`,
      { id: toastId }
    );
  } catch (err) {
    console.error('Erro ao gerar ZIP:', err);
    toast.error('Erro ao gerar o arquivo ZIP.', { id: toastId });
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function buildZipName(clientName: string, date: Date, channel: string): string {
  const dateStr = date.toISOString().split('T')[0];
  return sanitizeFileName(`${clientName}_${dateStr}_${channel}`);
}

export function getFileNameFromUrl(url: string, index: number): string {
  try {
    const pathname = new URL(url).pathname;
    const name = decodeURIComponent(pathname.split('/').pop() || '');
    if (name && name.includes('.')) return name;
  } catch {}
  return `arquivo_${index + 1}`;
}
