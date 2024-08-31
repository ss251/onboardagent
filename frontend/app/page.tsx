'use client'

import { Header } from '@/components/Header'
import { AgentTest } from '@/components/AgentTest'

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      <Header className="fixed top-0 left-0 right-0 z-10" />
      <div className="flex-grow pt-16">
        <AgentTest />
      </div>
    </div>
  )
}