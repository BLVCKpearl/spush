import QRCode from 'qrcode';

export async function generateQRCodeDataURL(url: string, size: number = 256): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

export async function generateQRCodeBlob(url: string, size: number = 512): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate QR code blob'));
      }
    }, 'image/png');
  });
}

export function getTableQRUrl(venueSlug: string, qrToken: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/v/${venueSlug}?t=${qrToken}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadQRCode(venueSlug: string, qrToken: string, label: string) {
  const url = getTableQRUrl(venueSlug, qrToken);
  const blob = await generateQRCodeBlob(url, 512);
  const safeLabel = label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  downloadBlob(blob, `qr-${safeLabel}.png`);
}
