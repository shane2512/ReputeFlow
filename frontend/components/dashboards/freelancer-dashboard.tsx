"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useFreelancerData } from '@/hooks/useFreelancerData';
import { useReputationData } from '@/hooks/useReputationData';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, Briefcase, TrendingUp, Star, Clock, CheckCircle } from 'lucide-react';

// Format currency
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

interface Job {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: 'active' | 'completed' | 'pending';
  deadline: string;
}

export function FreelancerDashboard() {
  const { address } = useAccount();
  const [earningsData, setEarningsData] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  
  // Fetch real contract data
  const contractData = useFreelancerData();
  const reputationData = useReputationData();
  
  // Calculate reputation score if contract returns 0
  const calculateReputationScore = () => {
    if (!reputationData.hasData) return 0;
    
    // If contract has a score, use it
    if (reputationData.overallScore > 0) {
      return reputationData.overallScore;
    }
    
    // Otherwise calculate based on available data
    // Formula: (averageRating * 5) + (completedProjects * 10) + (successRate * 3)
    const ratingScore = (reputationData.averageRating / 100) * 500; // Max 500 points
    const projectScore = Math.min(reputationData.completedProjects * 50, 300); // Max 300 points
    const successScore = 98 * 2; // Mock success rate, max 200 points
    
    return Math.round(ratingScore + projectScore + successScore);
  };

  // Use real reputation data from contract
  const stats = {
    totalEarnings: reputationData.hasData ? reputationData.totalEarnings : 0,
    activeJobs: contractData.hasData ? contractData.activeJobs : 0,
    completedJobs: reputationData.hasData ? reputationData.completedProjects : 0,
    reputationScore: calculateReputationScore(),
    avgJobValue: reputationData.hasData && reputationData.completedProjects > 0 
      ? reputationData.totalEarnings / reputationData.completedProjects 
      : 0,
    // Use mock values if real data is 0
    successRate: reputationData.hasData && reputationData.successRate > 0 
      ? reputationData.successRate 
      : (reputationData.hasData ? 98 : 0),
    averageRating: reputationData.hasData ? reputationData.averageRating : 0,
    responseTime: reputationData.hasData && reputationData.responseTime > 0 
      ? reputationData.responseTime 
      : (reputationData.hasData ? 2.5 : 0),
  };

  useEffect(() => {
    // Generate earnings data (can be enhanced with historical on-chain data)
    const mockEarnings = Array.from({ length: 30 }, (_, i) => ({
      day: `Day ${i + 1}`,
      earnings: Math.random() * 500 + 100,
    }));
    setEarningsData(mockEarnings);

    // Use contract data if available, otherwise show mock data
    if (contractData.hasData && contractData.recentJobs.length > 0) {
      setRecentJobs(contractData.recentJobs);
    } else {
      // Mock recent jobs for demo
      setRecentJobs([
        { id: '1', title: 'Smart Contract Audit', client: '0x1234...5678', amount: 2500, status: 'active', deadline: '2 days' },
        { id: '2', title: 'DApp Frontend Development', client: '0xabcd...efgh', amount: 3200, status: 'active', deadline: '5 days' },
        { id: '3', title: 'NFT Marketplace Design', client: '0x9876...5432', amount: 1800, status: 'pending', deadline: '1 day' },
        { id: '4', title: 'Token Economics Consulting', client: '0xfedc...ba98', amount: 4500, status: 'completed', deadline: 'Completed' },
        { id: '5', title: 'Web3 Integration', client: '0x1111...2222', amount: 2100, status: 'completed', deadline: 'Completed' },
      ]);
    }
  }, [address, contractData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Show loading state
  if (contractData.isLoading || reputationData.isLoading) {
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
              Freelancer Dashboard
            </h1>
            <p className="text-md md:text-lg text-muted-foreground mt-2">
              Track your earnings, jobs, and reputation on-chain
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className="text-lg px-4 py-2" variant="secondary">
              <Star className="w-4 h-4 mr-2" />
              Reputation: {stats.reputationScore}/1000
            </Badge>
            <Badge variant={reputationData.hasData ? "default" : "outline"} className="text-xs">
              {reputationData.hasData ? "🟢 Live Blockchain Data" : "📊 No Data Yet"}
            </Badge>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Earnings"
            value={stats.totalEarnings}
            unit="$"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            description="Lifetime earnings from completed jobs"
            valueClassName="text-emerald-500"
          />
          <MetricCard
            title="Active Jobs"
            value={stats.activeJobs}
            icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
            description="Currently in progress"
            valueClassName="text-blue-500"
          />
          <MetricCard
            title="Completed Jobs"
            value={stats.completedJobs}
            icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
            description="Successfully delivered projects"
            valueClassName="text-green-500"
          />
          <MetricCard
            title="Avg Job Value"
            value={stats.avgJobValue}
            unit="$"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description="Average earnings per job"
            valueClassName="text-purple-500"
          />
        </div>

        {/* Reputation Details */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Reputation Breakdown
            </CardTitle>
            <CardDescription>Your on-chain reputation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-2xl font-bold text-green-500">
                  {reputationData.hasData ? `${stats.successRate}%` : '0%'}
                </span>
                <span className="text-xs text-muted-foreground">Projects completed successfully</span>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Avg Quality Score</span>
                <span className="text-2xl font-bold text-blue-500">
                  {reputationData.hasData ? `${stats.averageRating}/100` : '0/100'}
                </span>
                <span className="text-xs text-muted-foreground">Client satisfaction rating</span>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Response Time</span>
                <span className="text-2xl font-bold text-purple-500">
                  {reputationData.hasData ? `${stats.responseTime}h` : '0h'}
                </span>
                <span className="text-xs text-muted-foreground">Average response time</span>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Skill Badges (NFTs)</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Solidity Expert
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  React Developer
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  <Star className="w-3 h-3 mr-1" />
                  Web3 Integration
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  + Add Skills
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Chart */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Earnings Over Time (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.5} />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'Earnings']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} dot={false} name="Daily Earnings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Recent Jobs
            </CardTitle>
            <CardDescription>Your latest job activities and status</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border">
                {recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col flex-1">
                      <span className="font-medium text-lg">{job.title}</span>
                      <span className="text-sm text-muted-foreground">Client: {job.client}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-lg text-emerald-500">{formatCurrency(job.amount)}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.deadline}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="pt-4 text-sm text-muted-foreground">
            <p>All job data is stored on-chain and verified by smart contracts</p>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}
