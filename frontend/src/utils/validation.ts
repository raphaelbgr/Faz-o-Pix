export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
  }
  return value
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }
  return value
}

export function formatCurrency(cents: number): string {
  const reais = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais)
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.')
  const reais = parseFloat(cleaned)
  if (isNaN(reais)) {
    return 0
  }
  return Math.round(reais * 100)
}

export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]!) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned[9]!)) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]!) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned[10]!)) return false
  
  return true
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')
  
  if (cleaned.length !== 14) return false
  if (/^(\d)\1+$/.test(cleaned)) return false
  
  // Validate first check digit
  let sum = 0
  let weight = 5
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]!) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(cleaned[12]!)) return false
  
  // Validate second check digit
  sum = 0
  weight = 6
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]!) * weight
    weight = weight === 2 ? 9 : weight - 1
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (digit !== parseInt(cleaned[13]!)) return false
  
  return true
}

export function detectIdentifierType(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  
  // Email pattern - check first to avoid false positives
  if (value.includes('@') && value.includes('.')) {
    return 'email'
  }
  
  // UUID/EVP pattern (with or without hyphens) - check before numeric patterns
  const uuidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?4[0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12}$/i
  if (uuidPattern.test(value.replace(/-/g, ''))) {
    return 'evp'
  }
  
  // CPF pattern (11 digits) - validate actual CPF
  if (cleaned.length === 11) {
    // Check if it's a valid CPF by calling our validation function
    if (validateCPF(cleaned)) {
      return 'cpf'
    }
    // If it's 11 digits but not a valid CPF, it might be a phone
    if (/^[1-9]{2}/.test(cleaned)) {
      return 'phone'
    }
  }
  
  // CNPJ pattern (14 digits) - validate actual CNPJ
  if (cleaned.length === 14) {
    // Check if it's a valid CNPJ by calling our validation function
    if (validateCNPJ(cleaned)) {
      return 'cnpj'
    }
  }
  
  // Phone pattern (10-11 digits starting with area code)
  if (cleaned.length >= 10 && cleaned.length <= 11 && /^[1-9]{2}/.test(cleaned)) {
    return 'phone'
  }
  
  // For partial entries, provide hints based on length
  if (cleaned.length >= 9 && cleaned.length < 11) {
    return 'cpf' // Partial CPF
  }
  
  if (cleaned.length >= 12 && cleaned.length < 14) {
    return 'cnpj' // Partial CNPJ
  }
  
  return ''
}

// Brazilian timezone utilities
export function formatDateTimeBrazilian(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj)
}

export function formatDateBrazilian(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

export function formatTimeBrazilian(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj)
}

export function getBrazilianTime(): Date {
  // Create a date in Brazilian timezone
  const now = new Date()
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const brazilTime = new Date(utc + (-3 * 3600000)) // BRT is UTC-3
  return brazilTime
}

export function formatRelativeTimeBrazilian(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = getBrazilianTime()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'agora há pouco'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `há ${hours} hora${hours > 1 ? 's' : ''}`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `há ${days} dia${days > 1 ? 's' : ''}`
  } else {
    return formatDateBrazilian(dateObj)
  }
}

export function normalizeIdentifier(value: string, type: string): string {
  switch (type) {
    case 'cpf':
    case 'cnpj':
      // Remove all non-digits
      return value.replace(/\D/g, '')
    
    case 'phone':
      // Remove non-digits and add Brazilian country code if needed
      const phone = value.replace(/\D/g, '')
      if (phone.length === 10 || phone.length === 11) {
        return `+55${phone}`
      }
      return phone
    
    case 'email':
      // Convert to lowercase and trim
      return value.toLowerCase().trim()
    
    case 'evp':
      // Ensure standard UUID format with hyphens
      const uuid = value.toLowerCase().replace(/-/g, '')
      if (uuid.length === 32) {
        return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`
      }
      return value.toLowerCase()
    
    default:
      return value
  }
}

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return value
}