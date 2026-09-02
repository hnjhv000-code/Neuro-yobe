/**
 * Helper to generate reliable share URLs that support both root domains and subpath deployments (e.g. GitHub Pages)
 */
export function getShareUrl(paramKey: 'v' | 'c' | 'p' | 'list', paramValue: string): string {
  try {
    const url = new URL(window.location.href);
    // Clear existing params and hash for clean share links
    url.search = `?${paramKey}=${encodeURIComponent(paramValue)}`;
    url.hash = '';
    return url.toString();
  } catch {
    const base = window.location.href.split('?')[0].split('#')[0];
    return `${base}?${paramKey}=${encodeURIComponent(paramValue)}`;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn('Clipboard writeText failed, attempting fallback', e);
  }

  // Fallback for older browsers or restricted contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
