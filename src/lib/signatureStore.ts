const STORAGE_KEY = 'ema_saved_signatures';

export function getSavedSignature(userId: string): string | null {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return data[userId] || null;
  } catch {
    return null;
  }
}

export function saveSignature(userId: string, dataUrl: string): void {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    data[userId] = dataUrl;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}
