'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency } from '@/utils/validation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChangelogPanel } from '@/components/ChangelogPanel'
import { AddExpenseModal } from '@/components/AddExpenseModal'
import { AddMemberModal } from '@/components/AddMemberModal'
import { RecordSettlementModal } from '@/components/RecordSettlementModal'
import { EditExpenseModal } from '@/components/EditExpenseModal'
import { BalanceView } from '@/components/BalanceView'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

interface Expense {
  id: string
  description?: string
  amountCents: number
  spentAt: string
  createdAt: string
  payerParticipantId: string
  payer: {
    id: string
    displayName: string
  }
  splits: Array<{
    participant: {
      id: string
      displayName: string
    }
    participantId: string
    amountCents: number
  }>
}

interface Bill {
  id: string
  name: string
  description?: string
  simplifyDebts: boolean
  createdAt: string
  owner: {
    fullName: string
  }
  members: Array<{
    id: string
    participant: {
      id: string
      displayName: string
      userLink?: {
        userId: string
      }
    }
    role: string
  }>
  expenses: Expense[]
  settlements: Array<{
    id: string
    amountCents: number
    method: string
    reference?: string
    note?: string
    createdAt: string
    fromParticipant: {
      displayName: string
    }
    toParticipant: {
      displayName: string
    }
  }>
}

function isWithin24Hours(createdAt: string): boolean {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  return (now - created) < 24 * 60 * 60 * 1000
}

