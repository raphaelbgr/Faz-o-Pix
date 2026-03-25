'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pix-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-pix-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">$</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Faz-o-Pix</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-4 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2.5 bg-pix-600 text-white rounded-xl hover:bg-pix-700 transition"
            >
              Criar conta
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="text-center py-16 md:py-24">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-pix-100 dark:bg-pix-900/30 text-pix-800 dark:text-pix-300 text-xs font-medium mb-6">
            100% brasileiro &middot; Conforme LGPD
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
            Divida contas facilmente<br />
            <span className="text-pix-600">com Pix</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
            Organize gastos de viagens, jantares e eventos.
            Calcule quem deve quanto e pague direto via Pix.
            Simples, seguro e gratuito.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3.5 bg-pix-600 text-white rounded-xl hover:bg-pix-700 transition font-semibold text-lg shadow-lg shadow-pix-600/20"
            >
              Comece agora
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition font-medium text-lg"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 grid md:grid-cols-3 gap-8">
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 bg-pix-100 dark:bg-pix-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-pix-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Grupos flexíveis</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Adicione participantes por CPF, email ou telefone.
              Mesmo quem não tem conta pode participar.
            </p>
          </div>

          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Divisão inteligente</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Divida igualmente, por porcentagem ou por cotas.
              Algoritmo de simplificação minimiza transferências.
            </p>
          </div>

          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pague com Pix</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Gere código Pix copia-e-cola automaticamente.
              Cole no app do banco e pronto, pago!
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Crie uma conta', desc: 'Dê um nome e adicione os participantes' },
              { step: '2', title: 'Registre gastos', desc: 'Adicione despesas e defina quem pagou' },
              { step: '3', title: 'Veja os saldos', desc: 'Calcule automaticamente quem deve quanto' },
              { step: '4', title: 'Pague via Pix', desc: 'Gere o código e pague direto pelo app' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-pix-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="py-16">
          <div className="glass-card p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Seguro e privado</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto mb-6">
              Senhas protegidas com Argon2id. Dados armazenados no Brasil.
              Em total conformidade com a LGPD.
            </p>
            <Link
              href="/privacidade"
              className="text-sm text-pix-600 hover:text-pix-700 font-medium"
            >
              Ver política de privacidade
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Faz-o-Pix &middot; Feito no Brasil
          </p>
          <div className="flex gap-6">
            <Link href="/privacidade" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Privacidade
            </Link>
            <Link href="/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Entrar
            </Link>
            <Link href="/signup" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Cadastro
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
