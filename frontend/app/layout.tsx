import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { config } from '../config/walletConfig'
import { Web3ModalProvider } from '@/lib/Web3Modal'

export const metadata: Metadata = {
  title: 'Onboard Agent',
  description: 'AI Powered Web3 Onboarding Agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialState = cookieToInitialState(config, headers().get('cookie'))
  
  return (
    <html lang="en">
      <body>
        <Web3ModalProvider>{children}</Web3ModalProvider>
      </body>
    </html>
  )
}