export default function BillDetailPage() {
  const params = useParams()
  const billId = params.id as string
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(null)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showSettlement, setShowSettlement] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements'>('expenses')

  useEffect(() => {
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('fazopix_session='))
    if (sessionCookie) {
      const cookieValue = sessionCookie.split('=')[1]
      if (cookieValue) {
        try {
          setToken(decodeURIComponent(cookieValue))
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [])

  const { data: bill, isLoading, error, refetch } = useQuery<Bill>({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const response = await api.get(`/bills/${billId}`)
      return response.data
    },
    enabled: !!billId,
  })

  const deleteExpense = useMutation({
    mutationFn: async (expenseId: string) => {
      await api.delete(`/bills/${billId}/expenses/${expenseId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill', billId] })
      queryClient.invalidateQueries({ queryKey: ['balances', billId] })
      toast.success('Gasto removido!')
      setDeletingExpenseId(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Erro ao remover gasto'
      toast.error(msg)
      setDeletingExpenseId(null)
    },
  })

  const { changelog, isConnected } = useWebSocket(billId, token)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pix-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pix-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando conta...</p>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pix-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar conta</p>
          <div className="space-x-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-pix-600 text-white rounded-xl hover:bg-pix-700 transition"
            >
              Tentar novamente
            </button>
            <Link
              href="/bills"
              className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 inline-block transition"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const participants = bill.members.map((m) => ({
    id: m.participant.id,
    displayName: m.participant.displayName || 'Participante',
  }))

  const totalExpenses = bill.expenses.reduce((sum, expense) => sum + expense.amountCents, 0)
  const totalSettled = bill.settlements.reduce((sum, s) => sum + s.amountCents, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pix-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/bills"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{bill.name}</h1>
              {bill.description && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{bill.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isConnected && (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1.5"></div>
                <span className="text-xs">Tempo real</span>
              </div>
            )}
            {bill.simplifyDebts && (
              <span className="bg-pix-100 text-pix-800 px-2.5 py-1 rounded-full text-xs font-medium">
                Simplificado
              </span>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{bill.members.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Participantes</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{bill.expenses.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Gastos</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-pix-700">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSettled)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pago</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100/80 dark:bg-slate-800/80 rounded-xl p-1">
          {[
            { key: 'expenses' as const, label: 'Gastos' },
            { key: 'balances' as const, label: 'Saldos' },
            { key: 'settlements' as const, label: 'Pagamentos' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                activeTab === key
                  ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
              <>
                {/* Participants */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Participantes</h2>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="text-sm text-pix-600 hover:text-pix-700 font-medium"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bill.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-gray-700"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ${
                          member.role === 'OWNER' ? 'bg-pix-600' : member.participant.userLink ? 'bg-gray-500' : 'bg-amber-400'
                        }`}>
                          {member.participant.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {member.participant.displayName}
                        </span>
                        {!member.participant.userLink && (
                          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Placeholder</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expenses List */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gastos</h2>
                    <button
                      onClick={() => setShowAddExpense(true)}
                      className="btn-primary text-sm"
                    >
                      Adicionar Gasto
                    </button>
                  </div>

                  {bill.expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">Nenhum gasto adicionado ainda</p>
                      <button
                        onClick={() => setShowAddExpense(true)}
                        className="mt-3 text-sm text-pix-600 hover:text-pix-700 font-medium"
                      >
                        Adicionar primeiro gasto
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bill.expenses.map((expense) => {
                        const editable = isWithin24Hours(expense.createdAt)
                        return (
                          <div
                            key={expense.id}
                            className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition group"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {expense.description || 'Sem descrição'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Pago por {expense.payer.displayName} &middot;{' '}
                                  {new Date(expense.spentAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(expense.amountCents)}
                                </p>
                                {editable && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => setEditingExpense(expense)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-pix-600 hover:bg-pix-50 dark:hover:bg-pix-900/20 transition"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => setDeletingExpenseId(expense.id)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                      title="Remover"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {expense.splits.map((split, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                                >
                                  {split.participant.displayName}: {formatCurrency(split.amountCents)}
                                </span>
                              ))}
                            </div>

                            {!editable && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                Período de edição expirado (24h)
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <BalanceView
                billId={billId}
                onRecordSettlement={() => setShowSettlement(true)}
              />
            )}

            {/* Settlements Tab */}
            {activeTab === 'settlements' && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pagamentos</h2>
                    {bill.settlements.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {bill.settlements.length} pagamento{bill.settlements.length !== 1 ? 's' : ''} &middot; Total: {formatCurrency(totalSettled)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSettlement(true)}
                    className="btn-primary text-sm"
                  >
                    Registrar Pagamento
                  </button>
                </div>

                {bill.settlements.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Nenhum pagamento registrado</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Vá para Saldos para ver quem deve para quem
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bill.settlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="p-4 bg-green-50/60 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/30"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {settlement.fromParticipant.displayName} &rarr; {settlement.toParticipant.displayName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                settlement.method === 'PIX'
                                  ? 'bg-pix-100 dark:bg-pix-900/30 text-pix-800 dark:text-pix-300'
                                  : settlement.method === 'CASH'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}>
                                {settlement.method === 'PIX' ? 'PIX' : settlement.method === 'CASH' ? 'Dinheiro' : 'Outro'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(settlement.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                              {settlement.reference && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                  {settlement.reference.slice(0, 16)}{settlement.reference.length > 16 ? '...' : ''}
                                </span>
                              )}
                            </div>
                            {settlement.note && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                {settlement.note}
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-green-700 dark:text-green-400 text-lg">
                            {formatCurrency(settlement.amountCents)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Changelog */}
          <div>
            <ChangelogPanel changelog={changelog} isConnected={isConnected} />
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {deletingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingExpenseId(null)} />
          <div className="relative glass-modal w-full max-w-sm mx-4 p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Remover gasto?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Esta ação não pode ser desfeita. O gasto será removido permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingExpenseId(null)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteExpense.mutate(deletingExpenseId)}
                disabled={deleteExpense.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                {deleteExpense.isPending ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        billId={billId}
        participants={participants}
      />
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        billId={billId}
      />
      <RecordSettlementModal
        isOpen={showSettlement}
        onClose={() => setShowSettlement(false)}
        billId={billId}
        participants={participants}
      />
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        billId={billId}
        participants={participants}
        expense={editingExpense}
      />
    </div>
  )
}
