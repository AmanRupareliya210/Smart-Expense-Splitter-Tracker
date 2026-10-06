/**
 * Automated Verification Script for Step 2A & Step 2B
 * Tests: Server Startup, MongoDB Connection, Health Endpoint, Auth Flow (Register, Login, Me, UpdateProfile, Logout, Invalid Creds, Duplicate Rejection)
 */
const http = require('http');

const BASE_URL = 'http://localhost:5000';

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Starting Step 2A & Step 2B Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '- ' + JSON.stringify(details) : ''}`);
      failed++;
    }
  };

  try {
    // 1. Health check & DB connection
    console.log('--- 1. Health & Server Connectivity Check ---');
    const health = await request('/api/health');
    assert(health.status === 200 || health.status === 503, 'Health endpoint responds with HTTP status');
    assert(health.data && health.data.database, 'Health endpoint returns database status object', health.data);
    console.log(`     Database status: ${health.data?.database?.status || 'unknown'}`);

    // 2. Auth: Registration with unique email
    console.log('\n--- 2. User Registration ---');
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await request('/api/v1/auth/register', 'POST', {
      name: 'Alice Developer',
      email: testEmail,
      password: 'password123',
      defaultCurrency: 'USD'
    });
    assert(regRes.status === 201, 'User registered successfully (201 Created)', regRes);
    assert(regRes.data?.data?.token, 'JWT token returned on registration');
    assert(regRes.data?.data?.user?.email === testEmail.toLowerCase(), 'User email normalized and saved correctly');

    const authToken = regRes.data?.data?.token;

    // 3. Auth: Duplicate Email Registration Rejection
    console.log('\n--- 3. Duplicate Email Rejection ---');
    const dupRes = await request('/api/v1/auth/register', 'POST', {
      name: 'Duplicate Alice',
      email: testEmail,
      password: 'password123'
    });
    assert(dupRes.status === 409 || dupRes.status === 400, 'Duplicate email registration rejected (409/400)', dupRes);

    // 4. Auth: Invalid Registration Input Validation
    console.log('\n--- 4. Input Validation ---');
    const invalidRes = await request('/api/v1/auth/register', 'POST', {
      name: '',
      email: 'not-an-email',
      password: '123'
    });
    assert(invalidRes.status === 400, 'Invalid registration payload rejected (400 Bad Request)', invalidRes);

    // 5. Auth: Login with Valid Credentials
    console.log('\n--- 5. User Login ---');
    const loginRes = await request('/api/v1/auth/login', 'POST', {
      email: testEmail,
      password: 'password123'
    });
    assert(loginRes.status === 200, 'User logged in successfully (200 OK)', loginRes);
    assert(loginRes.data?.data?.token, 'JWT token returned on login');

    // 6. Auth: Login with Incorrect Password
    console.log('\n--- 6. Incorrect Password Rejection ---');
    const wrongPassRes = await request('/api/v1/auth/login', 'POST', {
      email: testEmail,
      password: 'wrong_password_999'
    });
    assert(wrongPassRes.status === 401, 'Incorrect password rejected (401 Unauthorized)', wrongPassRes);

    // 7. Auth: Protected Route /me with valid token
    console.log('\n--- 7. Protected Route /me ---');
    const meRes = await request('/api/v1/auth/me', 'GET', null, authToken);
    assert(meRes.status === 200, 'Current user profile fetched (200 OK)', meRes);
    assert(meRes.data?.data?.user?.name === 'Alice Developer', 'Profile details match registered user');

    // 8. Auth: Protected Route without token
    console.log('\n--- 8. Protected Route Access Control ---');
    const unauthRes = await request('/api/v1/auth/me', 'GET');
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with 401 Unauthorized', unauthRes);

    // 9. Auth: Update Profile
    console.log('\n--- 9. Profile Update ---');
    const updateRes = await request('/api/v1/auth/profile', 'PUT', {
      name: 'Alice Senior Dev',
      defaultCurrency: 'EUR'
    }, authToken);
    assert(updateRes.status === 200, 'Profile updated successfully (200 OK)', updateRes);
    assert(updateRes.data?.data?.user?.name === 'Alice Senior Dev', 'Updated name persisted');
    assert(updateRes.data?.data?.user?.defaultCurrency === 'EUR', 'Updated currency persisted');

    // 10. Auth: Logout
    console.log('\n--- 10. Logout Endpoint ---');
    const logoutRes = await request('/api/v1/auth/logout', 'POST', null, authToken);
    assert(logoutRes.status === 200, 'Logout endpoint responds (200 OK)', logoutRes);

    console.log(`\n========================================`);
    console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Test suite crashed with error:', err.message);
    process.exit(1);
  }
};

runTests();
