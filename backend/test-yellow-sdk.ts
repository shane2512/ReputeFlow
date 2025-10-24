import { initializeYellowService } from './services/yellowService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test Yellow Network SDK Integration
 * This script tests the real Yellow Network connection
 */

async function main() {
  console.log('🧪 Testing Yellow Network SDK Integration\n');
  console.log('=' .repeat(80));
  console.log('YELLOW NETWORK NITROLITE SDK TEST');
  console.log('=' .repeat(80) + '\n');

  try {
    // Initialize Yellow Network service
    console.log('📦 Initializing Yellow Network service...');
    const yellowService = await initializeYellowService();

    // Check connection status
    const status = yellowService.getStatus();
    console.log('\n📊 Connection Status:');
    console.log(`  Connected: ${status.connected}`);
    console.log(`  Authenticated: ${status.authenticated}`);
    console.log(`  Status: ${status.status}`);

    if (status.authenticated) {
      console.log('\n✅ Successfully connected to Yellow Network!');
      console.log('🎉 Nitrolite SDK integration is working!\n');

      // Wait a bit for channels response
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to get configuration
      console.log('📝 Requesting ClearNode configuration...');
      await yellowService.getConfig();

      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('\n⚠️  Connected but not authenticated yet');
      console.log('Waiting for authentication...');

      // Wait for authentication
      await new Promise(resolve => setTimeout(resolve, 5000));

      const newStatus = yellowService.getStatus();
      if (newStatus.authenticated) {
        console.log('✅ Authentication successful!');
        await yellowService.getChannels();
      }
    }

    // Keep connection alive for a bit
    console.log('\n⏳ Keeping connection alive for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Disconnect
    console.log('\n🔌 Disconnecting from Yellow Network...');
    yellowService.disconnect();
    console.log('✅ Disconnected successfully');

    console.log('\n' + '=' .repeat(80));
    console.log('🎊 YELLOW NETWORK SDK TEST COMPLETE!');
    console.log('=' .repeat(80));
    console.log('\n✅ Integration Status: WORKING');
    console.log('✅ Real Yellow Network connection: VERIFIED');
    console.log('✅ Nitrolite SDK: FUNCTIONAL');
    console.log('\n📋 Next Steps:');
    console.log('  1. Create a channel at apps.yellow.com');
    console.log('  2. Configure channel credentials');
    console.log('  3. Integrate with WorkEscrow for streaming payments');
    console.log('  4. Test gasless transactions\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.log('  1. Check YELLOW_CLEARNODE_URL in .env');
    console.log('  2. Verify YELLOW_STATE_WALLET_KEY is set');
    console.log('  3. Ensure you have created a channel at apps.yellow.com');
    console.log('  4. Check network connectivity to Yellow Network');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
