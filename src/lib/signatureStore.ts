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

// QR signing tokens
const QR_KEY = 'ema_qr_signatures';

export interface QrSignatureToken {
  token: string;
  requestId: string;
  stepId: string;
  approverName: string;
  signatureDataUrl?: string;
  completed: boolean;
}

export function createQrToken(requestId: string, stepId: string, approverName: string): string {
  const token = Math.random().toString(36).substring(2, 10);
  const data = getQrTokens();
  data[token] = { token, requestId, stepId, approverName, completed: false };
  localStorage.setItem(QR_KEY, JSON.stringify(data));
  return token;
}

export function getQrToken(token: string): QrSignatureToken | null {
  const data = getQrTokens();
  return data[token] || null;
}

export function completeQrToken(token: string, signatureDataUrl: string): void {
  const data = getQrTokens();
  if (data[token]) {
    data[token].signatureDataUrl = signatureDataUrl;
    data[token].completed = true;
    localStorage.setItem(QR_KEY, JSON.stringify(data));
    // Notify other tabs
    const bc = new BroadcastChannel('ema_qr_signing');
    bc.postMessage({ token, signatureDataUrl });
    bc.close();
  }
}

function getQrTokens(): Record<string, QrSignatureToken> {
  try {
    return JSON.parse(localStorage.getItem(QR_KEY) || '{}');
  } catch {
    return {};
  }
}
