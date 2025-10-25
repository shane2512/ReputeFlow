"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Rocket, 
  Code, 
  Zap, 
  Shield, 
  Users,
  Wallet,
  FileText,
  MessageSquare,
  CheckCircle2
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold">Documentation</h1>
          </div>
          <p className="text-lg text-gray-600">
            Learn how to use ReputeFlow - the autonomous freelance work platform
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="space-y-12">
          {/* Getting Started */}
          <section id="getting-started" className="space-y-6">
            <h2 className="text-3xl font-bold">Getting Started</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Quick Start
                </CardTitle>
                <CardDescription>
                  Get up and running with ReputeFlow in 3 simple steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Connect Your Wallet</h3>
                      <p className="text-gray-600">
                        Click "Connect Wallet" in the top right corner. We support MetaMask and other Web3 wallets.
                        Make sure you're on <Badge variant="outline">Base Sepolia</Badge> testnet.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Get Test Tokens</h3>
                      <p className="text-gray-600 mb-2">
                        You'll need Base Sepolia ETH and PYUSD testnet tokens:
                      </p>
                      <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                        <li>Base Sepolia ETH: <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" className="text-blue-600 hover:underline">Alchemy Faucet</a></li>
                        <li>PYUSD (Ethereum Sepolia): <a href="https://faucet.circle.com/" target="_blank" className="text-blue-600 hover:underline">Circle Faucet</a></li>
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Start Using ReputeFlow</h3>
                      <p className="text-gray-600">
                        You're ready! Post a job as a client or register your skills as a freelancer.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Network Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="font-semibold">Base Sepolia</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chain ID:</span>
                    <span className="font-semibold">84532</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">RPC URL:</span>
                    <span className="font-semibold">https://sepolia.base.org</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Explorer:</span>
                    <a href="https://sepolia.basescan.org" target="_blank" className="text-blue-600 hover:underline">
                      sepolia.basescan.org
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* How to Use */}
          <section id="how-to-use" className="space-y-6">
            <h2 className="text-3xl font-bold">How to Use</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  For Clients
                </CardTitle>
                <CardDescription>
                  How to post jobs and hire freelancers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Post a Job via Chat
                  </h3>
                  <p className="text-gray-600 mb-2">
                    Use natural language to post jobs. Our AI agent understands commands like:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    "post a job for Smart Contract Dev budget:20$ skills:solidity,rust"
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">
                    The agent will automatically create the job on-chain and deposit funds to escrow.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Review Proposals</h3>
                  <p className="text-gray-600">
                    Freelancers will submit proposals. Review them in your dashboard and accept the best one.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Approve Deliverables</h3>
                  <p className="text-gray-600 mb-2">
                    When the freelancer submits work, review and approve it:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    "approve deliverable for job 23"
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">
                    PYUSD is released instantly to the freelancer - zero platform fees!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  For Freelancers
                </CardTitle>
                <CardDescription>
                  How to find jobs and get paid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Register Your Skills</h3>
                  <p className="text-gray-600 mb-2">
                    Tell our AI agent what you can do:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm space-y-2">
                    <div>"register my skills solidity rust python"</div>
                    <div className="text-gray-500">or</div>
                    <div>"register skills: solidity, rust, python"</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Find Matching Jobs</h3>
                  <p className="text-gray-600 mb-2">
                    Our AI automatically matches you with relevant jobs:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                    "find jobs"
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">
                    You'll see jobs that match your skills with match scores.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Apply & Get Paid</h3>
                  <p className="text-gray-600 mb-2">
                    Apply to jobs and submit your work. When approved, you receive instant PYUSD payment:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Zero platform fees - keep 100% of your earnings</li>
                    <li>Instant payment - no waiting periods</li>
                    <li>Gasless for you - client pays all gas fees</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Concepts */}
          <section id="concepts" className="space-y-6">
            <h2 className="text-3xl font-bold">Concepts</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Agents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  ReputeFlow uses autonomous AI agents to automate the entire freelance workflow:
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Client Agent:</span>
                      <span className="text-gray-600"> Handles job posting, proposal evaluation, and payments</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Freelancer Agent:</span>
                      <span className="text-gray-600"> Discovers jobs and generates proposals</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Job Matcher:</span>
                      <span className="text-gray-600"> Matches freelancers with relevant jobs based on skills</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Smart Contract Escrow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Your funds are protected by smart contracts on Base Sepolia:
                </p>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold">For Clients:</span>
                    <p className="text-gray-600">
                      Funds are locked in escrow until you approve the deliverable. If work isn't satisfactory, you can dispute.
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold">For Freelancers:</span>
                    <p className="text-gray-600">
                      Your payment is guaranteed once work is approved. No chargebacks or payment delays.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  PYUSD Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  We use PayPal USD (PYUSD) stablecoin for payments:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Benefits</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>✓ USD-pegged (no volatility)</li>
                      <li>✓ Instant settlement</li>
                      <li>✓ Low transaction fees</li>
                      <li>✓ Backed by PayPal</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>1. Client deposits PYUSD</li>
                      <li>2. Held in smart contract</li>
                      <li>3. Released on approval</li>
                      <li>4. Freelancer receives instantly</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  On-Chain Reputation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Build portable reputation that follows you everywhere:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Immutable record of completed projects</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Quality ratings from clients</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Skill-based NFT badges</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span>Portable across platforms</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* FAQ */}
          <section id="faq" className="space-y-4">
            <h2 className="text-3xl font-bold">FAQ</h2>
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Is ReputeFlow free to use?</h3>
                  <p className="text-gray-600">
                    Yes! We charge <strong>zero platform fees</strong>. You only pay blockchain gas fees (which are minimal on Base Sepolia).
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">How long do payments take?</h3>
                  <p className="text-gray-600">
                    Payments are <strong>instant</strong>. Once a client approves your deliverable, PYUSD is released to your wallet in seconds.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">What if there's a dispute?</h3>
                  <p className="text-gray-600">
                    Funds remain in escrow until resolved. Our smart contracts include dispute resolution mechanisms to protect both parties.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Do I need cryptocurrency knowledge?</h3>
                  <p className="text-gray-600">
                    No! Our AI agents handle everything. Just use natural language commands like "post a job" or "find jobs" - the agents do the rest.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Which wallets are supported?</h3>
                  <p className="text-gray-600">
                    We support MetaMask, WalletConnect, and other Web3 wallets. Make sure you're connected to Base Sepolia testnet.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Is this on mainnet?</h3>
                  <p className="text-gray-600">
                    Currently, ReputeFlow is deployed on <Badge variant="outline">Base Sepolia testnet</Badge> for testing and demonstration. 
                    Mainnet deployment is planned for Q2 2025.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">How do I get help?</h3>
                  <p className="text-gray-600">
                    Join our community on Discord or check our GitHub repository for technical documentation and support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
