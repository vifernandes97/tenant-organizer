import DOMPurify from 'dompurify';

/**
 * Extracts plain text from HTML content
 * Useful for displaying HTML content (like from TipTap editor) as plain text
 * Uses DOMPurify to sanitize the HTML before parsing to prevent XSS
 */
export function extractPlainText(html: string): string {
  if (!html) return '';
  
  // Sanitize HTML first to prevent XSS, then extract text
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  return sanitized.trim();
}
