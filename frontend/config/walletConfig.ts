import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { cookieStorage, createStorage, http } from 'wagmi'
import { polygon } from 'wagmi/chains'
// import { mainnet, sepolia } from 'wagmi/chains'

// Custom Galadriel Devnet chain configuration
export const galadrielDevnet = {
  id: 696969,
  name: 'Galadriel Devnet',
  network: 'galadriel-devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Galadriel',
    symbol: 'GAL',
  },
  rpcUrls: {
    public: { http: ['https://devnet.galadriel.com'] },
    default: { http: ['https://devnet.galadriel.com'] },
  },
  blockExplorers: {
    default: { name: 'GaladrielExplorer', url: 'https://explorer.galadriel.com' },
  },
}

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID

if (!projectId) throw new Error('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not defined')

export const metadata = {
  name: 'Onboard Agent',
  description: 'AI Powered Web3 Onboarding Agent',
  url: 'https:/onboardagent.vercel.app',
  icons: []
}

// Create wagmiConfig
const chains = [galadrielDevnet, polygon] as const
export const config = defaultWagmiConfig({
  chains,
  transports: {
    [polygon.id]: http(),
  },
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  }),
})