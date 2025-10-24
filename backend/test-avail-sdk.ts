import { testAvailIntegration } from './services/availService';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../contracts/.env' });

/**
 * Test Avail Nexus SDK Integration
 */

async function main() {
  console.log('🧪 Testing Avail Nexus SDK Integration\n');
  console.log('=' .repeat(80));
  console.log('AVAIL NEXUS SDK TEST');
  console.log('=' .repeat(80) + '\n');

  try {
    await testAvailIntegration();

    console.log('\n' + '='.repeat(80));
    console.log('🎉 AVAIL NEXUS SDK TEST COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n✅ Integration Status: WORKING');
    console.log('✅ Avail Nexus SDK: INSTALLED');
    console.log('✅ AvailIntentRouter: DEPLOYED');
    console.log('\n📋 Next Steps:');
    console.log('  1. Create cross-chain payment intents');
    console.log('  2. Test unified balance management');
    console.log('  3. Integrate with WorkEscrow');
    console.log('  4. Test cross-chain workflows\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.log('  1. Check AVAIL_INTENT_ROUTER in .env');
    console.log('  2. Verify contract is deployed');
    console.log('  3. Ensure wallet has testnet ETH');
    console.log('  4. Check RPC connectivity');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
