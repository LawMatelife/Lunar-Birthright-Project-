import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const frontendDir = path.join(root, 'frontend');
const packageJsonPath = path.join(frontendDir, 'package.json');
const appJsPath = path.join(frontendDir, 'src', 'App.js');

// Marker to prevent duplicate patching
const MARKER = 'VERCEL_SPEED_INSIGHTS_INSTALLED';

console.log('Applying Vercel Speed Insights patch...');

// Check if frontend directory exists
if (!fs.existsSync(frontendDir)) {
  throw new Error('frontend directory not found; run build.mjs first');
}

// Check if already patched
if (fs.existsSync(appJsPath)) {
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  if (appJs.includes('@vercel/speed-insights')) {
    console.log('VERCEL_SPEED_INSIGHTS_ALREADY_INSTALLED');
    process.exit(0);
  }
}

// Step 1: Update package.json to add @vercel/speed-insights
console.log('Updating package.json...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies['@vercel/speed-insights']) {
  packageJson.dependencies['@vercel/speed-insights'] = '^2.0.0';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log('Added @vercel/speed-insights to package.json');
} else {
  console.log('@vercel/speed-insights already in package.json');
}

// Step 2: Modify src/App.js to import and use SpeedInsights
console.log('Updating App.js...');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Add import statement after the react-router-dom import
if (!appJs.includes("from '@vercel/speed-insights/react'")) {
  appJs = appJs.replace(
    "import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';",
    "import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';\nimport { SpeedInsights } from '@vercel/speed-insights/react';"
  );
  console.log('Added SpeedInsights import');
}

// Add SpeedInsights component before closing </div> tag in the return statement
if (!appJs.includes('<SpeedInsights />')) {
  // Find the closing tags of the return statement
  // Looking for the pattern: </BrowserRouter>\n      </div> (with specific indentation)
  const pattern = '</BrowserRouter>\n    </div>\n  );';
  const replacement = '</BrowserRouter>\n      <SpeedInsights />\n    </div>\n  );';
  
  if (appJs.includes(pattern)) {
    appJs = appJs.replace(pattern, replacement);
    console.log('Added SpeedInsights component');
  } else {
    console.warn('Could not find exact pattern to insert SpeedInsights component');
    // Try alternative pattern without extra spaces
    const altPattern = '</BrowserRouter>\n    </div>';
    if (appJs.includes(altPattern)) {
      appJs = appJs.replace(
        altPattern,
        '</BrowserRouter>\n      <SpeedInsights />\n    </div>'
      );
      console.log('Added SpeedInsights component (alternative pattern)');
    }
  }
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('App.js updated successfully');

// Step 3: Install the package
console.log('Installing @vercel/speed-insights...');
try {
  execSync('npm install --legacy-peer-deps', {
    cwd: frontendDir,
    stdio: 'inherit'
  });
  console.log('Package installed successfully');
} catch (error) {
  console.error('Failed to install package:', error.message);
  process.exit(1);
}

console.log('VERCEL_SPEED_INSIGHTS_PATCH_COMPLETE');
