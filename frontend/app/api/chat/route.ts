import { NextRequest, NextResponse } from 'next/server';

// Agent HTTP endpoints from Agentverse
const CLIENT_AGENT_URL = process.env.CLIENT_AGENT_URL || process.env.NEXT_PUBLIC_CLIENT_AGENT_URL;
const FREELANCER_AGENT_URL = process.env.FREELANCER_AGENT_URL || process.env.NEXT_PUBLIC_FREELANCER_AGENT_URL;

// Fallback to OpenRouter if agent URLs not configured
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function queryAgentverse(agentUrl: string, message: string, walletAddress?: string): Promise<any> {
  if (!agentUrl) {
    throw new Error('Agent URL not configured');
  }

  const payload = {
    text: walletAddress ? `[WALLET:${walletAddress}] ${message}` : message,
    timestamp: new Date().toISOString()
  };

  const response = await fetch(agentUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`Agent request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function queryOpenRouterFallback(message: string, userRole: string, walletAddress?: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('No agent URL or OpenRouter API key configured');
  }

  const systemPrompt = userRole === 'client' 
    ? `You are a helpful AI assistant for ReputeFlow clients. Help them post jobs, review proposals, and manage freelancers. 
       Available commands: "post a job for [title] budget:[amount]$ skills:[skill1,skill2]", "accept proposal for job [id]", "approve deliverable for job [id]".
       ${walletAddress ? `User wallet: ${walletAddress}` : ''}`
    : `You are a helpful AI assistant for ReputeFlow freelancers. Help them find jobs, submit proposals, and manage their work.
       Available commands: "register my skills [skill1] [skill2]", "find jobs", "apply job: [id]", "submit deliverable for job [id]".
       ${walletAddress ? `User wallet: ${walletAddress}` : ''}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://reputeflow.vercel.app',
      'X-Title': 'ReputeFlow'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, but I was unable to process your request.';
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

    // Select agent URL based on user role
    const agentUrl = userRole === 'client' ? CLIENT_AGENT_URL : FREELANCER_AGENT_URL;
    
    console.log(`🤖 Routing to ${userRole} agent:`, agentUrl ? 'Agentverse' : 'OpenRouter fallback');
    console.log(`👛 Wallet address:`, walletAddress);
    
    let responseText: string;
    let source: string;

    try {
      if (agentUrl) {
        // Try Agentverse first
        const agentResult = await queryAgentverse(agentUrl, message, walletAddress);
        responseText = agentResult.response || agentResult.text || agentResult.message || JSON.stringify(agentResult);
        source = 'agentverse';
        console.log('✅ Agentverse response received');
      } else {
        throw new Error('No agent URL configured, using fallback');
      }
    } catch (agentError) {
      // Fallback to OpenRouter
      console.log('⚠️ Agentverse failed, trying OpenRouter fallback:', agentError);
      
      if (!OPENROUTER_API_KEY) {
        throw new Error('Neither Agentverse nor OpenRouter is configured');
      }
      
      responseText = await queryOpenRouterFallback(message, userRole, walletAddress);
      source = 'openrouter';
      console.log('✅ OpenRouter fallback response received');
    }

    return NextResponse.json({ 
      response: responseText,
      success: true,
      source,
      userRole,
      walletAddress
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { 
        response: 'I apologize, but I was unable to process your request. Please try again later.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
