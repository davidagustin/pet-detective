const fs = require('fs');
const path = require('path');

// Test if the API route file exists and has proper exports
const apiRoutePath = path.join(__dirname, 'app', 'api', 'game', 'start', 'route.ts');

console.log('Testing API route configuration...');
console.log('API route path:', apiRoutePath);

if (fs.existsSync(apiRoutePath)) {
  console.log('✅ API route file exists');
  
  const routeContent = fs.readFileSync(apiRoutePath, 'utf8');
  
  // Check for POST export
  if (routeContent.includes('export async function POST')) {
    console.log('✅ POST handler is exported');
  } else {
    console.log('❌ POST handler is missing');
  }
  
  // Check for GET export
  if (routeContent.includes('export async function GET')) {
    console.log('✅ GET handler is exported');
  } else {
    console.log('❌ GET handler is missing');
  }
  
  // Check for proper imports
  if (routeContent.includes('import { NextRequest, NextResponse }')) {
    console.log('✅ Next.js imports are correct');
  } else {
    console.log('❌ Next.js imports are missing');
  }
  
} else {
  console.log('❌ API route file does not exist');
}

// Test directory structure
const apiDir = path.join(__dirname, 'app', 'api');
const gameDir = path.join(__dirname, 'app', 'api', 'game');
const startDir = path.join(__dirname, 'app', 'api', 'game', 'start');

console.log('\nTesting directory structure...');
console.log('API directory exists:', fs.existsSync(apiDir));
console.log('Game directory exists:', fs.existsSync(gameDir));
console.log('Start directory exists:', fs.existsSync(startDir));

// Check for route.ts file
const routeFile = path.join(startDir, 'route.ts');
console.log('Route file exists:', fs.existsSync(routeFile));

console.log('\nAPI route configuration test completed.');
