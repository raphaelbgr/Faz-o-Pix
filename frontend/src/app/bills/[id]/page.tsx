'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { formatCurrency } from '@/utils/validation'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ChangelogPanel } from '@/components/ChangelogPanel'
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

  const { changelog, isConnected } = useWebSocket(billId, token)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pix-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando conta...</p>
        </div>
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar conta</p>
          <div className="space-x-4">
            <button 
              onClick={() => refetch()} 
              className="px-4 py-2 bg-pix-600 text-white rounded-md hover:bg-pix-700"
            >
              Tentar novamente
            </button>
            <Link 
              href="/bills"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 inline-block"
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/bills"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{bill.name}</h1>
                {bill.description && (
                  <p className="text-gray-600">{bill.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
              <span>{bill.members.length} participantes</span>
              <span>{bill.expenses.length} gastos</span>
              <span>Total: {formatCurrency(totalExpenses)}</span>
              {bill.simplifyDebts && (
                <span className="bg-pix-100 text-pix-800 px-2 py-1 rounded-full text-xs">
                  Simplificado
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isConnected && (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm">Tempo real</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Participants */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Participantes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bill.members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      member.role === 'OWNER' ? 'bg-pix-600' : 'bg-gray-400'
                    }`}>
                      {member.participant.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.participant.displayName}
                        {member.role === 'OWNER' && (
                          <span className="ml-2 text-xs text-pix-600 font-normal">
                            (Dono)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {member.participant.userLink ? 'Registrado' : 'Placeholder'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Gastos</h2>
                <button className="px-4 py-2 bg-pix-600 text-white rounded-md hover:bg-pix-700 text-sm">
                  Adicionar Gasto
                </button>
              </div>

              {bill.expenses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum gasto adicionado ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bill.expenses.map((expense) => (
                    <div 
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {expense.description || 'Sem descrição'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Pago por {expense.payer.displayName} • {' '}
                            {new Date(expense.spentAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(expense.amountCents)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Divisão:</p>
                        <div className="flex flex-wrap gap-2">
                          {expense.splits.map((split, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Liquidações</h2>
                <div className="space-y-3">
                  {bill.settlements.map((settlement) => (
                    <div 
                      key={settlement.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {settlement.fromParticipant.displayName} → {settlement.toParticipant.displayName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {settlement.method} • {new Date(settlement.createdAt).toLocaleDateString('pt-BR')}
                          {settlement.reference && (
                            <span className="ml-2">Ref: {settlement.reference.slice(0, 10)}...</span>
                          )}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">
                        {formatCurrency(settlement.amountCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Changelog */}
          <div>
            <ChangelogPanel changelog={changelog} isConnected={isConnected} />
          </div>
        </div>
      </div>
    </div>
  )
}