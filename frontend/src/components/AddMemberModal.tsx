'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
}

const IDENTIFIER_TYPES = [
  { value: 'PIX_CPF', label: 'CPF' },
  { value: 'PIX_CNPJ', label: 'CNPJ' },
  { value: 'PIX_EMAIL', label: 'E-mail (PIX)' },
  { value: 'PIX_PHONE', label: 'Telefone (PIX)' },
  { value: 'PIX_EVP', label: 'Chave aleatoria (EVP)' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PHONE', label: 'Telefone' },
] as const

export function AddMemberModal({ isOpen, onClose, billId }: AddMemberModalProps) {
  const queryClient = useQueryClient()
  const [identifierType, setIdentifierType] = useState<string>('PIX_EMAIL')
  const [identifierValue, setIdentifierValue] = useState('')
  const [displayName, setDisplayName] = useState('')

  const addMember = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/bills/${billId}/members`, {
        identifierType,
        identifierValue,
        displayName: displayName || undefined,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      toast.success('Participante adicionado!')
      setIdentifierValue('')
      setDisplayName('')
      onClose()
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Adicionar Participante</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMember.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de identificador *
            </label>
            <select
              value={identifierType}
              onChange={(e) => setIdentifierType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
            >
              {IDENTIFIER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor do identificador *
            </label>
            <input
              type="text"
              value={identifierValue}
              onChange={(e) => setIdentifierValue(e.target.value)}
              placeholder={
                identifierType === 'PIX_CPF' ? '000.000.000-00' :
                identifierType === 'PIX_EMAIL' || identifierType === 'EMAIL' ? 'email@exemplo.com' :
                identifierType === 'PIX_PHONE' || identifierType === 'PHONE' ? '(11) 99999-9999' :
                'Valor do identificador'
              }
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome de exibicao (opcional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como essa pessoa sera exibida"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!identifierValue.trim() || addMember.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addMember.isPending ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
