import { NextResponse } from 'next/server';

export async function GET() {
  const ASI_ONE_API_KEY = process.env.ASI_ONE_API_KEY;
  const FREELANCER_AGENT_ADDRESS = process.env.FREELANCER_AGENT_ADDRESS;
  const CLIENT_AGENT_ADDRESS = process.env.CLIENT_AGENT_ADDRESS;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      ASI_ONE_API_KEY: ASI_ONE_API_KEY 
        ? `Set (${ASI_ONE_API_KEY.substring(0, 10)}...${ASI_ONE_API_KEY.substring(ASI_ONE_API_KEY.length - 10)})` 
        : '❌ MISSING',
      ASI_ONE_API_KEY_LENGTH: ASI_ONE_API_KEY?.length || 0,
      FREELANCER_AGENT_ADDRESS: FREELANCER_AGENT_ADDRESS || '❌ MISSING',
      CLIENT_AGENT_ADDRESS: CLIENT_AGENT_ADDRESS || '❌ MISSING',
    },
    status: (!ASI_ONE_API_KEY || !FREELANCER_AGENT_ADDRESS || !CLIENT_AGENT_ADDRESS) 
      ? '❌ Configuration incomplete' 
      : '✅ Configuration complete',
  });
}
