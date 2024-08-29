'use client'

import React, { ReactNode } from 'react'
import { config, projectId } from '../config/walletConfig'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { State, WagmiProvider } from 'wagmi'

// Setup queryClient
const queryClient = new QueryClient()

// Create modal
createWeb3Modal({
  wagmiConfig: config,
  projectId: projectId!,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
})

interface WalletProviderProps {
  children: ReactNode
  initialState?: State
}

export default function WalletProvider({ children, initialState }: WalletProviderProps) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}