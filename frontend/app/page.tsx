import Link from "next/link";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Briefcase, Users, Shield, TrendingUp, Bot, Award } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Decentralized Work Platform
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered autonomous agents, blockchain-secured payments, and reputation-based matching
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/jobs" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Browse Jobs
            </Link>
            <Link 
              href="/dashboard/client" 
              className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg hover:bg-blue-50 transition font-semibold"
            >
              Client Dashboard
            </Link>
            <Link 
              href="/dashboard/freelancer" 
              className="border-2 border-purple-600 text-purple-600 px-8 py-3 rounded-lg hover:bg-purple-50 transition font-semibold"
            >
              Freelancer Dashboard
            </Link>
            <Link 
              href="/reputation" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:opacity-90 transition font-semibold"
            >
              View Reputation
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Why ReputeFlow?</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Bot className="h-12 w-12 text-blue-600" />}
            title="Autonomous Agents"
            description="6 AI agents handle job matching, validation, and market analysis automatically"
          />
          <FeatureCard
            icon={<Shield className="h-12 w-12 text-purple-600" />}
            title="Secure Escrow"
            description="Smart contract-based milestone payments with multi-validator consensus"
          />
          <FeatureCard
            icon={<Award className="h-12 w-12 text-pink-600" />}
            title="Reputation System"
            description="On-chain reputation with skill badges and verifiable work history"
          />
          <FeatureCard
            icon={<Users className="h-12 w-12 text-green-600" />}
            title="Fair Matching"
            description="Reputation-weighted agent selection ensures quality matches"
          />
          <FeatureCard
            icon={<TrendingUp className="h-12 w-12 text-orange-600" />}
            title="Market Insights"
            description="Real-time pricing and demand analysis from MarketAnalyzer agent"
          />
          <FeatureCard
            icon={<Briefcase className="h-12 w-12 text-indigo-600" />}
            title="Cross-Chain"
            description="Avail Nexus integration for seamless multi-chain payments"
          />
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <StatCard number="6" label="AI Agents" />
            <StatCard number="9" label="Smart Contracts" />
            <StatCard number="4" label="Integrations" />
            <StatCard number="100%" label="Decentralized" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
        <p className="text-gray-600 mb-8">Join the future of decentralized work</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link 
            href="/dashboard/client" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:opacity-90 transition font-semibold inline-block"
          >
            Launch Client Dashboard
          </Link>
          <Link 
            href="/dashboard/freelancer" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:opacity-90 transition font-semibold inline-block"
          >
            Launch Freelancer Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Built with Pyth, Yellow Network, Avail Nexus, Lighthouse & ASI Alliance</p>
          <p className="mt-2 text-sm">Hackathon Project 2025</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border border-gray-100">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold mb-2">{number}</div>
      <div className="text-blue-100">{label}</div>
    </div>
  );
}
