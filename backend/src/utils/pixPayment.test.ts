import { describe, it, expect } from 'vitest';
import { generatePixBRCode, formatPixAmount } from './pixPayment';

describe('Pix BR Code Generation', () => {
  it('should generate valid BR Code with CPF key and amount', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'JOAO SILVA',
      amountCents: 5000,
    });

    // Should start with payload format indicator
    expect(brCode).toMatch(/^0002/);
    // Should contain Pix GUI
    expect(brCode).toContain('br.gov.bcb.pix');
    // Should contain the Pix key
    expect(brCode).toContain('12345678901');
    // Should contain amount (50.00)
    expect(brCode).toContain('50.00');
    // Should contain country code BR
    expect(brCode).toContain('BR');
    // Should contain merchant name
    expect(brCode).toContain('JOAO SILVA');
    // Should end with 4-char CRC16
    expect(brCode).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('should generate BR Code without amount (open value)', () => {
    const brCode = generatePixBRCode({
      pixKey: 'email@test.com',
      merchantName: 'MARIA',
    });

    expect(brCode).toContain('email@test.com');
    expect(brCode).not.toMatch(/54\d{2}/); // No amount tag
    expect(brCode).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('should include description when provided', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'JOAO',
      description: 'Pagamento Faz-o-Pix',
    });

    expect(brCode).toContain('Pagamento Faz-o-Pix');
  });

  it('should include txId in additional data', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'JOAO',
      txId: 'FOP123456',
    });

    expect(brCode).toContain('FOP123456');
  });

  it('should truncate merchant name to 25 chars', () => {
    const longName = 'A'.repeat(30);
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: longName,
    });

    // Tag 59 with max 25 chars -> 5925 + 25 A's
    expect(brCode).toContain('5925' + 'A'.repeat(25));
    expect(brCode).not.toContain('A'.repeat(26));
  });

  it('should default city to SAO PAULO', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'TEST',
    });

    expect(brCode).toContain('SAO PAULO');
  });

  it('should use custom city when provided', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'TEST',
      merchantCity: 'RIO DE JANEIRO',
    });

    expect(brCode).toContain('RIO DE JANEIRO');
  });

  it('should handle phone number Pix key', () => {
    const brCode = generatePixBRCode({
      pixKey: '+5511999998888',
      merchantName: 'PEDRO',
      amountCents: 100,
    });

    expect(brCode).toContain('+5511999998888');
    expect(brCode).toContain('1.00');
  });

  it('should handle EVP (random key) Pix key', () => {
    const evp = '123e4567-e89b-12d3-a456-426614174000';
    const brCode = generatePixBRCode({
      pixKey: evp,
      merchantName: 'ANA',
      amountCents: 9999,
    });

    expect(brCode).toContain(evp);
    expect(brCode).toContain('99.99');
  });

  it('should produce different CRC for different amounts', () => {
    const code1 = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'TEST',
      amountCents: 1000,
    });
    const code2 = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'TEST',
      amountCents: 2000,
    });

    const crc1 = code1.slice(-4);
    const crc2 = code2.slice(-4);
    expect(crc1).not.toBe(crc2);
  });

  it('should skip amount tag when amountCents is 0', () => {
    const brCode = generatePixBRCode({
      pixKey: '12345678901',
      merchantName: 'TEST',
      amountCents: 0,
    });

    // Should not have tag 54 (amount)
    expect(brCode).not.toMatch(/54\d{2}\d/);
  });
});

describe('formatPixAmount', () => {
  it('should format cents to BRL currency string', () => {
    expect(formatPixAmount(5000)).toMatch(/R\$\s?50,00/);
  });

  it('should format zero correctly', () => {
    expect(formatPixAmount(0)).toMatch(/R\$\s?0,00/);
  });

  it('should format single cent', () => {
    expect(formatPixAmount(1)).toMatch(/R\$\s?0,01/);
  });
});
