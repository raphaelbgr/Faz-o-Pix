'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'react-hot-toast'
import { formatCPF, formatPhone, detectIdentifierType, normalizeIdentifier } from '@/utils/validation'
import { ThemeToggle } from '@/components/ThemeToggle'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identificador é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  rememberMe: z.boolean().default(false),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [identifierType, setIdentifierType] = useState<string>('')
  const [retryAfter, setRetryAfter] = useState<number>(0)
  const [countdown, setCountdown] = useState<number>(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  })

  const watchedIdentifier = watch('identifier')

  // Auto-format and detect identifier type
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    const type = detectIdentifierType(value)
    setIdentifierType(type)
    
    // Apply formatting based on detected type
    if (type === 'cpf' && value.length <= 14) {
      value = formatCPF(value)
    } else if (type === 'phone' && value.length <= 15) {
      value = formatPhone(value)
    }
    
    setValue('identifier', value)
  }

  // Countdown timer for rate limiting
  const startCountdown = (seconds: number) => {
    setRetryAfter(seconds)
    setCountdown(seconds)
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setRetryAfter(0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const onSubmit = async (data: LoginForm) => {
    if (retryAfter > 0) {
      toast.error(`Aguarde ${countdown} segundos antes de tentar novamente`)
      return
    }

    setIsLoading(true)
    try {
      // Normalize the identifier for the API
      const normalizedIdentifier = normalizeIdentifier(data.identifier, identifierType)
      
      const response = await api.post('/auth/login', {
        identifier: normalizedIdentifier,
        password: data.password,
        rememberMe: data.rememberMe,
      })
      
      // Since we use HTTP-only cookies, we need to fetch user data from /me endpoint
      const userResponse = await api.get('/auth/me')
      
      setAuth({
        token: 'cookie-session', // Placeholder since we use HTTP-only cookies
        user: {
          id: userResponse.data.id,
          name: userResponse.data.fullName,
          email: userResponse.data.identifiers?.find((id: any) => id.type === 'PIX_EMAIL')?.value,
        },
      })
      
      toast.success('Login realizado com sucesso!')
      router.push('/bills')
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retrySeconds = error.response.data.error.retryAfter || 60
        startCountdown(retrySeconds)
        toast.error(error.response.data.error.message)
      } else if (error.response?.status === 401) {
        // Check if there's a retry delay
        if (error.response.data.error.retryAfter) {
          startCountdown(error.response.data.error.retryAfter)
        }
        toast.error(error.response.data.error.message || 'Identificador ou senha incorretos')
      } else {
        toast.error('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getIdentifierPlaceholder = () => {
    if (identifierType === 'cpf') return 'CPF: 123.456.789-01'
    if (identifierType === 'cnpj') return 'CNPJ: 12.345.678/0001-95'
    if (identifierType === 'phone') return 'Telefone: (11) 99999-9999'
    if (identifierType === 'email') return 'Email: seu@email.com'
    if (identifierType === 'evp') return 'Chave aleatória'
    return 'CPF, CNPJ, Email, Telefone ou Chave PIX'
  }

  const getIdentifierIcon = () => {
    const baseClasses = "text-xs font-medium px-2 py-1 rounded-lg transition-all duration-200"
    if (identifierType === 'cpf' || identifierType === 'cnpj') {
      return <span className={`${baseClasses} bg-blue-500/10 text-blue-500`}>DOC</span>
    }
    if (identifierType === 'phone') {
      return <span className={`${baseClasses} bg-green-500/10 text-green-500`}>📱</span>
    }
    if (identifierType === 'email') {
      return <span className={`${baseClasses} bg-purple-500/10 text-purple-500`}>@</span>
    }
    if (identifierType === 'evp') {
      return <span className={`${baseClasses} bg-yellow-500/10 text-yellow-500`}>🔑</span>
    }
    return <span className={`${baseClasses} bg-[hsl(var(--pix-primary)_/_0.1)] text-[hsl(var(--pix-primary))]`}>PIX</span>
  }

  return (
    <>
      <ThemeToggle />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background-secondary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-foreground animate-float">
              Faz-o-Pix 🇧🇷
            </h2>
            <p className="mt-2 text-sm text-[hsl(var(--foreground-muted))]">
              Entre com qualquer chave PIX cadastrada
            </p>
          </div>
          
          <div className="glass-card p-8 rounded-2xl">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Identificador PIX
                  </label>
                  <div className="relative">
                    <input
                      {...register('identifier')}
                      type="text"
                      onChange={handleIdentifierChange}
                      className="input-glass w-full px-4 py-3 pr-16 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                      placeholder={getIdentifierPlaceholder()}
                      disabled={isLoading || retryAfter > 0}
                    />
                    {identifierType && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {getIdentifierIcon()}
                      </div>
                    )}
                  </div>
                  {errors.identifier && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">{errors.identifier.message}</p>
                  )}
                  {identifierType && (
                    <p className="mt-1 text-xs text-[hsl(var(--foreground-muted))]">
                      Detectado: {
                        identifierType === 'cpf' ? 'CPF' :
                        identifierType === 'cnpj' ? 'CNPJ' :
                        identifierType === 'phone' ? 'Telefone' :
                        identifierType === 'email' ? 'Email' :
                        identifierType === 'evp' ? 'Chave Aleatória' :
                        'Chave PIX'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="input-glass w-full px-4 py-3 pr-12 rounded-xl text-[hsl(var(--foreground))] placeholder-[hsl(var(--foreground-muted))] focus:outline-none"
                      placeholder="Digite sua senha"
                      disabled={isLoading || retryAfter > 0}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-500 animate-pulse">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      {...register('rememberMe')}
                      type="checkbox"
                      className="h-4 w-4 text-[hsl(var(--pix-primary))] focus:ring-[hsl(var(--pix-primary))] border-[hsl(var(--glass-border))] rounded bg-transparent"
                      disabled={isLoading || retryAfter > 0}
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-[hsl(var(--foreground-secondary))]">
                      Lembrar de mim
                    </label>
                  </div>
                  
                  <Link
                    href="#"
                    onClick={(e) => { e.preventDefault(); toast('Recuperação de senha em breve!', { icon: '🔑' }) }}
                    className="text-sm text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] transition-colors duration-200 font-medium"
                  >
                    Esqueci a senha
                  </Link>
                </div>
              </div>

              {retryAfter > 0 && (
                <div className="glass-card p-4 rounded-xl bg-red-500/5 border-red-500/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <div>
                      <p className="text-sm text-red-500 font-medium">
                        Muitas tentativas de login
                      </p>
                      <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                        Tente novamente em {countdown} segundos
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading || retryAfter > 0}
                  className="w-full bg-gradient-to-r from-[hsl(var(--pix-primary))] to-[hsl(var(--pix-hover))] 
                           text-white font-medium py-4 px-6 rounded-xl
                           hover:from-[hsl(var(--pix-hover))] hover:to-[hsl(var(--pix-primary))]
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pix-primary))] focus:ring-offset-2"
                >
                  {isLoading ? 'Entrando...' : retryAfter > 0 ? `Aguarde ${countdown}s` : 'Entrar 🚀'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[hsl(var(--glass-border))]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[hsl(var(--background))] text-[hsl(var(--foreground-muted))]">
                      Novo por aqui?
                    </span>
                  </div>
                </div>

                <Link
                  href="/signup"
                  className="w-full flex justify-center py-3 px-4 border border-[hsl(var(--glass-border))] rounded-xl shadow-sm text-sm font-medium text-[hsl(var(--foreground))] bg-[hsl(var(--glass-background))] hover:bg-[hsl(var(--glass-hover))] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--pix-primary))]"
                >
                  Criar conta grátis
                </Link>
              </div>

              <div className="text-center pt-4">
                <p className="text-xs text-[hsl(var(--foreground-muted))]">
                  Ao entrar, você concorda com nossos{' '}
                  <Link href="#" onClick={(e) => { e.preventDefault(); toast('Termos de uso em breve!', { icon: '📄' }) }} className="text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] hover:underline">
                    Termos
                  </Link>{' '}
                  e{' '}
                  <Link href="#" onClick={(e) => { e.preventDefault(); toast('Política de privacidade em breve!', { icon: '🔒' }) }} className="text-[hsl(var(--pix-primary))] hover:text-[hsl(var(--pix-hover))] hover:underline">
                    Privacidade
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <div className="glass-card p-4 rounded-xl bg-[hsl(var(--pix-primary)_/_0.05)] border-[hsl(var(--pix-primary)_/_0.2)]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-[hsl(var(--pix-primary))]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[hsl(var(--foreground-secondary))]">
                  <strong className="text-[hsl(var(--pix-primary))">💡 Dica:</strong> Você pode entrar com qualquer chave PIX cadastrada: CPF, CNPJ, email, telefone ou chave aleatória.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}