#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Compile TypeScript
console.log('Compiling TypeScript tests...');
execSync('tsc --incremental -p tests/tsconfig.json', { stdio: 'inherit' });

// Function to rename .js to .cjs recursively
function renameJsFiles(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      renameJsFiles(fullPath);
    } else if (item.endsWith('.js')) {
      const newPath = fullPath.replace(/\.js$/, '.cjs');
      fs.renameSync(fullPath, newPath);
      console.log(`Renamed ${fullPath} to ${newPath}`);
    }
  }
}

// Rename all .js files to .cjs
console.log('Renaming .js files to .cjs...');
renameJsFiles('./tests-out');

console.log('Test compilation complete!'); 