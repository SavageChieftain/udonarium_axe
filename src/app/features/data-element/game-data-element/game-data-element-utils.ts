export function escapeHtml(text: string | number): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function isUrlText(text: string | number): boolean {
  if (typeof text !== 'string') return false;
  return text.startsWith('https://') || text.startsWith('http://');
}
