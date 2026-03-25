'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { ThemeToggle } from '@/components/ThemeToggle'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identificador e obrigatorio'),
  password: z.string().min(1, 'Senha e obrigatoria'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      await api.post('/auth/login', data)
      toast.success('Login realizado com sucesso!')
      router.push('/bills')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pix-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Faz-o-Pix</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Divisor de contas brasileiro</p>
        </div>

        <div className="glass-card p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Entrar</h2>

          <div className="mb-6 p-3 rounded-xl bg-pix-50/60 border border-pix-100">
            <p className="text-xs text-pix-800 text-center">
              <strong>100% seguro e conforme LGPD</strong>
              <br />
              Seus dados ficam no Brasil e sao criptografados
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email, CPF ou Telefone
              </label>
              <input
                {...register('identifier')}
                type="text"
                autoComplete="username"
                className="input-field"
                placeholder="seu@email.com"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="input-field"
                placeholder="Sua senha"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl bg-pix-600 text-white hover:bg-pix-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Nao tem conta?{' '}
              <Link href="/signup" className="font-medium text-pix-600 hover:text-pix-700">
                Cadastre-se
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
