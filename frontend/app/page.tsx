import AgentTest from "@/components/AgentTest";
import ConnectButton from "../components/ConnectButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Onboard Agent
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your AI-powered guide to the Web3 universe
          </p>
          <div className="flex justify-center items-center">
            <ConnectButton />
          </div>
        </header>
        <AgentTest />
      </div>
    </main>
  );
}
