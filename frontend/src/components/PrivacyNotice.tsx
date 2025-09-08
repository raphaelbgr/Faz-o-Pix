'use client'

import { useState } from 'react'

export function PrivacyNotice() {
  const [isVisible, setIsVisible] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl max-h-96 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-pix-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Proteção de Dados - LGPD</h3>
          </div>

          <div className="text-sm text-gray-700 space-y-3">
            <p>
              O <strong>Faz-o-Pix</strong> está em <strong>conformidade total com a LGPD</strong> (Lei Geral de Proteção de Dados Pessoais - Lei 13.709/2018).
            </p>

            <div className="bg-pix-50 p-3 rounded-md border border-pix-200">
              <h4 className="font-medium text-pix-900 mb-2">🔒 Seus dados estão seguros:</h4>
              <ul className="text-xs space-y-1 text-pix-800">
                <li>• Identificadores PIX criptografados</li>
                <li>• Senhas protegidas com Argon2id</li>
                <li>• Dados nunca compartilhados com terceiros</li>
                <li>• Servidor nacional (Brasil)</li>
              </ul>
            </div>

            {showDetails && (
              <div className="space-y-2 text-xs bg-gray-50 p-3 rounded">
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
              className="text-pix-600 hover:text-pix-700 text-sm font-medium"
            >
              {showDetails ? '↑ Menos detalhes' : '↓ Ver mais detalhes sobre LGPD'}
            </button>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => setIsVisible(false)}
              className="flex-1 bg-pix-600 text-white py-2 px-4 rounded-md hover:bg-pix-700 text-sm font-medium"
            >
              Aceito e Concordo
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            Ao continuar, você consente com o tratamento dos seus dados conforme nossa{' '}
            <a href="/privacidade" className="text-pix-600 hover:underline">
              Política de Privacidade
            </a>.
          </p>
        </div>
      </div>
    </div>
  )
}