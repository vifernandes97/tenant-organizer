/**
 * Extracts plain text from HTML content
 * Useful for displaying HTML content (like from TipTap editor) as plain text
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get text content and clean up whitespace
  return tempDiv.textContent?.trim() || '';
}
