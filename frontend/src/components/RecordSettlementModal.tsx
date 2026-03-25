'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/utils/validation'

interface Participant {
  id: string
  displayName: string
}

interface RecordSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  participants: Participant[]
}

const METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'OTHER', label: 'Outro' },
] as const

export function RecordSettlementModal({ isOpen, onClose, billId, participants }: RecordSettlementModalProps) {
  const queryClient = useQueryClient()
  const [fromParticipantId, setFromParticipantId] = useState(participants[0]?.id || '')
  const [toParticipantId, setToParticipantId] = useState(participants[1]?.id || '')
  const [amountStr, setAmountStr] = useState('')
  const [method, setMethod] = useState<string>('PIX')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')

  const amountCents = Math.round(parseFloat(amountStr.replace(',', '.') || '0') * 100)

  const recordSettlement = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/bills/${billId}/settlements`, {
        fromParticipantId,
        toParticipantId,
        amountCents,
        method,
        reference: reference || undefined,
        note: note || undefined,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      toast.success('Pagamento registrado!')
      setAmountStr('')
      setReference('')
      setNote('')
      onClose()
    },
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Registrar Pagamento</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            recordSettlement.mutate()
          }}
          className="space-y-4"
        >
          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quem pagou? *</label>
            <select
              value={fromParticipantId}
              onChange={(e) => setFromParticipantId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quem recebeu? *</label>
            <select
              value={toParticipantId}
              onChange={(e) => setToParticipantId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
            >
              {participants.filter((p) => p.id !== fromParticipantId).map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9,\.]/g, ''))}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition text-lg font-semibold"
                required
              />
            </div>
            {amountCents > 0 && (
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(amountCents)}</p>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metodo *</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethod(value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                    method === value
                      ? 'bg-pix-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* PIX Reference */}
          {method === 'PIX' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia PIX (opcional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ID da transacao PIX"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
                maxLength={255}
              />
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observacao (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota adicional"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
              maxLength={1000}
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
              disabled={
                amountCents <= 0 ||
                fromParticipantId === toParticipantId ||
                recordSettlement.isPending
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {recordSettlement.isPending ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
