'use client'

import { useState, useEffect } from 'react'
import { Bot, Activity, CheckCircle, XCircle, Zap } from 'lucide-react'
import { getAgentInfo, getAgentStatus } from '@/lib/agents'
import { useAccount } from 'wagmi'

/**
 * Agent Debug Panel
 * Shows real-time agent activity and status
 */
export default function AgentDebugPanel() {
  const { address } = useAccount()
  const [agentInfo, setAgentInfo] = useState<any>(null)
  const [agentStatus, setAgentStatus] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (address) {
      loadAgentInfo()
      
      // Refresh every 5 seconds
      const interval = setInterval(loadAgentInfo, 5000)
      return () => clearInterval(interval)
    }
  }, [address])

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log
    console.log = (...args) => {
      originalLog(...args)
      
      const message = args.join(' ')
      // Only capture agent-related logs
      if (message.includes('🤖') || message.includes('📡') || message.includes('📨') || 
          message.includes('🔍') || message.includes('⭐') || message.includes('💰') ||
          message.includes('🟡') || message.includes('📦')) {
        setLogs(prev => [...prev.slice(-19), message]) // Keep last 20 logs
      }
    }

    return () => {
      console.log = originalLog
    }
  }, [])

  const loadAgentInfo = () => {
    if (!address) return
    
    const info = getAgentInfo(address)
    const status = getAgentStatus(address)
    
    setAgentInfo(info)
    setAgentStatus(status)
  }

  if (!address) return null

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        title="Agent Debug Panel"
      >
        <Bot className="h-6 w-6" />
        {agentStatus?.isActive && (
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <h3 className="font-bold">Agent Debug Panel</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded p-1 transition"
              >
                ×
              </button>
            </div>
          </div>

          {/* Agent Status */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Agent Status</span>
              {agentStatus?.isActive ? (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>Not Registered</span>
                </div>
              )}
            </div>

            {agentInfo && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-mono text-gray-900">{agentInfo.agentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-mono text-gray-900">
                    {agentInfo.agentAddress?.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Registered:</span>
                  <span className="text-gray-900">
                    {new Date(agentInfo.registeredAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Recent Activity</span>
              <button
                onClick={() => setLogs([])}
                className="ml-auto text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No agent activity yet</p>
                  <p className="text-xs mt-1">Perform actions to see logs</p>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 break-words"
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t bg-gray-50">
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>💡 Tip:</strong> Watch this panel while:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Creating jobs (agent broadcast)</li>
                <li>Submitting proposals (notifications)</li>
                <li>Approving milestones (validation)</li>
                <li>Viewing reputation (oracle query)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
