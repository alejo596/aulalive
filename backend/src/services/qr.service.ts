import QRCode from 'qrcode';

export class QRService {
  /**
   * Generates a Base64 Data URL for a QR code linking to the live session URL
   */
  static async generateSessionQR(pinCode: string, baseUrl?: string): Promise<string> {
    const host = baseUrl || process.env.CLIENT_URL || 'http://localhost:5173';
    const targetUrl = `${host}/join?pin=${pinCode}`;

    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0b1120',
          light: '#ffffff'
        }
      });
      return dataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback online QR generator URL
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`;
    }
  }
}

