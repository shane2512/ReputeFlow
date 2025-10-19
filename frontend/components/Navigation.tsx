'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { 
  Award, Briefcase, Search, Trophy, Menu, X, 
  Home, User, FileText, Bot
} from 'lucide-react'

/**
 * Main Navigation Component
 * Provides site-wide navigation with role-based links
 */
export default function Navigation() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <Award className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReputeFlow
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="/" icon={<Home className="h-4 w-4" />} active={isActive('/')}>
              Home
            </NavLink>
            
            <NavLink href="/jobs" icon={<Search className="h-4 w-4" />} active={isActive('/jobs')}>
              Browse Jobs
            </NavLink>

            {isConnected && (
              <>
                <NavLink 
                  href="/dashboard/client" 
                  icon={<Briefcase className="h-4 w-4" />} 
                  active={isActive('/dashboard/client')}
                >
                  Client Dashboard
                </NavLink>

                <NavLink 
                  href="/dashboard/freelancer" 
                  icon={<User className="h-4 w-4" />} 
                  active={isActive('/dashboard/freelancer')}
                >
                  Freelancer Dashboard
                </NavLink>

                <NavLink 
                  href="/reputation" 
                  icon={<Trophy className="h-4 w-4" />} 
                  active={isActive('/reputation')}
                >
                  Reputation
                </NavLink>
              </>
            )}
          </nav>

          {/* Connect Button */}
          <div className="hidden md:block">
            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col gap-2">
              <MobileNavLink href="/" icon={<Home className="h-5 w-5" />} active={isActive('/')}>
                Home
              </MobileNavLink>
              
              <MobileNavLink href="/jobs" icon={<Search className="h-5 w-5" />} active={isActive('/jobs')}>
                Browse Jobs
              </MobileNavLink>

              {isConnected && (
                <>
                  <MobileNavLink 
                    href="/dashboard/client" 
                    icon={<Briefcase className="h-5 w-5" />} 
                    active={isActive('/dashboard/client')}
                  >
                    Client Dashboard
                  </MobileNavLink>

                  <MobileNavLink 
                    href="/dashboard/freelancer" 
                    icon={<User className="h-5 w-5" />} 
                    active={isActive('/dashboard/freelancer')}
                  >
                    Freelancer Dashboard
                  </MobileNavLink>

                  <MobileNavLink 
                    href="/reputation" 
                    icon={<Trophy className="h-5 w-5" />} 
                    active={isActive('/reputation')}
                  >
                    Reputation
                  </MobileNavLink>
                </>
              )}

              <div className="mt-4 pt-4 border-t">
                <ConnectButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

// Desktop Nav Link
function NavLink({ href, icon, active, children }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
        active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

// Mobile Nav Link
function MobileNavLink({ href, icon, active, children }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
        active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}
