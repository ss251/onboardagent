'use client'

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = `${process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}`

// 2. Set chains
const galadriel = {
  chainId: process.env.NEXT_PUBLIC_NETWORK === "local" ? 1337 : 696969,
  name: 'Galadriel',
  currency: 'GAL',
  explorerUrl: 'https://explorer.galadriel.com/',
  rpcUrl: process.env.NEXT_PUBLIC_NETWORK === "local" ? 'http://127.0.0.1:8545' : 'https://devnet.galadriel.com/'
}

// 3. Create modal
const metadata = {
  name: "OnboardAgent",
  description: "AI Powered Web3 Onboarding Agent",
  url: "https://onboardagent.vercel.app", // Update this to your actual domain
  icons: ["https://avatars.githubusercontent.com/u/37784886"] // Add your icon URL here
}

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [galadriel],
  projectId,
  enableAnalytics: true // Optional - defaults to your Cloud configuration
})

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  return children
}