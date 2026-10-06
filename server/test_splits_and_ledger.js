/**
 * Comprehensive Automated Verification Test Suite for STEP 4:
 * Expense Ledger & Dynamic Splits Engine
 */
const http = require('http');
const splitEngine = require('./services/splitEngine');

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

const runStep4Tests = async () => {
  console.log('🧪 Starting STEP 4: Expense Ledger & Dynamic Splits Engine Test Suite...\n');
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

  // ==========================================
  // SECTION 1: SPLIT ENGINE UNIT TESTS
  // ==========================================
  console.log('--- SECTION 1: Split Engine Unit Calculations ---');

  // Test 1.1: Equal split clean division ($90.00 / 3 -> 9000 cents / 3 = 3000 cents each)
  try {
    const res = splitEngine.calculateEqualSplit(9000, ['u1', 'u2', 'u3']);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      res.length === 3 &&
      res.every((s) => s.amount === 3000) &&
      sumCents === 9000,
      'SplitEngine: Equal split clean division ($90 / 3 = 3000 cents each)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Equal split clean division', err.message);
  }

  // Test 1.2: Equal split indivisible remainder reconciliation ($100 / 3 -> 10000 cents / 3)
  try {
    const res = splitEngine.calculateEqualSplit(10000, ['u1', 'u2', 'u3']);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    const amounts = res.map((s) => s.amount);
    assert(
      sumCents === 10000 &&
      amounts[0] === 3334 &&
      amounts[1] === 3333 &&
      amounts[2] === 3333,
      'SplitEngine: Equal split indivisible cents (10000 cents = 3334 + 3333 + 3333)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Equal split indivisible cents', err.message);
  }

  // Test 1.3: Exact split valid ($45.50 + $30.25 + $24.25 = $100.00 -> 10000 cents)
  try {
    const rawSplits = [
      { userId: 'u1', amount: 45.50 },
      { userId: 'u2', amount: 30.25 },
      { userId: 'u3', amount: 24.25 }
    ];
    const res = splitEngine.calculateExactSplit(10000, rawSplits);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      sumCents === 10000 && res.length === 3 && res[0].amount === 4550 && res[1].amount === 3025 && res[2].amount === 2425,
      'SplitEngine: Exact split valid summation ($45.50 + $30.25 + $24.25 = 10000 cents)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Exact split valid summation', err.message);
  }

  // Test 1.4: Exact split sum mismatch rejection
  try {
    const rawSplits = [
      { userId: 'u1', amount: 50.00 },
      { userId: 'u2', amount: 40.00 }
    ];
    splitEngine.calculateExactSplit(10000, rawSplits);
    assert(false, 'SplitEngine: Exact split mismatch rejection should throw');
  } catch (err) {
    assert(
      err.message.includes('Exact split total') || err.message.includes('Mismatch'),
      'SplitEngine: Exact split mismatch is rejected safely'
    );
  }

  // Test 1.5: Percentage split valid (50% + 30% + 20% of 20000 cents = 10000, 6000, 4000)
  try {
    const rawSplits = [
      { userId: 'u1', percentage: 50 },
      { userId: 'u2', percentage: 30 },
      { userId: 'u3', percentage: 20 }
    ];
    const res = splitEngine.calculatePercentageSplit(20000, rawSplits);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      sumCents === 20000 && res[0].amount === 10000 && res[1].amount === 6000 && res[2].amount === 4000,
      'SplitEngine: Percentage split standard (50% + 30% + 20% on 20000 cents)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Percentage split standard', err.message);
  }

  // Test 1.6: Percentage split rounding boundary & remainder reconciliation
  try {
    const rawSplits = [
      { userId: 'u1', percentage: 33.33 },
      { userId: 'u2', percentage: 33.33 },
      { userId: 'u3', percentage: 33.34 }
    ];
    const res = splitEngine.calculatePercentageSplit(10000, rawSplits);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      sumCents === 10000 && res.every((s) => s.amount > 0),
      'SplitEngine: Percentage split rounding boundary sums exactly to total (10000 cents)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Percentage split rounding boundary', err.message);
  }

  // Test 1.7: Percentage split invalid total percentage
  try {
    const rawSplits = [
      { userId: 'u1', percentage: 50 },
      { userId: 'u2', percentage: 40 }
    ];
    splitEngine.calculatePercentageSplit(10000, rawSplits);
    assert(false, 'SplitEngine: Percentage split non-100% should throw');
  } catch (err) {
    assert(
      err.message.includes('Percentage split values must sum to 100%'),
      'SplitEngine: Percentage split non-100% rejected safely'
    );
  }

  // Test 1.8: Shares split with unequal weights (1:2:3 on 6000 cents = 1000, 2000, 3000)
  try {
    const rawSplits = [
      { userId: 'u1', shares: 1 },
      { userId: 'u2', shares: 2 },
      { userId: 'u3', shares: 3 }
    ];
    const res = splitEngine.calculateSharesSplit(6000, rawSplits);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      sumCents === 6000 && res[0].amount === 1000 && res[1].amount === 2000 && res[2].amount === 3000,
      'SplitEngine: Shares split clean weights (1:2:3 on 6000 cents = 1000, 2000, 3000)'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Shares split clean weights', err.message);
  }

  // Test 1.9: Shares split indivisible weights remainder reconciliation
  try {
    const rawSplits = [
      { userId: 'u1', shares: 1 },
      { userId: 'u2', shares: 1 },
      { userId: 'u3', shares: 1 }
    ];
    const res = splitEngine.calculateSharesSplit(10000, rawSplits);
    const sumCents = res.reduce((acc, s) => acc + s.amount, 0);
    assert(
      sumCents === 10000 && res[0].amount === 3334 && res[1].amount === 3333 && res[2].amount === 3333,
      'SplitEngine: Shares split indivisible weights remainder reconciliation'
    );
  } catch (err) {
    assert(false, 'SplitEngine: Shares split indivisible weights', err.message);
  }

  // Test 1.10: Edge cases - zero, negative, missing, duplicate participants
  try {
    splitEngine.validateAndCalculateSplit(0, 'equal', ['u1', 'u2'], [{ userId: 'u1' }, { userId: 'u2' }]);
    assert(false, 'SplitEngine: Zero amount should throw');
  } catch (err) {
    assert(err.message.includes('greater than zero'), 'SplitEngine: Zero amount rejected');
  }

  try {
    splitEngine.validateAndCalculateSplit(-5000, 'equal', ['u1', 'u2'], [{ userId: 'u1' }, { userId: 'u2' }]);
    assert(false, 'SplitEngine: Negative amount should throw');
  } catch (err) {
    assert(err.message.includes('greater than zero'), 'SplitEngine: Negative amount rejected');
  }

  try {
    splitEngine.validateAndCalculateSplit(10000, 'equal', ['u1', 'u1'], [{ userId: 'u1' }]);
    assert(false, 'SplitEngine: Duplicate participants should throw');
  } catch (err) {
    assert(err.message.includes('Duplicate participant'), 'SplitEngine: Duplicate participants rejected');
  }

  // ==========================================
  // SECTION 2: BACKEND REST APIS & INTEGRATION
  // ==========================================
  console.log('\n--- SECTION 2: Backend REST APIs & Group Authorization ---');

  const ts = Date.now();
  let user1Token, user1Id, user1Email;
  let user2Token, user2Id, user2Email;
  let nonMemberToken, nonMemberId;
  let testGroupId;
  let equalExpenseId, exactExpenseId;

  // Setup users
  user1Email = `splituser1_${ts}@test.com`;
  const u1Res = await request('/api/v1/auth/register', 'POST', {
    name: `Split User 1 ${ts}`,
    email: user1Email,
    password: 'Password123!'
  });
  user1Token = u1Res.data?.data?.token || u1Res.data?.token;
  user1Id = u1Res.data?.data?.user?.id || u1Res.data?.data?.user?._id;

  user2Email = `splituser2_${ts}@test.com`;
  const u2Res = await request('/api/v1/auth/register', 'POST', {
    name: `Split User 2 ${ts}`,
    email: user2Email,
    password: 'Password123!'
  });
  user2Token = u2Res.data?.data?.token || u2Res.data?.token;
  user2Id = u2Res.data?.data?.user?.id || u2Res.data?.data?.user?._id;

  const nonMemberRes = await request('/api/v1/auth/register', 'POST', {
    name: `Non Member ${ts}`,
    email: `nonmember_${ts}@test.com`,
    password: 'Password123!'
  });
  nonMemberToken = nonMemberRes.data?.data?.token || nonMemberRes.data?.token;
  nonMemberId = nonMemberRes.data?.data?.user?.id || nonMemberRes.data?.data?.user?._id;

  assert(user1Token && user2Token && nonMemberToken, 'Setup: Created 3 test users');

  // Create test group with user 1 & user 2
  const groupRes = await request('/api/v1/groups', 'POST', {
    name: `Trip To Tokyo ${ts}`,
    description: 'Vacation group for testing splits',
    currency: 'USD',
    category: 'Trip'
  }, user1Token);

  const groupData = groupRes.data?.data;
  testGroupId = groupData?._id;
  assert(groupRes.status === 201 && testGroupId, 'Setup: Created group for expense testing');

  // Add User 2 to group by email
  const addMemberRes = await request(`/api/v1/groups/${testGroupId}/members`, 'POST', {
    email: user2Email,
    role: 'member'
  }, user1Token);
  assert(addMemberRes.status === 200, 'Setup: Added User 2 to group');

  // Test 2.1: Create Equal Expense ($100 split 2 ways = 5000 cents each)
  const createEqualRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'POST', {
    title: 'Dinner at Shibuya',
    totalAmount: 100,
    paidBy: user1Id,
    category: 'Food',
    splitType: 'equal',
    participantIds: [user1Id, user2Id],
    notes: 'Ramen and gyoza'
  }, user1Token);

  assert(createEqualRes.status === 201, 'API: Create Equal split expense (201 Created)');
  const createdEqualExpense = createEqualRes.data?.data?.expense || createEqualRes.data?.data;
  equalExpenseId = createdEqualExpense?._id;
  assert(
    createdEqualExpense?.splits?.length === 2 &&
    createdEqualExpense?.splits[0].amount === 5000 &&
    createdEqualExpense?.splits[1].amount === 5000,
    'API: Equal split calculated correctly (5000 cents each for $100)'
  );

  // Test 2.2: Create Exact Split Expense ($75.50 -> $40.00 + $35.50 = 4000 + 3550 cents)
  const createExactRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'POST', {
    title: 'Train Tickets',
    totalAmount: 75.50,
    paidBy: user2Id,
    category: 'Transportation',
    splitType: 'exact',
    splits: [
      { userId: user1Id, amount: 40.00 },
      { userId: user2Id, amount: 35.50 }
    ]
  }, user2Token);

  assert(createExactRes.status === 201, 'API: Create Exact split expense (201 Created)');
  const createdExactExpense = createExactRes.data?.data?.expense || createExactRes.data?.data;
  exactExpenseId = createdExactExpense?._id;
  assert(
    createdExactExpense?.splits?.[0].amount === 4000 &&
    createdExactExpense?.splits?.[1].amount === 3550,
    'API: Exact split allocations preserved accurately (4000 & 3550 cents)'
  );

  // Test 2.3: Create Percentage Split Expense ($300: 60% + 40% = 18000 + 12000 cents)
  const createPercRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'POST', {
    title: 'Hotel Room',
    totalAmount: 300,
    paidBy: user1Id,
    category: 'Accommodation',
    splitType: 'percentage',
    splits: [
      { userId: user1Id, percentage: 60 },
      { userId: user2Id, percentage: 40 }
    ]
  }, user1Token);

  assert(createPercRes.status === 201, 'API: Create Percentage split expense (201 Created)');
  const createdPercExpense = createPercRes.data?.data?.expense || createPercRes.data?.data;
  assert(
    createdPercExpense?.splits?.[0].amount === 18000 &&
    createdPercExpense?.splits?.[1].amount === 12000,
    'API: Percentage split correctly calculates 18000 and 12000 cents'
  );

  // Test 2.4: Create Shares Split Expense ($90: 1 share + 2 shares = 3000 + 6000 cents)
  const createSharesRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'POST', {
    title: 'Snacks & Drinks',
    totalAmount: 90,
    paidBy: user2Id,
    category: 'Groceries',
    splitType: 'shares',
    splits: [
      { userId: user1Id, shares: 1 },
      { userId: user2Id, shares: 2 }
    ]
  }, user2Token);

  assert(createSharesRes.status === 201, 'API: Create Shares split expense (201 Created)');
  const createdSharesExpense = createSharesRes.data?.data?.expense || createSharesRes.data?.data;
  assert(
    createdSharesExpense?.splits?.[0].amount === 3000 &&
    createdSharesExpense?.splits?.[1].amount === 6000,
    'API: Shares split correctly calculates 1:2 ratio (3000 : 6000 cents)'
  );

  // Test 2.5: List Expenses with pagination & filtering
  const listAllRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'GET', null, user1Token);
  const expensesList = listAllRes.data?.data?.expenses || listAllRes.data?.data;
  assert(
    listAllRes.status === 200 && expensesList?.length === 4,
    'API: List expenses returns all 4 created expenses'
  );

  const listCatFilterRes = await request(
    `/api/v1/groups/${testGroupId}/expenses?category=Food`,
    'GET',
    null,
    user1Token
  );
  const catList = listCatFilterRes.data?.data?.expenses || listCatFilterRes.data?.data;
  assert(
    listCatFilterRes.status === 200 && catList?.length === 1 &&
    catList[0].title === 'Dinner at Shibuya',
    'API: List expenses filters correctly by category'
  );

  const listSearchRes = await request(
    `/api/v1/groups/${testGroupId}/expenses?search=Shibuya`,
    'GET',
    null,
    user1Token
  );
  const searchList = listSearchRes.data?.data?.expenses || listSearchRes.data?.data;
  assert(
    listSearchRes.status === 200 && searchList?.length === 1,
    'API: List expenses filters correctly by search keyword'
  );

  // Test 2.6: Get Single Expense Details
  const getDetailRes = await request(
    `/api/v1/groups/${testGroupId}/expenses/${equalExpenseId}`,
    'GET',
    null,
    user2Token
  );
  const detailExpense = getDetailRes.data?.data?.expense || getDetailRes.data?.data;
  const payerDetailId = detailExpense?.paidBy?._id || detailExpense?.paidBy;
  assert(
    getDetailRes.status === 200 &&
    detailExpense?.title === 'Dinner at Shibuya' &&
    payerDetailId === user1Id,
    'API: Get single expense details with populated payer and participants'
  );

  // Test 2.7: Edit Expense ($120 split 2 ways -> 6000 cents each)
  const updateRes = await request(
    `/api/v1/groups/${testGroupId}/expenses/${equalExpenseId}`,
    'PATCH',
    {
      title: 'Dinner at Shibuya (Updated)',
      totalAmount: 120,
      splitType: 'equal',
      participantIds: [user1Id, user2Id]
    },
    user1Token
  );
  const updatedExpense = updateRes.data?.data?.expense || updateRes.data?.data;
  assert(
    updateRes.status === 200 &&
    updatedExpense?.title === 'Dinner at Shibuya (Updated)' &&
    updatedExpense?.totalAmount === 12000 &&
    updatedExpense?.isEdited === true &&
    updatedExpense?.splits[0].amount === 6000,
    'API: Edit expense recalculates splits and marks isEdited: true'
  );

  // Test 2.8: Delete Expense
  const deleteRes = await request(
    `/api/v1/groups/${testGroupId}/expenses/${exactExpenseId}`,
    'DELETE',
    null,
    user2Token
  );
  assert(deleteRes.status === 200, 'API: Delete expense succeeded (200 OK)');

  const verifyDeleteRes = await request(
    `/api/v1/groups/${testGroupId}/expenses/${exactExpenseId}`,
    'GET',
    null,
    user1Token
  );
  assert(verifyDeleteRes.status === 404, 'API: Deleted expense no longer accessible (404 Not Found)');

  // ==========================================
  // SECTION 3: AUTHORIZATION & SAFETY GUARDS
  // ==========================================
  console.log('\n--- SECTION 3: Authorization & Safety Guards ---');

  // Test 3.1: Unauthenticated request rejected
  const unauthRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'GET');
  assert(unauthRes.status === 401, 'Guard: Unauthenticated request rejected (401)');

  // Test 3.2: Non-member cannot access group expenses
  const nonMemberExpenseRes = await request(
    `/api/v1/groups/${testGroupId}/expenses`,
    'GET',
    null,
    nonMemberToken
  );
  assert(nonMemberExpenseRes.status === 403, 'Guard: Non-member access rejected (403 Forbidden)');

  // Test 3.3: Non-member cannot be added as payer or participant
  const invalidPayerRes = await request(
    `/api/v1/groups/${testGroupId}/expenses`,
    'POST',
    {
      title: 'Hacked Expense',
      totalAmount: 50,
      paidBy: nonMemberId,
      splitType: 'equal',
      participantIds: [user1Id, nonMemberId]
    },
    user1Token
  );
  assert(
    invalidPayerRes.status === 400,
    'Guard: Reject non-member payer or participant in split (400 Bad Request)'
  );

  // Test 3.4: Invalid split calculation mismatch rejected
  const badExactRes = await request(
    `/api/v1/groups/${testGroupId}/expenses`,
    'POST',
    {
      title: 'Bad Exact Math',
      totalAmount: 100,
      paidBy: user1Id,
      splitType: 'exact',
      splits: [
        { userId: user1Id, amount: 40 },
        { userId: user2Id, amount: 40 } // sums to $80, not $100
      ]
    },
    user1Token
  );
  assert(badExactRes.status === 400, 'Guard: Reject invalid exact split sums on creation');

  // Test 3.5: Archived group guard
  await request(`/api/v1/groups/${testGroupId}/archive`, 'POST', null, user1Token);

  const archivedCreateRes = await request(
    `/api/v1/groups/${testGroupId}/expenses`,
    'POST',
    {
      title: 'Expense in Archived Group',
      totalAmount: 50,
      paidBy: user1Id,
      splitType: 'equal',
      participantIds: [user1Id, user2Id]
    },
    user1Token
  );
  assert(
    archivedCreateRes.status === 400,
    'Guard: Prevent creating expense in an archived group (400 Bad Request)'
  );

  // Unarchive group
  await request(`/api/v1/groups/${testGroupId}/unarchive`, 'POST', null, user1Token);

  // Summary
  console.log('\n=========================================');
  console.log(`📊 STEP 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runStep4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
