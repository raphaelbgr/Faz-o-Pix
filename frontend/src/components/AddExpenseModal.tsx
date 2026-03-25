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

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  billId: string
  participants: Participant[]
}

type SplitType = 'EQUAL' | 'PERCENT' | 'SHARES'

interface SplitEntry {
  participantId: string
  included: boolean
  shareValue: number
}

export function AddExpenseModal({ isOpen, onClose, billId, participants }: AddExpenseModalProps) {
  const queryClient = useQueryClient()
  const [payerParticipantId, setPayerParticipantId] = useState(participants[0]?.id || '')
  const [amountStr, setAmountStr] = useState('')
  const [description, setDescription] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('EQUAL')
  const [splits, setSplits] = useState<SplitEntry[]>(
    participants.map((p) => ({ participantId: p.id, included: true, shareValue: splitType === 'PERCENT' ? Math.floor(100 / participants.length) : 1 }))
  )

  const amountCents = Math.round(parseFloat(amountStr.replace(',', '.') || '0') * 100)

  const updateSplit = (participantId: string, field: 'included' | 'shareValue', value: boolean | number) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.participantId === participantId ? { ...s, [field]: value } : s
      )
    )
  }

  const includedSplits = splits.filter((s) => s.included)

  // Calculate preview amounts
  const previewAmounts = (() => {
    if (amountCents <= 0 || includedSplits.length === 0) return new Map<string, number>()
    const map = new Map<string, number>()

    if (splitType === 'EQUAL') {
      const base = Math.floor(amountCents / includedSplits.length)
      const remainder = amountCents % includedSplits.length
      includedSplits.forEach((s, i) => {
        map.set(s.participantId, i < remainder ? base + 1 : base)
      })
    } else if (splitType === 'PERCENT') {
      let remaining = amountCents
      includedSplits.forEach((s, i) => {
        if (i === includedSplits.length - 1) {
          map.set(s.participantId, remaining)
        } else {
          const amount = Math.round((amountCents * s.shareValue) / 100)
          map.set(s.participantId, amount)
          remaining -= amount
        }
      })
    } else {
      const totalShares = includedSplits.reduce((sum, s) => sum + s.shareValue, 0)
      let remaining = amountCents
      includedSplits.forEach((s, i) => {
        if (i === includedSplits.length - 1) {
          map.set(s.participantId, remaining)
        } else {
          const amount = Math.round((amountCents * s.shareValue) / totalShares)
          map.set(s.participantId, amount)
          remaining -= amount
        }
      })
    }
    return map
  })()

  const totalPercent = splitType === 'PERCENT'
    ? includedSplits.reduce((sum, s) => sum + s.shareValue, 0)
    : 100

  const addExpense = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/bills/${billId}/expenses`, {
        payerParticipantId,
        amountCents,
        description: description || undefined,
        spentAt: new Date().toISOString(),
        splits: includedSplits.map((s) => ({
          shareType: splitType,
          participantId: s.participantId,
          ...(splitType !== 'EQUAL' && { shareValue: s.shareValue }),
        })),
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      toast.success('Gasto adicionado!')
      resetForm()
      onClose()
    },
  })

  const resetForm = () => {
    setAmountStr('')
    setDescription('')
    setSplitType('EQUAL')
    setSplits(participants.map((p) => ({ participantId: p.id, included: true, shareValue: 1 })))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Novo Gasto</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addExpense.mutate()
          }}
          className="space-y-4"
        >
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
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoco no restaurante"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
              maxLength={1000}
            />
          </div>

          {/* Payer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quem pagou? *</label>
            <select
              value={payerParticipantId}
              onChange={(e) => setPayerParticipantId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm focus:ring-2 focus:ring-pix-500 focus:border-transparent outline-none transition"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>

          {/* Split type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de divisao</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'EQUAL' as const, label: 'Igual' },
                { value: 'PERCENT' as const, label: 'Porcentagem' },
                { value: 'SHARES' as const, label: 'Partes' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSplitType(value)
                    setSplits(participants.map((p) => ({
                      participantId: p.id,
                      included: true,
                      shareValue: value === 'PERCENT' ? Math.floor(100 / participants.length) : 1,
                    })))
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                    splitType === value
                      ? 'bg-pix-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Split participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Divisao entre participantes</label>
            <div className="space-y-2">
              {participants.map((p) => {
                const split = splits.find((s) => s.participantId === p.id)!
                const preview = previewAmounts.get(p.id)
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition ${
                      split.included ? 'bg-pix-50/60 border border-pix-100' : 'bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={split.included}
                      onChange={(e) => updateSplit(p.id, 'included', e.target.checked)}
                      className="w-4 h-4 rounded text-pix-600 focus:ring-pix-500"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">{p.displayName}</span>

                    {splitType !== 'EQUAL' && split.included && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={split.shareValue}
                          onChange={(e) => updateSplit(p.id, 'shareValue', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-sm text-center bg-white/60"
                        />
                        <span className="text-xs text-gray-500">
                          {splitType === 'PERCENT' ? '%' : 'partes'}
                        </span>
                      </div>
                    )}

                    {split.included && preview !== undefined && (
                      <span className="text-sm font-semibold text-pix-700">
                        {formatCurrency(preview)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {splitType === 'PERCENT' && Math.abs(totalPercent - 100) > 0.01 && (
              <p className="text-xs text-red-500 mt-1">
                Total: {totalPercent}% (deve ser 100%)
              </p>
            )}
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
                includedSplits.length === 0 ||
                addExpense.isPending ||
                (splitType === 'PERCENT' && Math.abs(totalPercent - 100) > 0.01)
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addExpense.isPending ? 'Salvando...' : 'Salvar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
