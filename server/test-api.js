// Quick test script to debug the API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Save Test Result
    console.log('\n2. Testing save test result...');
    const testData = {
      username: 'test_user',
      wpm: 75.5,
      cpm: 377,
      accuracy: 95.2,
      total_time: 60000,
      difficulty: 'medium',
      total_characters: 400,
      correct_characters: 381,
      incorrect_characters: 19,
      test_text: 'Sample test text'
    };

    const saveResponse = await fetch(`${BASE_URL}/api/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.log('❌ Save failed:', saveResponse.status, errorText);
      return;
    }

    const saveData = await saveResponse.json();
    console.log('✅ Save result:', saveData);

    // Test 3: Get Test Results
    console.log('\n3. Testing get test results...');
    const getResponse = await fetch(`${BASE_URL}/api/tests?username=test_user`);
    const getData = await getResponse.json();
    console.log('✅ Get results:', getData);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPI();
}