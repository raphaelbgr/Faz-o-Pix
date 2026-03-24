'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency, formatDateBrazilian, formatRelativeTimeBrazilian } from '@/utils/validation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChangelogPanel } from '@/components/ChangelogPanel'
import { BalancePanel } from '@/components/BalancePanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import AddExpenseModalV2 from '@/components/AddExpenseModalV2'
import { useEffect, useState } from 'react'

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
  expenses: Array<{
    id: string
    description?: string
    amountCents: number
    spentAt: string
    payer: {
      displayName: string
    }
    splits: Array<{
      participant: {
        displayName: string
      }
      amountCents: number
    }>
  }>
  settlements: Array<{
    id: string
    amountCents: number
    method: string
    reference?: string
    createdAt: string
    fromParticipant: {
      displayName: string
    }
    toParticipant: {
      displayName: string
    }
  }>
}

export default function BillDetailPage() {
  const params = useParams()
  const billId = params.id as string
  const [token, setToken] = useState<string | null>(null)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  // Get JWT token from cookies
  useEffect(() => {
    const getTokenFromCookie = () => {
      const cookies = document.cookie.split(';')
      const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('fazopix_session='))
      if (sessionCookie) {
        const cookieValue = sessionCookie.split('=')[1]
        if (cookieValue) {
          try {
            // Extract the JWT from the signed cookie (simplified - in production you'd verify signature)
            const decodedValue = decodeURIComponent(cookieValue)
            // For development, assuming the cookie is just the JWT token
            setToken(decodedValue)
          } catch (error) {
            console.error('Error parsing cookie:', error)
          }
        }
      }
    }

    getTokenFromCookie()
  }, [])

  const { data: bill, isLoading, error, refetch } = useQuery<Bill>({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const response = await api.get(`/bills/${billId}`)
      return response.data
    },
    enabled: !!billId,
  })

  const { data: balances } = useQuery({
    queryKey: ['bill-balances', billId],
    queryFn: async () => {
      const response = await api.get(`/bills/${billId}/balances`)
      return response.data
    },
    enabled: !!billId && !!bill,
  })

  const { changelog, isConnected } = useWebSocket(billId, token)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[hsl(var(--pix-primary))] mx-auto"></div>
          <p className="mt-4 text-[hsl(var(--foreground-muted))]">Carregando conta...</p>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erro ao carregar conta</p>
          <div className="space-x-4">
            <button 
              onClick={() => refetch()} 
              className="glass-card px-4 py-2 bg-[hsl(var(--pix-primary))]/20 hover:bg-[hsl(var(--pix-primary))] text-[hsl(var(--pix-primary))] hover:text-white transition-all duration-300"
            >
              Tentar novamente
            </button>
            <Link 
              href="/bills"
              className="glass-card px-4 py-2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-all duration-300 inline-block"
            >
              Voltar às contas
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const totalExpenses = bill.expenses.reduce((sum, expense) => sum + expense.amountCents, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background-secondary">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Theme Toggle */}
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        
        {/* Header */}
        <div className="glass-card p-6 mb-8 animate-float">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/bills"
                className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--pix-primary))] transition-colors duration-200 p-2 rounded-lg hover:bg-[hsl(var(--pix-primary))]/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] animate-float">
                  {bill.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  {bill.simplifyDebts && (
                    <span className="glass-card text-xs bg-[hsl(var(--pix-primary))]/15 dark:bg-[hsl(var(--pix-primary))]/20 text-[hsl(var(--pix-primary))] px-3 py-1.5 rounded-full border border-[hsl(var(--pix-primary))]/30 dark:border-[hsl(var(--pix-primary))]/20 shadow-sm">
                      Simplificado
                    </span>
                  )}
                </div>
                {bill.description && (
                  <p className="text-[hsl(var(--foreground-muted))] mt-2">{bill.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected && (
                <div className="flex items-center text-green-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm">Tempo real</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center mt-4 space-x-6 text-sm text-[hsl(var(--foreground-muted))]">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {bill.members.length} participantes
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {bill.expenses.length} gastos
            </span>
            <span className="glass-card px-3 py-1.5 bg-[hsl(var(--pix-primary))]/15 dark:bg-[hsl(var(--pix-primary))]/20 border border-[hsl(var(--pix-primary))]/30 dark:border-[hsl(var(--pix-primary))]/20 rounded-full flex items-center font-medium text-[hsl(var(--pix-primary))] shadow-sm">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Total: {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Participants */}
            <div className="glass-card p-6 animate-float">
              <h2 className="text-lg font-medium text-[hsl(var(--foreground))] mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-[hsl(var(--pix-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Participantes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bill.members.map((member) => (
                  <div 
                    key={member.id}
                    className="glass-card p-4 hover:glow transition-all duration-300"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium shadow-lg ${
                        member.role === 'OWNER' 
                          ? 'bg-gradient-to-br from-[hsl(var(--pix-primary))] to-[hsl(var(--pix-hover))]' 
                          : 'bg-gradient-to-br from-slate-400 to-slate-500'
                      }`}>
                        {member.participant.displayName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[hsl(var(--foreground))]">
                          {member.participant.displayName}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {member.role === 'OWNER' && (
                            <span className="glass-card text-xs bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/30 dark:border-blue-500/20 shadow-sm">
                              Proprietário
                            </span>
                          )}
                          <span className={`glass-card text-xs px-2.5 py-1 rounded-full border shadow-sm ${
                            member.participant.userLink 
                              ? 'bg-green-500/15 dark:bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20' 
                              : 'bg-[hsl(var(--foreground-muted))]/15 dark:bg-[hsl(var(--foreground-muted))]/20 text-[hsl(var(--foreground-muted))] border-[hsl(var(--foreground-muted))]/30 dark:border-[hsl(var(--foreground-muted))]/20'
                          }`}>
                            {member.participant.userLink ? 'Registrado' : 'Convidado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div className="glass-card p-6 animate-float">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-[hsl(var(--foreground))] flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[hsl(var(--pix-primary))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Gastos
                </h2>
                <button 
                  onClick={() => setShowExpenseModal(true)}
                  className="glass-card px-4 py-2 bg-[hsl(var(--pix-primary))]/20 hover:bg-[hsl(var(--pix-primary))] text-[hsl(var(--pix-primary))] hover:text-white transition-all duration-300 hover:glow text-sm">
                  Adicionar Gasto
                </button>
              </div>

              {bill.expenses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="glass-card mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[hsl(var(--foreground-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-[hsl(var(--foreground-muted))]">Nenhum gasto adicionado ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bill.expenses.map((expense) => (
                    <div 
                      key={expense.id}
                      className="glass-card p-4 hover:glow transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-[hsl(var(--foreground))]">
                            {expense.description || 'Sem descrição'}
                          </p>
                          <p className="text-sm text-[hsl(var(--foreground-muted))] mt-1 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Pago por {expense.payer.displayName}
                            <span className="mx-2">•</span>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDateBrazilian(expense.spentAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-[hsl(var(--pix-primary))]">
                            {formatCurrency(expense.amountCents)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-xs text-[hsl(var(--foreground-muted))] mb-3 font-medium">Divisão:</p>
                        <div className="flex flex-wrap gap-2">
                          {expense.splits.map((split, index) => (
                            <span
                              key={index}
                              className="glass-card px-3 py-1.5 text-xs font-medium text-[hsl(var(--foreground))] hover:glow transition-all duration-300"
                            >
                              {split.participant.displayName}: {formatCurrency(split.amountCents)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlements */}
            {bill.settlements.length > 0 && (
              <div className="glass-card p-6 animate-float">
                <h2 className="text-lg font-medium text-[hsl(var(--foreground))] mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pagamentos
                </h2>
                <div className="space-y-4">
                  {bill.settlements.map((settlement) => (
                    <div 
                      key={settlement.id}
                      className="glass-card p-4 bg-green-500/10 border border-green-500/20 hover:glow transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-[hsl(var(--foreground))] flex items-center">
                              {settlement.fromParticipant.displayName} 
                              <svg className="w-4 h-4 mx-2 text-[hsl(var(--foreground-muted))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                              {settlement.toParticipant.displayName}
                            </p>
                            <p className="text-sm text-[hsl(var(--foreground-muted))] flex items-center mt-1">
                              <span className="bg-slate-500/20 text-[hsl(var(--foreground-muted))] px-2 py-1 rounded-full text-xs mr-2">
                                {settlement.method}
                              </span>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDateBrazilian(settlement.createdAt)}
                              {settlement.reference && (
                                <span className="ml-2 text-xs bg-slate-500/20 px-2 py-1 rounded-full">
                                  Ref: {settlement.reference.slice(0, 10)}...
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(settlement.amountCents)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Balances + Changelog */}
          <div className="space-y-8">
            {balances && <BalancePanel data={balances} />}
            <ChangelogPanel changelog={changelog} isConnected={isConnected} />
          </div>
        </div>
      </div>
      
      {/* Add Expense Modal */}
      <AddExpenseModalV2
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        billId={billId}
        participants={bill.members.map(member => ({
          participant_id: member.participant.id,
          display_name: member.participant.displayName || 'Participante',
          is_placeholder: !member.participant.userLink
        }))}
        onExpenseAdded={() => {
          refetch()
        }}
      />
    </div>
  )
}