import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Faz-o-Pix - Divisor de Contas Brasileiro 🇧🇷',
  description: 'Divida contas facilmente com PIX. 100% brasileiro e conforme LGPD. Seguro, rápido e grátis.',
  keywords: 'divisor contas, PIX, brasileiro, LGPD, rachador conta, gastos compartilhados',
  authors: [{ name: 'Faz-o-Pix Team' }],
  creator: 'Faz-o-Pix',
  publisher: 'Faz-o-Pix',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://fazopix.com.br',
    siteName: 'Faz-o-Pix',
    title: 'Faz-o-Pix - Divisor de Contas Brasileiro 🇧🇷',
    description: 'Divida contas facilmente com PIX. 100% brasileiro e conforme LGPD.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="theme-init" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('fazopix-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`}</Script>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}