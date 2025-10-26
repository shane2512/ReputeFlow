import { NextRequest, NextResponse } from 'next/server';

// Agent addresses from environment variables
const CLIENT_AGENT_ADDRESS = process.env.CLIENT_AGENT_ADDRESS || 'agent1q2hsemdsdl6g4rxdfdhlxunq7yzueysqt0y2890ukw5zlr7y6nk6cwaeeer';
const FREELANCER_AGENT_ADDRESS = process.env.FREELANCER_AGENT_ADDRESS || 'agent1q26w2hk4mp9d96gwd8dhs5ed55ellur86xgpf863af00ljjw060qy6xn59w';

let clientInstance: any = null;

async function getClient() {
  if (!clientInstance) {
    const UAgentClientModule = await import('uagent-client');
    const UAgentClient = UAgentClientModule.default || UAgentClientModule;
    
    clientInstance = new (UAgentClient as any)({
      timeout: 60000,
      autoStartBridge: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return clientInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userRole, walletAddress } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    if (!userRole || (userRole !== 'client' && userRole !== 'freelancer')) {
      return NextResponse.json(
        { error: 'Invalid or missing userRole. Must be "client" or "freelancer"' },
        { status: 400 }
      );
    }

    // Select agent address based on user role
    const agentAddress = userRole === 'client' ? CLIENT_AGENT_ADDRESS : FREELANCER_AGENT_ADDRESS;
    
    console.log(`🤖 Routing to ${userRole} agent:`, agentAddress);
    console.log(`👛 Wallet address:`, walletAddress);
    
    const client = await getClient();
    
    // Embed wallet address in message if available
    let messageToSend = message;
    if (walletAddress) {
      messageToSend = `[WALLET:${walletAddress}] ${message}`;
    }
    
    const result = await client.query(agentAddress, messageToSend);

    if (result.success) {
      return NextResponse.json({ 
        response: result.response,
        success: true,
        source: 'uagent',
        agentAddress,
        userRole,
        walletAddress
      });
    } else {
      console.error(`❌ Agent query failed for ${userRole}:`, result.error);
      return NextResponse.json({ 
        response: 'I apologize, but I was unable to process your request at this time.',
        success: false,
        error: result.error,
        agentAddress,
        userRole
      });
    }
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { 
        response: 'An error occurred while processing your request.',
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
