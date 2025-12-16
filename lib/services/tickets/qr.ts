import QRCode from 'qrcode'
import { verifyQRCode } from '@/lib/security/crypto'

export interface QRCodeData {
  signature: string
  ticketNumber: string
}

/**
 * Generate QR code image from signature
 */
export async function generateQRCodeImage(signature: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(signature, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    })
    return qrDataUrl
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`)
  }
}

/**
 * Generate QR code SVG
 */
export async function generateQRCodeSVG(signature: string): Promise<string> {
  try {
    const qrSvg = await QRCode.toString(signature, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    })
    return qrSvg
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error}`)
  }
}

/**
 * Verify QR code signature and extract payload
 */
export async function verifyQRCodeSignature(signature: string) {
  try {
    const payload = await verifyQRCode(signature)
    return payload
  } catch (error) {
    throw new Error('Invalid QR code signature')
  }
}

