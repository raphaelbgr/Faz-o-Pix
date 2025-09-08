'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'

export interface ChangelogEntry {
  id: string
  action: string
  description: string
  createdAt: string
  user: {
    fullName: string
  }
  metadata?: any
}

export interface WebSocketMessage {
  type: 'INITIAL_CHANGELOG' | 'BILL_UPDATED' | 'pong'
  action?: string
  data?: ChangelogEntry | ChangelogEntry[]
}

export function useWebSocket(billId: string | null, token: string | null) {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const pingIntervalRef = useRef<NodeJS.Timeout>()

  const connect = () => {
    if (!billId || !token) return

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/ws/bills/${billId}?token=${encodeURIComponent(token)}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected to bill:', billId)
        setIsConnected(true)
        
        // Start ping interval for keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000) // 30 seconds
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'INITIAL_CHANGELOG':
              if (Array.isArray(message.data)) {
                setChangelog(message.data)
              }
              break
              
            case 'BILL_UPDATED':
              if (message.data && !Array.isArray(message.data)) {
                const entry = message.data as ChangelogEntry
                setChangelog(prev => [entry, ...prev.slice(0, 19)]) // Keep last 20 entries
                
                // Show toast notification
                const actionText = getActionText(message.action || entry.action)
                toast.success(`${entry.user.fullName} ${actionText}`, {
                  duration: 5000,
                  icon: '🔄',
                })
              }
              break
              
            case 'pong':
              // Keepalive response
              break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        
        // Clear intervals
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && billId && token) {
          console.log('Attempting to reconnect in 3 seconds...')
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting')
      wsRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    
    setIsConnected(false)
  }

  useEffect(() => {
    connect()
    return disconnect
  }, [billId, token])

  return {
    changelog,
    isConnected,
    reconnect: connect,
  }
}

function getActionText(action: string): string {
  switch (action) {
    case 'EXPENSE_ADDED':
      return 'adicionou um gasto'
    case 'EXPENSE_UPDATED':
      return 'editou um gasto'
    case 'EXPENSE_DELETED':
      return 'removeu um gasto'
    case 'MEMBER_ADDED':
      return 'adicionou um participante'
    case 'SETTLEMENT_ADDED':
      return 'registrou um pagamento'
    default:
      return 'fez uma alteração'
  }
}