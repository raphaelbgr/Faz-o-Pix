/**
 * Frontend Pix BR Code utilities.
 * Generates EMV QR Code format strings for Brazilian Pix payments.
 */

function tlv(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0')
  return `${tag}${length}${value}`
}

function crc16(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface PixPaymentParams {
  pixKey: string
  merchantName: string
  merchantCity?: string
  amountCents?: number
  description?: string
  txId?: string
}

export function generatePixBRCode(params: PixPaymentParams): string {
  const {
    pixKey,
    merchantName,
    merchantCity = 'SAO PAULO',
    amountCents,
    description,
    txId,
  } = params

  let payload = tlv('00', '01')

  let merchantAccount = tlv('00', 'br.gov.bcb.pix')
  merchantAccount += tlv('01', pixKey)
  if (description) {
    merchantAccount += tlv('02', description.substring(0, 72))
  }
  payload += tlv('26', merchantAccount)

  payload += tlv('52', '0000')
  payload += tlv('53', '986')

  if (amountCents && amountCents > 0) {
    const amount = (amountCents / 100).toFixed(2)
    payload += tlv('54', amount)
  }

  payload += tlv('58', 'BR')
  payload += tlv('59', merchantName.substring(0, 25))
  payload += tlv('60', merchantCity.substring(0, 15))

  if (txId) {
    const additionalData = tlv('05', txId.substring(0, 25))
    payload += tlv('62', additionalData)
  }

  payload += '6304'
  const checksum = crc16(payload)
  payload += checksum

  return payload
}
