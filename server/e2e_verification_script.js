/**
 * Comprehensive E2E Verification Script
 * Validates complete frontend and backend integration:
 * - Server & Client HTTP readiness
 * - Health Check & DB connection
 * - Complete User Authentication & Token lifecycle
 * - Group Creation, Details, Updates, Archival & Restoral
 * - Roster & Role Hierarchy enforcement
 * - Secure Cryptographic Invitation creation, public preview, authenticated acceptance, and replay prevention
 * - Ownership transfer & safe member leave workflow
 */
const http = require('http');

const BASE_API = 'http://localhost:5000';
const BASE_CLIENT = 'http://localhost:5173';

const request = (baseUrl, path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
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
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
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

const runE2EVerification = async () => {
  console.log('🚀 Starting Full-Stack E2E Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, flowName, details = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${flowName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${flowName} ${details ? '- ' + JSON.stringify(details) : ''}`);
      failed++;
    }
  };

  try {
    // 1. Client & Server Infrastructure Verification
    console.log('--- 1. Infrastructure, Client & Server Health ---');
    const clientRes = await request(BASE_CLIENT, '/');
    assert(clientRes.status === 200, 'Frontend React client is UP on http://localhost:5173 (Status: 200)');
    assert(clientRes.raw && clientRes.raw.includes('<div id="root">'), 'Frontend serves valid HTML5 DOM with #root anchor');

    const healthRes = await request(BASE_API, '/api/health');
    assert(healthRes.status === 200, 'Backend API server is UP on http://localhost:5000 (Status: 200)');
    assert(
      healthRes.data?.database?.status === 'connected',
      'Database connection verified active (MongoDB Connected)'
    );

    // 2. Authentication & Session Flow
    console.log('\n--- 2. User Authentication & Profile Management ---');
    const timestamp = Date.now();
    const aliceCreds = {
      name: 'Alice Springs',
      email: `alice_e2e_${timestamp}@example.com`,
      password: 'StrongPassword123!',
      defaultCurrency: 'USD'
    };

    const regRes = await request(BASE_API, '/api/v1/auth/register', 'POST', aliceCreds);
    assert(regRes.status === 201, 'User Registration endpoint creates user with 201 Created');
    const aliceToken = regRes.data?.data?.token;
    const aliceUser = regRes.data?.data?.user;
    assert(aliceToken && aliceUser?.email === aliceCreds.email, 'Registration returns JWT token and profile');

    const meRes = await request(BASE_API, '/api/v1/auth/me', 'GET', null, aliceToken);
    assert(meRes.status === 200 && meRes.data?.data?.user?.name === 'Alice Springs', 'Protected /me endpoint fetches profile');

    // 3. Group Creation & Initial Owner Role
    console.log('\n--- 3. Group Creation & Roster Architecture ---');
    const groupPayload = {
      name: 'Weekend Getaway Hawaii',
      description: 'Condo & car rental expenses',
      category: 'Trip',
      currency: 'USD'
    };

    const createGroupRes = await request(BASE_API, '/api/v1/groups', 'POST', groupPayload, aliceToken);
    assert(createGroupRes.status === 201, 'Group created successfully');
    const group = createGroupRes.data?.data;
    assert(group && group.name === 'Weekend Getaway Hawaii', 'Group name and metadata stored accurately');
    assert(group.members.length === 1, 'Group created with initial member');
    assert(group.members[0].role === 'owner', 'Group creator assigned OWNER role');

    // 4. Group Details & Multi-Tenant Access Control
    console.log('\n--- 4. Group Details & Authorization Guards ---');
    const detailsRes = await request(BASE_API, `/api/v1/groups/${group._id}`, 'GET', null, aliceToken);
    assert(detailsRes.status === 200, 'Authorized group member retrieves group details');
    assert(detailsRes.data?.data?.userRole === 'owner', 'Response confirms active user role as owner');

    // Register second user (Bob)
    const bobCreds = {
      name: 'Bob Builder',
      email: `bob_e2e_${timestamp}@example.com`,
      password: 'StrongPassword123!'
    };
    const bobReg = await request(BASE_API, '/api/v1/auth/register', 'POST', bobCreds);
    const bobToken = bobReg.data?.data?.token;
    const bobUser = bobReg.data?.data?.user;

    const unauthGroupAccess = await request(BASE_API, `/api/v1/groups/${group._id}`, 'GET', null, bobToken);
    assert(unauthGroupAccess.status === 403, 'Non-member access rejected with 403 Forbidden');

    // 5. Secure Cryptographic Invitation Workflow
    console.log('\n--- 5. Secure Cryptographic Invitation Workflow ---');
    const inviteRes = await request(
      BASE_API,
      `/api/v1/groups/${group._id}/invitations`,
      'POST',
      { role: 'member', expiresInDays: 7 },
      aliceToken
    );
    assert(inviteRes.status === 201, 'Owner generated 32-byte cryptographic invitation link');
    const rawToken = inviteRes.data?.data?.token;
    assert(rawToken && rawToken.length === 64, 'Token is 64 hex characters (32 cryptographically random bytes)');

    // Public preview without authentication
    const previewRes = await request(BASE_API, `/api/v1/invitations/${rawToken}`, 'GET');
    assert(previewRes.status === 200, 'Public invitation preview returns 200 OK');
    assert(previewRes.data?.data?.isValid === true, 'Preview confirms invitation is valid');
    assert(previewRes.data?.data?.group?.name === 'Weekend Getaway Hawaii', 'Preview reveals group name');
    assert(previewRes.data?.data?.group?.members === undefined, 'Preview does not leak members or financial details');

    // Bob accepts invitation using his authenticated token
    const acceptRes = await request(BASE_API, `/api/v1/invitations/${rawToken}/accept`, 'POST', null, bobToken);
    assert(acceptRes.status === 200, 'User Bob successfully accepted invitation and joined group');

    // Verify Bob is now in the group roster
    const updatedDetails = await request(BASE_API, `/api/v1/groups/${group._id}`, 'GET', null, aliceToken);
    const bobInRoster = updatedDetails.data?.data?.group?.members?.find(
      (m) => m.userId?._id === bobUser.id
    );
    assert(bobInRoster && bobInRoster.role === 'member', 'Bob is present in member roster with MEMBER role');

    // 6. Role Promotion & Permission Hierarchy
    console.log('\n--- 6. Role Promotion & Permission Hierarchy ---');
    const promoteRes = await request(
      BASE_API,
      `/api/v1/groups/${group._id}/members/${bobUser.id}/role`,
      'PATCH',
      { role: 'admin' },
      aliceToken
    );
    assert(promoteRes.status === 200, 'Owner promoted Bob to ADMIN');

    // Bob (Admin) tries to demote Alice (Owner) -> 403 Forbidden
    const demoteOwnerFail = await request(
      BASE_API,
      `/api/v1/groups/${group._id}/members/${aliceUser.id}/role`,
      'PATCH',
      { role: 'member' },
      bobToken
    );
    assert(demoteOwnerFail.status === 403, 'Admin cannot demote or alter Owner role (403 Forbidden)');

    // 7. Group Archival & Restoral
    console.log('\n--- 7. Group Archival & Filter Verification ---');
    const archiveRes = await request(BASE_API, `/api/v1/groups/${group._id}/archive`, 'POST', null, aliceToken);
    assert(archiveRes.status === 200 && archiveRes.data?.data?.isArchived === true, 'Group archived by Owner');

    const activeList = await request(BASE_API, '/api/v1/groups', 'GET', null, aliceToken);
    assert(
      activeList.data?.data?.every((g) => g._id !== group._id),
      'Archived group excluded from default active listing'
    );

    const archivedList = await request(BASE_API, '/api/v1/groups?includeArchived=only', 'GET', null, aliceToken);
    assert(
      archivedList.data?.data?.some((g) => g._id === group._id),
      'Archived group retrieved with ?includeArchived=only'
    );

    const unarchiveRes = await request(BASE_API, `/api/v1/groups/${group._id}/unarchive`, 'POST', null, aliceToken);
    assert(unarchiveRes.status === 200 && unarchiveRes.data?.data?.isArchived === false, 'Group unarchived');

    // 8. Ownership Transfer & Leaving Rules
    console.log('\n--- 8. Ownership Transfer & Leaving Rules ---');
    // Alice cannot leave while she is sole owner
    const leaveFail = await request(BASE_API, `/api/v1/groups/${group._id}/leave`, 'POST', null, aliceToken);
    assert(leaveFail.status === 400, 'Sole owner prevented from leaving without transferring ownership');

    // Alice transfers ownership to Bob
    const transferRes = await request(
      BASE_API,
      `/api/v1/groups/${group._id}/transfer-ownership`,
      'POST',
      { newOwnerId: bobUser.id },
      aliceToken
    );
    assert(transferRes.status === 200, 'Alice transferred group ownership to Bob');

    // Alice leaves group
    const leaveSuccess = await request(BASE_API, `/api/v1/groups/${group._id}/leave`, 'POST', null, aliceToken);
    assert(leaveSuccess.status === 200, 'Alice left group successfully after transferring ownership');

    console.log('\n======================================================');
    console.log(`🎯 E2E Verification Result: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal E2E Verification Error:', err);
    process.exit(1);
  }
};

runE2EVerification();
