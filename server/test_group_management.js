/**
 * Automated Verification Test Suite for STEP 3:
 * Group Management & Member Invitation System
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

const runStep3Tests = async () => {
  console.log('🧪 Starting STEP 3: Group Management & Invitations Test Suite...\n');
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
    const timestamp = Date.now();

    // 1. Setup Test Users
    console.log('--- 1. Setting Up Test Accounts ---');
    const userA_Res = await request('/api/v1/auth/register', 'POST', {
      name: 'Owner Alice',
      email: `alice_${timestamp}@test.com`,
      password: 'Password123!',
      defaultCurrency: 'USD'
    });
    const tokenA = userA_Res.data?.data?.token;
    const userA = userA_Res.data?.data?.user;
    assert(tokenA && userA, 'User A (Owner) registered');

    const userB_Res = await request('/api/v1/auth/register', 'POST', {
      name: 'Member Bob',
      email: `bob_${timestamp}@test.com`,
      password: 'Password123!',
      defaultCurrency: 'USD'
    });
    const tokenB = userB_Res.data?.data?.token;
    const userB = userB_Res.data?.data?.user;
    assert(tokenB && userB, 'User B (Member) registered');

    const userC_Res = await request('/api/v1/auth/register', 'POST', {
      name: 'Guest Charlie',
      email: `charlie_${timestamp}@test.com`,
      password: 'Password123!',
      defaultCurrency: 'USD'
    });
    const tokenC = userC_Res.data?.data?.token;
    const userC = userC_Res.data?.data?.user;
    assert(tokenC && userC, 'User C (Invitee) registered');

    // 2. Group Creation Tests
    console.log('\n--- 2. Group Creation & Model Rules ---');
    const createRes = await request(
      '/api/v1/groups',
      'POST',
      {
        name: 'Euro Trip 2026',
        description: 'Summer vacation across Europe',
        category: 'Trip',
        currency: 'EUR'
      },
      tokenA
    );
    const group = createRes.data?.data;
    assert(createRes.status === 201, 'Group created successfully (201 Created)');
    assert(group && group.name === 'Euro Trip 2026', 'Group name set accurately');
    assert(group.members.length === 1, 'Group has 1 initial member');
    assert(group.members[0].role === 'owner', 'Creator automatically designated as OWNER');
    assert(group.isArchived === false, 'Group active by default');

    // Reject invalid group creation
    const invalidGroup = await request(
      '/api/v1/groups',
      'POST',
      { name: '   ' },
      tokenA
    );
    assert(invalidGroup.status === 400, 'Empty group name rejected with 400 Bad Request');

    // 3. Group Listing & Isolation Tests
    console.log('\n--- 3. Group Listing & Multi-Tenant Isolation ---');
    const listA = await request('/api/v1/groups', 'GET', null, tokenA);
    assert(listA.status === 200 && listA.data?.data?.length >= 1, 'Owner A lists their active groups');

    const listB_Empty = await request('/api/v1/groups', 'GET', null, tokenB);
    assert(
      listB_Empty.status === 200 &&
        listB_Empty.data?.data?.every((g) => g._id !== group._id),
      'User B cannot see Group until added (Multi-tenant isolation verified)'
    );

    // User B tries to view details before joining -> 403 Forbidden
    const unauthDetails = await request(`/api/v1/groups/${group._id}`, 'GET', null, tokenB);
    assert(unauthDetails.status === 403, 'Non-member access rejected with 403 Forbidden');

    // 4. Member Management Tests
    console.log('\n--- 4. Member Management & Role Rules ---');
    // Owner adds User B
    const addMemberRes = await request(
      `/api/v1/groups/${group._id}/members`,
      'POST',
      { email: userB.email, role: 'member' },
      tokenA
    );
    assert(addMemberRes.status === 200, 'Owner adds User B by email');
    assert(
      addMemberRes.data?.data?.members?.some((m) => m.userId?._id === userB.id),
      'User B present in updated group member list'
    );

    // Reject duplicate member add
    const dupAddRes = await request(
      `/api/v1/groups/${group._id}/members`,
      'POST',
      { email: userB.email },
      tokenA
    );
    assert(dupAddRes.status === 409 || dupAddRes.status === 400, 'Duplicate member addition rejected');

    // Ordinary member (User B) tries to add someone else -> 403 Forbidden
    const unauthAdd = await request(
      `/api/v1/groups/${group._id}/members`,
      'POST',
      { email: 'random@test.com' },
      tokenB
    );
    assert(unauthAdd.status === 403, 'Regular member prevented from adding members (403)');

    // Promote User B to Admin
    const promoteRes = await request(
      `/api/v1/groups/${group._id}/members/${userB.id}/role`,
      'PATCH',
      { role: 'admin' },
      tokenA
    );
    assert(promoteRes.status === 200, 'Owner promoted User B to Admin');

    // User B (Admin) tries to demote User A (Owner) -> 403 Forbidden
    const unauthDemoteOwner = await request(
      `/api/v1/groups/${group._id}/members/${userA.id}/role`,
      'PATCH',
      { role: 'member' },
      tokenB
    );
    assert(unauthDemoteOwner.status === 403, 'Admin prevented from altering Owner role (403)');

    // 5. Group Metadata Update & Archiving Tests
    console.log('\n--- 5. Group Metadata Updates & Archiving ---');
    const updateRes = await request(
      `/api/v1/groups/${group._id}`,
      'PATCH',
      { description: 'Updated Euro Trip description with more details' },
      tokenA
    );
    assert(updateRes.status === 200, 'Owner updated group metadata');
    assert(
      updateRes.data?.data?.description === 'Updated Euro Trip description with more details',
      'Updated description persisted'
    );

    // Archive group
    const archiveRes = await request(
      `/api/v1/groups/${group._id}/archive`,
      'POST',
      null,
      tokenA
    );
    assert(archiveRes.status === 200 && archiveRes.data?.data?.isArchived === true, 'Group archived');

    // Default listing excludes archived groups
    const defaultList = await request('/api/v1/groups', 'GET', null, tokenA);
    assert(
      defaultList.data?.data?.every((g) => g._id !== group._id),
      'Archived group excluded from default active list'
    );

    // Listing with includeArchived=only returns archived group
    const archivedList = await request(
      '/api/v1/groups?includeArchived=only',
      'GET',
      null,
      tokenA
    );
    assert(
      archivedList.data?.data?.some((g) => g._id === group._id),
      'Archived group returned when filtering for archives'
    );

    // Unarchive group
    const unarchiveRes = await request(
      `/api/v1/groups/${group._id}/unarchive`,
      'POST',
      null,
      tokenA
    );
    assert(unarchiveRes.status === 200 && unarchiveRes.data?.data?.isArchived === false, 'Group unarchived');

    // 6. Secure Cryptographic Invitation System Tests
    console.log('\n--- 6. Secure Cryptographic Invitation System ---');
    // Generate Invite Link
    const inviteRes = await request(
      `/api/v1/groups/${group._id}/invitations`,
      'POST',
      { role: 'member', expiresInDays: 7 },
      tokenA
    );
    assert(inviteRes.status === 201, 'Cryptographic invite generated (201 Created)');
    const rawToken = inviteRes.data?.data?.token;
    const inviteId = inviteRes.data?.data?.invitationId;
    assert(rawToken && rawToken.length === 64, 'Raw token is 32-byte (64 hex char) random string');

    // Public Preview of invitation token (minimal safe info)
    const previewRes = await request(`/api/v1/invitations/${rawToken}`, 'GET');
    assert(previewRes.status === 200, 'Public invitation preview fetched (200 OK)');
    assert(previewRes.data?.data?.isValid === true, 'Preview confirms invitation is valid & pending');
    assert(previewRes.data?.data?.group?.name === 'Euro Trip 2026', 'Preview includes group name');
    assert(previewRes.data?.data?.group?.members === undefined, 'Preview DOES NOT leak group member list or sensitive data');

    // Unauthenticated user attempts acceptance -> 401 Unauthorized
    const unauthAccept = await request(`/api/v1/invitations/${rawToken}/accept`, 'POST');
    assert(unauthAccept.status === 401, 'Unauthenticated acceptance rejected with 401');

    // User C accepts valid invitation
    const acceptRes = await request(`/api/v1/invitations/${rawToken}/accept`, 'POST', null, tokenC);
    assert(acceptRes.status === 200, 'User C successfully accepted invitation and joined group');

    // Re-acceptance by same user handled gracefully
    const reAccept = await request(`/api/v1/invitations/${rawToken}/accept`, 'POST', null, tokenC);
    assert(reAccept.status === 200 && reAccept.data?.data?.alreadyMember === true, 'Re-acceptance handled gracefully without error');

    // Revoke Invitation Test
    const invite2Res = await request(
      `/api/v1/groups/${group._id}/invitations`,
      'POST',
      { role: 'member' },
      tokenA
    );
    const token2 = invite2Res.data?.data?.token;
    const invite2Id = invite2Res.data?.data?.invitationId;

    const revokeRes = await request(
      `/api/v1/groups/${group._id}/invitations/${invite2Id}`,
      'DELETE',
      null,
      tokenA
    );
    assert(revokeRes.status === 200, 'Invitation revoked by Admin/Owner');

    // Attempting to accept revoked invitation -> 400 Bad Request
    const acceptRevoked = await request(`/api/v1/invitations/${token2}/accept`, 'POST', null, tokenB);
    assert(acceptRevoked.status === 400, 'Acceptance of revoked invitation rejected');

    // 7. Ownership Transfer & Member Leaving Rules
    console.log('\n--- 7. Ownership Transfer & Leaving Rules ---');
    // User A (Sole Owner) tries to leave without transferring ownership -> 400 Bad Request
    const ownerLeaveFail = await request(
      `/api/v1/groups/${group._id}/leave`,
      'POST',
      null,
      tokenA
    );
    assert(ownerLeaveFail.status === 400, 'Sole owner prevented from leaving without transferring ownership');

    // User A transfers ownership to User B
    const transferRes = await request(
      `/api/v1/groups/${group._id}/transfer-ownership`,
      'POST',
      { newOwnerId: userB.id },
      tokenA
    );
    assert(transferRes.status === 200, 'Ownership transferred from User A to User B');

    // Verify User B is now Owner and User A is Admin
    const groupCheck = await request(`/api/v1/groups/${group._id}`, 'GET', null, tokenB);
    const membersList = groupCheck.data?.data?.group?.members;
    const memberB_Entry = membersList.find((m) => m.userId?._id === userB.id);
    const memberA_Entry = membersList.find((m) => m.userId?._id === userA.id);
    assert(memberB_Entry.role === 'owner', 'User B is now the OWNER');
    assert(memberA_Entry.role === 'admin', 'User A became ADMIN');

    // User C leaves group
    const userCLeave = await request(
      `/api/v1/groups/${group._id}/leave`,
      'POST',
      null,
      tokenC
    );
    assert(userCLeave.status === 200, 'User C left group cleanly');

    console.log('\n========================================');
    console.log(`🎯 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Test Suite Error:', error);
    process.exit(1);
  }
};

runStep3Tests();
