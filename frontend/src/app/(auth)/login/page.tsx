'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/lib/api'
import { toast } from 'react-hot-toast'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identificador é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Faz-o-Pix 🇧🇷
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Divisor de contas brasileiro
            </p>
            <p className="text-sm text-gray-600">
              Entre na sua conta
            </p>
          </div>
          
          <div className="mt-4 bg-pix-50 border border-pix-200 p-3 rounded-md">
            <div className="text-center">
              <p className="text-xs text-pix-800">
                <strong>🔒 100% seguro e conforme LGPD</strong>
                <br />
                Seus dados ficam no Brasil e são criptografados
              </p>
            </div>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="identifier" className="sr-only">
                Email, CPF ou Telefone
              </label>
              <input
                {...register('identifier')}
                type="text"
                autoComplete="username"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder="Email, CPF ou Telefone"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-pix-500 focus:border-pix-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-pix-600 hover:bg-pix-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pix-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/signup"
              className="font-medium text-pix-600 hover:text-pix-500"
            >
              Não tem conta? Cadastre-se
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}