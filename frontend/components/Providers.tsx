'use client'

import React from "react"
import { LensProvider, production } from '@lens-protocol/react-web'
import { bindings as wagmiBindings } from '@lens-protocol/wagmi'
import { config } from '../config/walletConfig'
import { WagmiProvider } from 'wagmi'
import { Web3ModalProvider } from "../lib/Web3Modal"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <Web3ModalProvider>
          <LensProvider config={{...production, environment: production, bindings: wagmiBindings(config)}}>
            {children}
          </LensProvider>
        </Web3ModalProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}