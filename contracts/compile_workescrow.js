const solc = require('solc');
const fs = require('fs');
const path = require('path');

console.log('🔨 Compiling WorkEscrow.sol...\n');

// Read the contract source
const contractPath = path.join(__dirname, 'core', 'WorkEscrow.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Read dependencies
const dependencies = {
    '@openzeppelin/contracts/access/AccessControl.sol': fs.readFileSync(
        path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'access', 'AccessControl.sol'),
        'utf8'
    ),
    '@openzeppelin/contracts/utils/ReentrancyGuard.sol': fs.readFileSync(
        path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'ReentrancyGuard.sol'),
        'utf8'
    ),
    '@openzeppelin/contracts/utils/Pausable.sol': fs.readFileSync(
        path.join(__dirname, 'node_modules', '@openzeppelin', 'contracts', 'utils', 'Pausable.sol'),
        'utf8'
    ),
    '@pythnetwork/pyth-sdk-solidity/IPyth.sol': fs.readFileSync(
        path.join(__dirname, 'node_modules', '@pythnetwork', 'pyth-sdk-solidity', 'IPyth.sol'),
        'utf8'
    ),
    '@pythnetwork/pyth-sdk-solidity/PythStructs.sol': fs.readFileSync(
        path.join(__dirname, 'node_modules', '@pythnetwork', 'pyth-sdk-solidity', 'PythStructs.sol'),
        'utf8'
    )
};

// Prepare input for solc
const input = {
    language: 'Solidity',
    sources: {
        'WorkEscrow.sol': { content: source },
        ...Object.fromEntries(
            Object.entries(dependencies).map(([key, value]) => [key, { content: value }])
        )
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        }
    }
};

// Compile
console.log('⏳ Compiling...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
        console.error('❌ Compilation failed:\n');
        errors.forEach(err => console.error(err.formattedMessage));
        process.exit(1);
    }
    // Show warnings
    const warnings = output.errors.filter(e => e.severity === 'warning');
    if (warnings.length > 0) {
        console.warn('⚠️  Warnings:\n');
        warnings.forEach(warn => console.warn(warn.formattedMessage));
    }
}

// Save output
const contract = output.contracts['WorkEscrow.sol']['WorkEscrow'];
const outputDir = path.join(__dirname, 'artifacts', 'contracts', 'core', 'WorkEscrow.sol');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const artifact = {
    contractName: 'WorkEscrow',
    abi: contract.abi,
    bytecode: '0x' + contract.evm.bytecode.object
};

fs.writeFileSync(
    path.join(outputDir, 'WorkEscrow.json'),
    JSON.stringify(artifact, null, 2)
);

console.log('✅ Compilation successful!');
console.log(`📁 Output: ${outputDir}/WorkEscrow.json`);
console.log(`📊 Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes`);
