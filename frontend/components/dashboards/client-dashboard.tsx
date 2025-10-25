"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useClientData } from '@/hooks/useClientData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Users, TrendingUp, Briefcase, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
  description?: string;
  valueClassName?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit = '', icon, description, valueClassName }) => (
  <Card className="flex-1 min-w-[250px]">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${valueClassName}`}>
        {unit}{typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

interface Project {
  id: string;
  title: string;
  freelancer: string;
  budget: number;
  status: 'active' | 'completed' | 'in_escrow' | 'disputed';
  progress: number;
  deadline: string;
}

export function ClientDashboard() {
  const { address } = useAccount();
  const [spendingData, setSpendingData] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  
  // Fetch real contract data
  const contractData = useClientData();
  
  // Use contract data or fallback to zero for real data
  const stats = {
    totalSpent: contractData.hasData ? contractData.totalSpent : 0,
    activeProjects: contractData.hasData ? contractData.activeProjects : 0,
    completedProjects: contractData.hasData ? contractData.completedProjects : 0,
    avgProjectCost: contractData.hasData ? contractData.avgProjectCost : 0,
  };

  useEffect(() => {
    // Generate spending data once on mount
    const mockSpending = Array.from({ length: 30 }, (_, i) => ({
      day: `Day ${i + 1}`,
      spending: Math.random() * 1000 + 200,
    }));
    setSpendingData(mockSpending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate effect for projects data
  useEffect(() => {
    // Use contract data if available, otherwise show mock data
    if (contractData.hasData && contractData.activeProjectsList.length > 0) {
      setActiveProjects(contractData.activeProjectsList);
    } else if (!contractData.isLoading) {
      // Only set mock data if not loading
      setActiveProjects([
        { id: '1', title: 'DeFi Protocol Development', freelancer: '0x1234...5678', budget: 5000, status: 'active', progress: 65, deadline: '10 days' },
        { id: '2', title: 'Smart Contract Security Audit', freelancer: '0xabcd...efgh', budget: 3500, status: 'in_escrow', progress: 100, deadline: 'In Review' },
        { id: '3', title: 'NFT Marketplace UI/UX', freelancer: '0x9876...5432', budget: 2800, status: 'active', progress: 40, deadline: '15 days' },
        { id: '4', title: 'Tokenomics Whitepaper', freelancer: '0xfedc...ba98', budget: 1500, status: 'active', progress: 80, deadline: '3 days' },
        { id: '5', title: 'DAO Governance Implementation', freelancer: '0x1111...2222', budget: 4200, status: 'completed', progress: 100, deadline: 'Completed' },
        { id: '6', title: 'Cross-chain Bridge Integration', freelancer: '0x3333...4444', budget: 3800, status: 'disputed', progress: 50, deadline: 'Disputed' },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractData.isLoading]);

  // Convert numeric status to string
  const getStatusString = (status: number | string): string => {
    if (typeof status === 'string') return status;
    // Status: 0=Created, 1=InProgress, 2=Completed, 3=Disputed
    switch (status) {
      case 0: return 'created';
      case 1: return 'in_progress';
      case 2: return 'completed';
      case 3: return 'disputed';
      default: return 'unknown';
    }
  };

  const getStatusColor = (status: number | string) => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'created':
      case 'in_progress':
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'in_escrow': return 'bg-yellow-500';
      case 'disputed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: number | string) => {
    const statusStr = getStatusString(status);
    switch (statusStr) {
      case 'created':
      case 'in_progress':
      case 'active': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'in_escrow': return <DollarSign className="w-3 h-3" />;
      case 'disputed': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  // Show loading state
  if (contractData.isLoading) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading dashboard data from blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-background text-foreground p-4 md:p-8 pt-20 md:pt-24 flex flex-col gap-4 md:gap-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
              Client Dashboard
            </h1>
            <p className="text-md md:text-lg text-muted-foreground mt-2">
              Manage your projects, payments, and freelancer relationships
            </p>
          </div>
          <Badge variant={contractData.hasData ? "default" : "outline"} className="text-xs">
            {contractData.hasData ? "🟢 Live Blockchain Data" : "📊 No Data Yet"}
          </Badge>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Spent"
            value={stats.totalSpent}
            unit="$"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            description="Lifetime project spending"
            valueClassName="text-purple-500"
          />
          <MetricCard
            title="Active Projects"
            value={stats.activeProjects}
            icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
            description="Currently in progress"
            valueClassName="text-blue-500"
          />
          <MetricCard
            title="Completed"
            value={stats.completedProjects}
            icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
            description="Successfully delivered"
            valueClassName="text-green-500"
          />
          <MetricCard
            title="Avg Project Cost"
            value={stats.avgProjectCost}
            unit="$"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description="Average spend per project"
            valueClassName="text-cyan-500"
          />
        </div>

        {/* Spending Chart */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Project Spending Over Time (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Spending']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="spending" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Daily Spending" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Project Overview
            </CardTitle>
            <CardDescription>Track all your active and recent projects</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[450px]">
              <div className="divide-y divide-border">
                {activeProjects.map((project) => (
                  <div key={project.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <span className="font-medium text-lg block">{project.title}</span>
                        <span className="text-sm text-muted-foreground">Freelancer: {project.freelancer}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-lg text-purple-500">{formatCurrency(project.budget)}</span>
                        <Badge className={`${getStatusColor(project.status)} flex items-center gap-1`}>
                          {getStatusIcon(project.status)}
                          {getStatusString(project.status).replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{project.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {project.deadline}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="pt-4 text-sm text-muted-foreground">
            <p>All payments are secured in smart contract escrow until milestone completion</p>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
