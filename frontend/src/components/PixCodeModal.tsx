'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/utils/validation'

interface PixCodeModalProps {
  isOpen: boolean
  onClose: () => void
  brCode: string
  from: string
  to: string
  amountCents: number
  pixKey?: string
}

export function PixCodeModal({ isOpen, onClose, brCode, from, to, amountCents, pixKey }: PixCodeModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(brCode)
      setCopied(true)
      toast.success('Código Pix copiado!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = brCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      toast.success('Código Pix copiado!')
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-modal w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pagar com Pix</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {from} pagando para {to}
        </p>

        {/* Amount */}
        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-pix-700">{formatCurrency(amountCents)}</p>
        </div>

        {/* Pix Key Info */}
        {pixKey && (
          <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Chave Pix</p>
            <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">{pixKey}</p>
          </div>
        )}

        {/* BR Code (Copia e Cola) */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pix Copia e Cola</p>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 max-h-24 overflow-y-auto">
            <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all leading-relaxed">
              {brCode}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCopy}
            className={`w-full px-4 py-3 rounded-xl font-medium text-sm transition ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-pix-600 text-white hover:bg-pix-700'
            }`}
          >
            {copied ? 'Copiado!' : 'Copiar Código Pix'}
          </button>

          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            Cole este código no app do seu banco para realizar o pagamento Pix
          </p>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl btn-secondary text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
