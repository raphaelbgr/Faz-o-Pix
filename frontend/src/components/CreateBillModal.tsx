'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateBillModal({ isOpen, onClose }: CreateBillModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [simplifyDebts, setSimplifyDebts] = useState(false)

  const createBill = useMutation({
    mutationFn: async () => {
      const response = await api.post('/bills', {
        name,
        description: description || undefined,
        simplifyDebts,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success('Conta criada com sucesso!')
      setName('')
      setDescription('')
      setSimplifyDebts(false)
      onClose()
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nova Conta</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            createBill.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da conta *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem para praia"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
              required
              maxLength={255}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descricao (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre a conta..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-pix-50/60 border border-pix-100">
            <input
              type="checkbox"
              id="simplifyDebts"
              checked={simplifyDebts}
              onChange={(e) => setSimplifyDebts(e.target.checked)}
              className="w-4 h-4 rounded text-pix-600 focus:ring-pix-500"
            />
            <label htmlFor="simplifyDebts" className="text-sm text-gray-700">
              <span className="font-medium">Simplificar dividas</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Minimiza o numero de pagamentos necessarios entre participantes
              </p>
            </label>
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
              disabled={!name.trim() || createBill.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createBill.isPending ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
