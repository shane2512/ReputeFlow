"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/ui/animated-hero";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Footer } from "@/components/ui/footer";
import { Marquee } from "@/components/ui/marquee";
import Squares from "@/components/ui/squares";
import { NavBar } from "@/components/ui/navbar";
import { RoleSelectionModal } from "@/components/role-selection-modal";

export default function Home() {
  const router = useRouter();
  const terms = [
    "Decentralized Identity",
    "Smart Contracts",
    "Web3 Freelancing",
    "On-Chain Reputation",
    "Blockchain Verification",
    "Trustless Escrow",
    "Immutable Records",
    "Verifiable Credentials",
    "DeFi Payments",
    "Token Rewards",
    "Peer-to-Peer",
    "Transparent Reviews",
  ];

  return (
    <div className="relative w-full">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 w-screen h-screen">
        <Squares 
          speed={0.1} 
          squareSize={40}
          direction='diagonal'
          borderColor='#e5e5e5'
          hoverFillColor='#f5f5f5'
        />
      </div>

      {/* Navigation Bar */}
      <NavBar />

      {/* Docs Button - Top Right Corner */}
      <button
        onClick={() => router.push('/docs')}
        className="fixed top-4 right-4 z-50 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
      >
        Docs
      </button>

      {/* Role Selection Modal */}
      <RoleSelectionModal />

      {/* Hero Section */}
      <Hero />

      {/* Marquee Section */}
      <Marquee pauseOnHover speed={40}>
        {terms.map((term, index) => (
          <div
            key={index}
            className="mx-8 text-2xl md:text-3xl font-semibold text-muted-foreground whitespace-nowrap"
          >
            {term}
          </div>
        ))}
      </Marquee>

      {/* Scroll Animation Section */}
      <div className="flex flex-col overflow-hidden">
        <ContainerScroll
          titleComponent={
            <>
              <h1 className="text-4xl font-semibold text-black dark:text-white">
                Manage your freelance career with <br />
                <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none">
                  Web3 Technology
                </span>
              </h1>
            </>
          }
        >
          <Image
            src="/placeholder-dashboard.svg"
            alt="ReputeFlow Dashboard"
            height={720}
            width={1400}
            className="mx-auto rounded-2xl object-cover h-full object-left-top"
            draggable={false}
          />
        </ContainerScroll>
      </div>

      {/* Footer Section */}
      <Footer />
    </div>
  );
}
