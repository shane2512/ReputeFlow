"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Briefcase, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Dashboard", icon: Briefcase, href: "/dashboard" },
  { label: "Chat", icon: MessageSquare, href: "/chat" },
];

type NavBarProps = {
  className?: string;
  defaultIndex?: number;
};

export function NavBar({ className, defaultIndex = 0 }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const handleNavigation = (href: string, index: number) => {
    setActiveIndex(index);
    router.push(href);
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Main Navigation"
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-card/80 dark:bg-card/80 backdrop-blur-lg border border-border dark:border-sidebar-border rounded-full flex items-center justify-between p-2 shadow-xl min-w-[320px] max-w-[95vw] h-[52px]",
        className
      )}
    >
      {/* Navigation Items */}
      <div className="flex items-center space-x-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeIndex === idx;

          return (
            <motion.button
              key={item.label}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "flex items-center gap-0 px-3 py-2 rounded-full transition-colors duration-200 relative h-10 min-w-[44px] min-h-[40px] max-h-[44px]",
                isActive
                  ? "bg-primary/10 dark:bg-primary/15 text-primary dark:text-primary gap-2"
                  : "bg-transparent text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted",
                "focus:outline-none focus-visible:ring-0"
              )}
              onClick={() => handleNavigation(item.href, idx)}
              aria-label={item.label}
              type="button"
            >
              <Icon
                size={20}
                strokeWidth={2}
                aria-hidden
                className="transition-colors duration-200"
              />

              <motion.div
                initial={false}
                animate={{
                  width: isActive ? "auto" : "0px",
                  opacity: isActive ? 1 : 0,
                  marginLeft: isActive ? "8px" : "0px",
                }}
                transition={{
                  width: { type: "spring", stiffness: 350, damping: 32 },
                  opacity: { duration: 0.19 },
                  marginLeft: { duration: 0.19 },
                }}
                className="overflow-hidden flex items-center"
              >
                <span
                  className={cn(
                    "font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200",
                    isActive ? "text-primary dark:text-primary" : "opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Connect Wallet Button */}
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <motion.div
              whileTap={{ scale: 0.97 }}
              style={{
                ...(!ready && {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }),
              }}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="rounded-full h-9 px-4 gap-2 font-medium text-xs transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="rounded-full h-9 px-4 gap-2 font-medium text-xs transition-all duration-200 bg-red-500 hover:bg-red-600 text-white flex items-center"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <div className="flex gap-2">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="rounded-full h-9 px-3 font-medium text-xs transition-all duration-200 bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-2"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 16, height: 16 }}
                            />
                          )}
                        </div>
                      )}
                      <span className="hidden sm:inline">{chain.name}</span>
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="rounded-full h-9 px-4 font-medium text-xs transition-all duration-200 bg-green-500 hover:bg-green-600 text-white flex items-center"
                    >
                      {account.displayName}
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          );
        }}
      </ConnectButton.Custom>
    </motion.nav>
  );
}

export default NavBar;
