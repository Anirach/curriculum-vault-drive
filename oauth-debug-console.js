// OAuth Debug Console Script
// Copy and paste this script into your browser console to debug OAuth issues

console.log('🔧 OAuth Debug Console Script Starting...');

// Function to check environment variables
function checkEnvironmentVariables() {
  console.log('\n🌍 === ENVIRONMENT VARIABLES CHECK ===');
  
  const envVars = {
    'VITE_GOOGLE_CLIENT_ID': import.meta?.env?.VITE_GOOGLE_CLIENT_ID,
    'VITE_GOOGLE_CLIENT_SECRET': import.meta?.env?.VITE_GOOGLE_CLIENT_SECRET,
    'VITE_GOOGLE_DRIVE_URL': import.meta?.env?.VITE_GOOGLE_DRIVE_URL,
    'VITE_GOOGLE_API_KEY': import.meta?.env?.VITE_GOOGLE_API_KEY
  };

  Object.entries(envVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const length = value ? `(${value.length} chars)` : '(missing)';
    console.log(`${status} ${key}: ${length}`);
  });

  if (!envVars.VITE_GOOGLE_CLIENT_ID || !envVars.VITE_GOOGLE_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables!');
    console.log('📝 Create a .env file with:');
    console.log('VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com');
    console.log('VITE_GOOGLE_CLIENT_SECRET=your_client_secret');
    console.log('VITE_GOOGLE_DRIVE_URL=https://drive.google.com/drive/folders/your_folder_id');
  }
}

// Function to check localStorage for stored data
function checkStoredData() {
  console.log('\n💾 === STORED DATA CHECK ===');
  
  const keys = [
    'accessToken', 'refreshToken', 'userEmail', 'userName', 
    'userPicture', 'userRole', 'currentUser', 'clientId', 
    'clientSecret', 'driveUrl'
  ];

  keys.forEach(key => {
    const value = localStorage.getItem(key);
    const status = value ? '✅' : '❌';
    const info = value ? `(${value.length} chars)` : '(not found)';
    console.log(`${status} ${key}: ${info}`);
  });
}

// Function to validate current OAuth setup
function validateOAuthSetup() {
  console.log('\n🔍 === OAUTH SETUP VALIDATION ===');
  
  const currentOrigin = window.location.origin;
  const expectedCallback = `${currentOrigin}/auth/callback`;
  
  console.log(`🌐 Current Origin: ${currentOrigin}`);
  console.log(`🔗 Expected Callback URL: ${expectedCallback}`);
  
  console.log('\n📋 Google Cloud Console Checklist:');
  console.log('☐ Google Drive API enabled');
  console.log('☐ Google+ API enabled');
  console.log('☐ OAuth 2.0 client created (Web application)');
  console.log(`☐ Authorized redirect URI includes: ${expectedCallback}`);
  console.log('☐ OAuth consent screen configured');
}

// Function to test API endpoints
async function testGoogleAPIEndpoints() {
  console.log('\n🧪 === API ENDPOINTS TEST ===');
  
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    console.log('❌ No access token found. Please log in first.');
    return;
  }

  // Test userinfo endpoint
  try {
    console.log('🔍 Testing userinfo endpoint...');
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Userinfo endpoint working:', userData);
    } else {
      console.log('❌ Userinfo endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Userinfo endpoint error:', error);
  }

  // Test token info endpoint
  try {
    console.log('🔍 Testing token info endpoint...');
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    
    if (response.ok) {
      const tokenInfo = await response.json();
      console.log('✅ Token info endpoint working:', tokenInfo);
    } else {
      console.log('❌ Token info endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Token info endpoint error:', error);
  }
}

// Function to simulate OAuth flow
function simulateOAuthFlow() {
  console.log('\n🎭 === OAUTH FLOW SIMULATION ===');
  
  const clientId = localStorage.getItem('clientId') || import.meta?.env?.VITE_GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.log('❌ No client ID available for simulation');
    return;
  }

  const redirectUri = `${window.location.origin}/auth/callback`;
  const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  const state = JSON.stringify({ type: 'login' });
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  
  console.log('🔗 Generated OAuth URL:');
  console.log(authUrl);
  console.log('\n📋 OAuth URL Components:');
  console.log(`Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Scope: ${scope}`);
  console.log(`State: ${state}`);
}

// Function to clear all debug data
function clearDebugData() {
  console.log('\n🗑️ === CLEARING DEBUG DATA ===');
  
  const keys = [
    'accessToken', 'refreshToken', 'userEmail', 'userName', 
    'userPicture', 'userRole', 'currentUser', 'clientId', 
    'clientSecret', 'driveUrl', 'returnPath'
  ];

  keys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Removed: ${key}`);
  });
  
  console.log('✅ Debug data cleared');
}

// Function to generate complete debug report
function generateDebugReport() {
  console.log('\n📊 === COMPLETE DEBUG REPORT ===');
  checkEnvironmentVariables();
  checkStoredData();
  validateOAuthSetup();
  
  console.log('\n🔧 Available Debug Functions:');
  console.log('- checkEnvironmentVariables() - Check .env setup');
  console.log('- checkStoredData() - Check localStorage data');
  console.log('- validateOAuthSetup() - Validate OAuth configuration');
  console.log('- testGoogleAPIEndpoints() - Test API access');
  console.log('- simulateOAuthFlow() - Generate OAuth URL');
  console.log('- clearDebugData() - Clear all stored data');
  console.log('- generateDebugReport() - Generate this report');
}

// Make functions available globally
window.oauthDebug = {
  checkEnvironmentVariables,
  checkStoredData,
  validateOAuthSetup,
  testGoogleAPIEndpoints,
  simulateOAuthFlow,
  clearDebugData,
  generateDebugReport
};

// Auto-run the complete report
generateDebugReport();

console.log('\n✅ OAuth Debug Console Script loaded successfully!');
console.log('💡 Type "oauthDebug.generateDebugReport()" to run the complete report again');
