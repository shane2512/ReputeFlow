"use client";

import { useUser } from "@/lib/user-context";
import { useAccount } from "wagmi";
import { FreelancerDashboard } from "@/components/dashboards/freelancer-dashboard";
import { ClientDashboard } from "@/components/dashboards/client-dashboard";
import { NavBar } from "@/components/ui/navbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { userRole, setShowRoleSelection } = useUser();
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Select Your Role</CardTitle>
            <CardDescription>Please select whether you're a freelancer or client</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowRoleSelection(true)} className="w-full">
              Select Role
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
      <NavBar defaultIndex={1} />
      {userRole === 'freelancer' ? <FreelancerDashboard /> : <ClientDashboard />}
    </div>
  );
}
