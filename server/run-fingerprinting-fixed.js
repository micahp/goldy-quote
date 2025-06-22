#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure we're in the server directory
process.chdir(__dirname);
console.log('📁 Working directory:', process.cwd());

const carriers = [
  {
    name: 'Progressive',
    script: './fingerprint-progressive.js',
    url: 'https://www.progressive.com',
    timeout: 900000 // 15 minutes total
  },
  {
    name: 'State Farm', 
    script: './fingerprint-statefarm.js',
    url: 'https://www.statefarm.com',
    timeout: 900000 // 15 minutes total
  },
  {
    name: 'Liberty Mutual',
    script: './fingerprint-libertymutual.js', 
    url: 'https://www.libertymutual.com',
    timeout: 900000 // 15 minutes total
  }
];

async function runCarrierFingerprint(carrier) {
  return new Promise((resolve) => {
    console.log(`\n🚀 Starting ${carrier.name} fingerprinting...`);
    console.log(`📍 Target: ${carrier.url}`);
    console.log(`⏱️  Timeout: ${carrier.timeout / 1000}s`);
    
    const startTime = Date.now();
    
    // Check if script exists
    if (!fs.existsSync(carrier.script)) {
      console.log(`❌ Script not found: ${carrier.script}`);
      resolve({ 
        carrier: carrier.name, 
        success: false, 
        error: 'Script file not found',
        duration: 0
      });
      return;
    }
    
    const child = spawn('node', [carrier.script], {
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: carrier.timeout
    });
    
    let timeoutId = setTimeout(() => {
      console.log(`⏰ ${carrier.name} timeout reached, terminating...`);
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
    }, carrier.timeout);
    
    child.on('exit', (code, signal) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        console.log(`⏰ ${carrier.name} - TIMEOUT after ${minutes}m ${seconds}s`);
        resolve({ 
          carrier: carrier.name, 
          success: false, 
          error: 'Timeout',
          duration: duration
        });
      } else if (code === 0) {
        console.log(`✅ ${carrier.name} - SUCCESS in ${minutes}m ${seconds}s`);
        resolve({ 
          carrier: carrier.name, 
          success: true, 
          error: null,
          duration: duration
        });
      } else {
        console.log(`❌ ${carrier.name} - FAILED (exit code: ${code}) in ${minutes}m ${seconds}s`);
        resolve({ 
          carrier: carrier.name, 
          success: false, 
          error: `Exit code: ${code}`,
          duration: duration
        });
      }
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log(`❌ ${carrier.name} - ERROR: ${error.message}`);
      resolve({ 
        carrier: carrier.name, 
        success: false, 
        error: error.message,
        duration: duration
      });
    });
  });
}

async function runAllCarriers() {
  console.log('🎯 === CARRIER FINGERPRINTING EXECUTION ===');
  console.log(`📁 Working Directory: ${process.cwd()}`);
  console.log(`🕐 Start Time: ${new Date().toLocaleString()}`);
  
  const results = [];
  
  // Run carriers sequentially to avoid resource conflicts
  for (const carrier of carriers) {
    const result = await runCarrierFingerprint(carrier);
    results.push(result);
    
    // Brief pause between carriers
    if (carrier !== carriers[carriers.length - 1]) {
      console.log('\n⏸️  Pausing 10 seconds before next carrier...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  // Final report
  console.log('\n📊 === FINAL EXECUTION REPORT ===');
  console.log(`🕐 End Time: ${new Date().toLocaleString()}`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    const minutes = Math.floor(r.duration / 60000);
    const seconds = Math.floor((r.duration % 60000) / 1000);
    console.log(`   ✓ ${r.carrier} (${minutes}m ${seconds}s)`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      const minutes = Math.floor(r.duration / 60000);
      const seconds = Math.floor((r.duration % 60000) / 1000);
      console.log(`   ✗ ${r.carrier}: ${r.error} (${minutes}m ${seconds}s)`);
    });
  }
  
  // List generated screenshots
  console.log('\n📸 Generated Screenshots:');
  const screenshots = fs.readdirSync('.').filter(file => 
    file.endsWith('.png') && !file.includes('test')
  );
  
  if (screenshots.length > 0) {
    screenshots.forEach(screenshot => {
      console.log(`   📷 ${screenshot}`);
    });
  } else {
    console.log('   (No screenshots found)');
  }
  
  console.log('\n🏁 Fingerprinting execution complete!');
  
  return results;
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n🛑 Fingerprinting interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Fingerprinting terminated');
  process.exit(0);
});

// Run the fingerprinting
runAllCarriers().catch(console.error); 