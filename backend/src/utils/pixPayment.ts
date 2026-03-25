/**
 * Pix payment utilities - generates BR Code (EMV QR Code) format strings
 * for Brazilian Pix instant payments.
 *
 * Reference: BACEN Pix BR Code specification
 * Format: EMV Merchant Presented QR Code (TLV encoding)
 */

// TLV (Tag-Length-Value) encoding helper
function tlv(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${tag}${length}${value}`;
}

// CRC16 CCITT-FALSE calculation (required by EMV spec)
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPaymentParams {
  pixKey: string;
  merchantName: string;
  merchantCity?: string;
  amountCents?: number;
  description?: string;
  txId?: string;
}

/**
 * Generates a Pix BR Code "copia e cola" (copy-paste) string.
 * This string can be pasted into any Pix-enabled banking app to initiate payment.
 */
export function generatePixBRCode(params: PixPaymentParams): string {
  const {
    pixKey,
    merchantName,
    merchantCity = 'SAO PAULO',
    amountCents,
    description,
    txId,
  } = params;

  // Payload Format Indicator (tag 00)
  let payload = tlv('00', '01');

  // Merchant Account Information (tag 26)
  // - GUI for Pix (tag 00): br.gov.bcb.pix
  // - Pix Key (tag 01)
  // - Description (tag 02) - optional
  let merchantAccount = tlv('00', 'br.gov.bcb.pix');
  merchantAccount += tlv('01', pixKey);
  if (description) {
    merchantAccount += tlv('02', description.substring(0, 72));
  }
  payload += tlv('26', merchantAccount);

  // Merchant Category Code (tag 52)
  payload += tlv('52', '0000');

  // Transaction Currency (tag 53) - BRL = 986
  payload += tlv('53', '986');

  // Transaction Amount (tag 54) - optional
  if (amountCents && amountCents > 0) {
    const amount = (amountCents / 100).toFixed(2);
    payload += tlv('54', amount);
  }

  // Country Code (tag 58) - BR
  payload += tlv('58', 'BR');

  // Merchant Name (tag 59) - max 25 chars
  payload += tlv('59', merchantName.substring(0, 25));

  // Merchant City (tag 60) - max 15 chars
  payload += tlv('60', merchantCity.substring(0, 15));

  // Additional Data Field (tag 62) - txId
  if (txId) {
    const additionalData = tlv('05', txId.substring(0, 25));
    payload += tlv('62', additionalData);
  }

  // CRC16 placeholder (tag 63) - will be calculated
  payload += '6304';
  const checksum = crc16(payload);
  payload += checksum;

  return payload;
}

/**
 * Formats a Pix amount in cents to a display string in BRL.
 */
export function formatPixAmount(amountCents: number): string {
  return (amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
