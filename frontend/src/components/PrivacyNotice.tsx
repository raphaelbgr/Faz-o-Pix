'use client'

import { useState } from 'react'

interface PrivacyNoticeProps {
  onClose: () => void
}

export function PrivacyNotice({ onClose }: PrivacyNoticeProps) {
  const [showDetails, setShowDetails] = useState(false)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
      onClick={handleOverlayClick}
    >
      <div className="glass-card max-w-2xl max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[hsl(var(--pix-primary))] rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">Proteção de Dados - LGPD</h3>
            </div>
            <button
              onClick={onClose}
              className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="text-sm text-[hsl(var(--foreground-secondary))] space-y-3">
            <p>
              O <strong>Faz-o-Pix</strong> está em <strong>conformidade total com a LGPD</strong> (Lei Geral de Proteção de Dados Pessoais - Lei 13.709/2018).
            </p>

            <div className="glass-card p-3 bg-[hsl(var(--pix-primary)_/_0.05)] border-[hsl(var(--pix-primary)_/_0.2)]">
              <h4 className="font-medium text-[hsl(var(--pix-primary))] mb-2">🔒 Seus dados estão seguros:</h4>
              <ul className="text-xs space-y-1 text-[hsl(var(--foreground-secondary))]">
                <li>• Identificadores PIX criptografados</li>
                <li>• Senhas protegidas com Argon2id</li>
                <li>• Dados nunca compartilhados com terceiros</li>
                <li>• Servidor nacional (Brasil)</li>
              </ul>
            </div>

            {showDetails && (
              <div className="space-y-2 text-xs glass-card p-3">
                <p><strong>Dados coletados:</strong> Nome, identificadores PIX (CPF/email/telefone), informações de gastos</p>
                <p><strong>Finalidade:</strong> Divisão de contas e cálculo de valores entre participantes</p>
                <p><strong>Base legal:</strong> Consentimento (Art. 7º, I da LGPD)</p>
                <p><strong>Seus direitos:</strong> Acesso, correção, portabilidade e eliminação dos dados</p>
                <p><strong>Contato DPO:</strong> privacidade@fazopix.com.br</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] text-sm font-medium transition-colors"
            >
              {showDetails ? '↑ Menos detalhes' : '↓ Ver mais detalhes sobre LGPD'}
            </button>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-[hsl(var(--pix-primary))] text-white py-2 px-4 rounded-md hover:bg-[hsl(var(--pix-hover))] text-sm font-medium transition-colors"
            >
              Aceito e Concordo
            </button>
          </div>

          <p className="text-xs text-[hsl(var(--foreground-muted))] mt-3 text-center">
            Ao continuar, você consente com o tratamento dos seus dados conforme nossa{' '}
            <a href="/privacidade" className="text-[hsl(var(--pix-primary))] hover:underline transition-colors">
              Política de Privacidade
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}