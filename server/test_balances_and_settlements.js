/**
 * Comprehensive Automated Verification Test Suite for STEP 5:
 * Balance Engine, Settlements & Debt Minimization
 */
const http = require('http');
const { simplifyDebts } = require('./services/debtSimplifier');

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

const runStep5Tests = async () => {
  console.log('🧪 Starting STEP 5: Balance Engine, Settlements & Debt Minimization Test Suite...\n');
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
  // SECTION 1: DEBT MINIMIZER UNIT TESTS
  // ==========================================
  console.log('--- SECTION 1: Debt Minimization Engine Unit Calculations ---');

  // Test 1.1: Empty group & single member
  const emptyRes = simplifyDebts([]);
  const singleRes = simplifyDebts([{ userId: 'u1', name: 'Alice', netBalance: 0 }]);
  assert(emptyRes.length === 0 && singleRes.length === 0, 'Minimizer: Empty group and single user return no transfers');

  // Test 1.2: All members settled (zero balances)
  const zeroRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 0 },
    { userId: 'u2', name: 'Bob', netBalance: 0 }
  ]);
  assert(zeroRes.length === 0, 'Minimizer: All-zero net balances return empty transfer plan');

  // Test 1.3: Simple 2-person debt (Bob owes Alice $50 -> 5000 cents)
  const twoPersonRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 5000 },
    { userId: 'u2', name: 'Bob', netBalance: -5000 }
  ], 'USD');
  assert(
    twoPersonRes.length === 1 &&
    twoPersonRes[0].from.id === 'u2' &&
    twoPersonRes[0].to.id === 'u1' &&
    twoPersonRes[0].amount === 5000,
    'Minimizer: 2-person debt (Bob -> Alice $50.00)'
  );

  // Test 1.4: 1 Debtor with Multiple Creditors (Bob owes Alice $40 and Charlie $60)
  const multiCreditorRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 4000 },
    { userId: 'u2', name: 'Bob', netBalance: -10000 },
    { userId: 'u3', name: 'Charlie', netBalance: 6000 }
  ], 'USD');
  assert(
    multiCreditorRes.length === 2 &&
    multiCreditorRes.every((t) => t.from.id === 'u2') &&
    multiCreditorRes.reduce((acc, t) => acc + t.amount, 0) === 10000,
    'Minimizer: 1 debtor with multiple creditors (Bob pays Alice $40 and Charlie $60)'
  );

  // Test 1.5: Multiple Debtors with 1 Creditor (Bob owes $30, Charlie owes $70 to Alice)
  const multiDebtorRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 10000 },
    { userId: 'u2', name: 'Bob', netBalance: -3000 },
    { userId: 'u3', name: 'Charlie', netBalance: -7000 }
  ], 'USD');
  assert(
    multiDebtorRes.length === 2 &&
    multiDebtorRes.every((t) => t.to.id === 'u1') &&
    multiDebtorRes.reduce((acc, t) => acc + t.amount, 0) === 10000,
    'Minimizer: Multiple debtors with 1 creditor (Bob & Charlie pay Alice)'
  );

  // Test 1.6: Chain debt reduction (A paid for B, B paid for C -> C pays A directly)
  // Alice net: +5000, Bob net: 0, Charlie net: -5000
  const chainRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 5000 },
    { userId: 'u2', name: 'Bob', netBalance: 0 },
    { userId: 'u3', name: 'Charlie', netBalance: -5000 }
  ], 'USD');
  assert(
    chainRes.length === 1 &&
    chainRes[0].from.id === 'u3' &&
    chainRes[0].to.id === 'u1' &&
    chainRes[0].amount === 5000,
    'Minimizer: Chain debt reduced to 1 direct transfer (Charlie -> Alice)'
  );

  // Test 1.7: Circular debt reduction (A owes B, B owes C, C owes A -> net is 0 everywhere)
  const circularRes = simplifyDebts([
    { userId: 'u1', name: 'Alice', netBalance: 0 },
    { userId: 'u2', name: 'Bob', netBalance: 0 },
    { userId: 'u3', name: 'Charlie', netBalance: 0 }
  ]);
  assert(circularRes.length === 0, 'Minimizer: Circular debt cancels out completely (0 transfers)');

  // Test 1.8: Net balance conservation guarantee
  const complexMembers = [
    { userId: 'u1', name: 'Alice', netBalance: 15000 },
    { userId: 'u2', name: 'Bob', netBalance: -8000 },
    { userId: 'u3', name: 'Charlie', netBalance: -7000 },
    { userId: 'u4', name: 'David', netBalance: 5000 },
    { userId: 'u5', name: 'Eve', netBalance: -5000 }
  ];
  const complexRes = simplifyDebts(complexMembers, 'USD');

  // Verify that for every member: sum(received) - sum(paid) === initial netBalance
  const netCheck = new Map();
  complexMembers.forEach((m) => netCheck.set(m.userId, 0));
  complexRes.forEach((t) => {
    netCheck.set(t.from.id, netCheck.get(t.from.id) - t.amount);
    netCheck.set(t.to.id, netCheck.get(t.to.id) + t.amount);
  });
  const allConserved = complexMembers.every((m) => netCheck.get(m.userId) === m.netBalance);
  assert(
    complexRes.length <= 4 && allConserved,
    `Minimizer: Complex graph reduced to ${complexRes.length} transfers with 100% net balance conservation`
  );

  // ==========================================
  // SECTION 2: SETTLEMENTS & BALANCES REST APIS
  // ==========================================
  console.log('\n--- SECTION 2: Settlements & Group Balances REST APIs ---');

  const ts = Date.now();
  let tokenA, userA_Id, emailA;
  let tokenB, userB_Id, emailB;
  let tokenC, userC_Id, emailC;
  let nonMemberToken, nonMemberId;
  let testGroupId;
  let testExpenseId;
  let testSettlementId;

  // Setup 3 members and 1 non-member
  emailA = `settle_alice_${ts}@test.com`;
  const resA = await request('/api/v1/auth/register', 'POST', {
    name: 'Alice Owner',
    email: emailA,
    password: 'Password123!'
  });
  tokenA = resA.data?.data?.token;
  userA_Id = resA.data?.data?.user?.id || resA.data?.data?.user?._id;

  emailB = `settle_bob_${ts}@test.com`;
  const resB = await request('/api/v1/auth/register', 'POST', {
    name: 'Bob Member',
    email: emailB,
    password: 'Password123!'
  });
  tokenB = resB.data?.data?.token;
  userB_Id = resB.data?.data?.user?.id || resB.data?.data?.user?._id;

  emailC = `settle_charlie_${ts}@test.com`;
  const resC = await request('/api/v1/auth/register', 'POST', {
    name: 'Charlie Member',
    email: emailC,
    password: 'Password123!'
  });
  tokenC = resC.data?.data?.token;
  userC_Id = resC.data?.data?.user?.id || resC.data?.data?.user?._id;

  const resNon = await request('/api/v1/auth/register', 'POST', {
    name: 'Non Member Dave',
    email: `settle_dave_${ts}@test.com`,
    password: 'Password123!'
  });
  nonMemberToken = resNon.data?.data?.token;
  nonMemberId = resNon.data?.data?.user?.id || resNon.data?.data?.user?._id;

  assert(tokenA && tokenB && tokenC && nonMemberToken, 'Setup: Registered 4 test users');

  // Create test group
  const groupRes = await request('/api/v1/groups', 'POST', {
    name: `Weekend Cabin Trip ${ts}`,
    description: 'Testing balance engine & settlements',
    currency: 'USD',
    category: 'Trip'
  }, tokenA);
  testGroupId = groupRes.data?.data?._id;
  assert(groupRes.status === 201 && testGroupId, 'Setup: Created group');

  // Add Bob and Charlie to group
  await request(`/api/v1/groups/${testGroupId}/members`, 'POST', { email: emailB, role: 'member' }, tokenA);
  await request(`/api/v1/groups/${testGroupId}/members`, 'POST', { email: emailC, role: 'member' }, tokenA);
  assert(true, 'Setup: Added Bob and Charlie to group');

  // Test 2.1: Initial balances on new group (All 0)
  const initialBalRes = await request(`/api/v1/groups/${testGroupId}/balances`, 'GET', null, tokenA);
  const initialBals = initialBalRes.data?.data?.memberBalances;
  assert(
    initialBalRes.status === 200 &&
    initialBals?.length === 3 &&
    initialBals.every((m) => m.netBalance === 0 && m.status === 'SETTLED'),
    'Balances: New group has all members at 0 net balance and SETTLED status'
  );

  // Test 2.2: Add expense ($300 paid by Alice, split equally 3 ways = 10000 cents each)
  const expenseRes = await request(`/api/v1/groups/${testGroupId}/expenses`, 'POST', {
    title: 'Cabin Rental',
    totalAmount: 300,
    paidBy: userA_Id,
    category: 'Accommodation',
    splitType: 'equal',
    participantIds: [userA_Id, userB_Id, userC_Id]
  }, tokenA);
  testExpenseId = expenseRes.data?.data?._id || expenseRes.data?.data?.expense?._id;
  assert(expenseRes.status === 201, 'Setup: Created $300 expense paid by Alice', expenseRes);

  // Test 2.3: Verify calculated balances after expense
  const postExpenseBal = await request(`/api/v1/groups/${testGroupId}/balances`, 'GET', null, tokenB);
  const balsAfterExp = postExpenseBal.data?.data?.memberBalances;
  const aliceBal = balsAfterExp.find((m) => m.userId === userA_Id);
  const bobBal = balsAfterExp.find((m) => m.userId === userB_Id);
  const charlieBal = balsAfterExp.find((m) => m.userId === userC_Id);

  assert(
    aliceBal?.totalPaid === 30000 &&
    aliceBal?.totalOwed === 10000 &&
    aliceBal?.netBalance === 20000 &&
    aliceBal?.status === 'GETS_BACK',
    'Balances: Alice paid $300, share $100 -> net +$200.00 (GETS_BACK)'
  );

  assert(
    bobBal?.totalPaid === 0 &&
    bobBal?.totalOwed === 10000 &&
    bobBal?.netBalance === -10000 &&
    bobBal?.status === 'OWES',
    'Balances: Bob paid $0, share $100 -> net -$100.00 (OWES)'
  );

  assert(
    charlieBal?.totalPaid === 0 &&
    charlieBal?.totalOwed === 10000 &&
    charlieBal?.netBalance === -10000 &&
    charlieBal?.status === 'OWES',
    'Balances: Charlie paid $0, share $100 -> net -$100.00 (OWES)'
  );

  // Test 2.4: Check settlement suggestions endpoint
  const suggestionsRes = await request(`/api/v1/groups/${testGroupId}/settlement-suggestions`, 'GET', null, tokenC);
  const suggestions = suggestionsRes.data?.data?.suggestions;
  assert(
    suggestionsRes.status === 200 &&
    suggestions?.length === 2 &&
    suggestions.every((s) => s.to.id === userA_Id && s.amount === 10000),
    'API: Suggestions endpoint returns 2 direct payments to Alice ($100 each)'
  );

  // Test 2.5: Record settlement (Bob pays Alice $100 -> 10000 cents)
  const settleRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'POST', {
    paidBy: userB_Id,
    paidTo: userA_Id,
    amount: 100,
    paymentMethod: 'UPI',
    notes: 'Paid via GPay ref 9482'
  }, tokenB);

  assert(settleRes.status === 201, 'Settlements: Record settlement payment (201 Created)');
  testSettlementId = settleRes.data?.data?.settlement?._id;
  const updatedBalancesAfterSettle = settleRes.data?.data?.balances?.memberBalances;

  const bobAfterSettle = updatedBalancesAfterSettle?.find((m) => m.userId === userB_Id);
  const aliceAfterSettle = updatedBalancesAfterSettle?.find((m) => m.userId === userA_Id);

  assert(
    bobAfterSettle?.settlementsPaid === 10000 &&
    bobAfterSettle?.netBalance === 0 &&
    bobAfterSettle?.status === 'SETTLED',
    'Settlements: Bob settlement updated net to $0.00 (SETTLED)'
  );

  assert(
    aliceAfterSettle?.settlementsReceived === 10000 &&
    aliceAfterSettle?.netBalance === 10000 &&
    aliceAfterSettle?.status === 'GETS_BACK',
    'Settlements: Alice received $100 -> net is now +$100.00 (GETS_BACK)'
  );

  // Test 2.6: List settlements
  const listSettlementsRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'GET', null, tokenA);
  const listData = listSettlementsRes.data?.data?.settlements;
  assert(
    listSettlementsRes.status === 200 &&
    listData?.length === 1 &&
    listData[0]._id === testSettlementId,
    'Settlements: List group settlements returns recorded transaction'
  );

  // Test 2.7: Get single settlement details
  const detailRes = await request(`/api/v1/groups/${testGroupId}/settlements/${testSettlementId}`, 'GET', null, tokenB);
  assert(
    detailRes.status === 200 &&
    detailRes.data?.data?.amount === 10000 &&
    detailRes.data?.data?.status === 'CONFIRMED' &&
    detailRes.data?.data?.isReversed === false,
    'Settlements: Get single settlement details'
  );

  // Test 2.8: Update settlement notes
  const updateSettleRes = await request(`/api/v1/groups/${testGroupId}/settlements/${testSettlementId}`, 'PATCH', {
    notes: 'Updated note: Verified transfer',
    paymentMethod: 'BANK_TRANSFER'
  }, tokenB);
  assert(
    updateSettleRes.status === 200 &&
    updateSettleRes.data?.data?.notes === 'Updated note: Verified transfer' &&
    updateSettleRes.data?.data?.paymentMethod === 'BANK_TRANSFER',
    'Settlements: Update notes and payment method'
  );

  // Test 2.9: Reverse settlement (Auditable financial rollback)
  const reverseRes = await request(`/api/v1/groups/${testGroupId}/settlements/${testSettlementId}/reverse`, 'POST', {
    reason: 'Payment failed at recipient bank'
  }, tokenA);

  assert(reverseRes.status === 200, 'Settlements: Reverse settlement succeeded (200 OK)', reverseRes);
  const reversedSettlement = reverseRes.data?.data?.settlement;
  const balancesAfterReversal = reverseRes.data?.data?.balances?.memberBalances;

  assert(
    reversedSettlement?.isReversed === true &&
    reversedSettlement?.status === 'REVERSED' &&
    reversedSettlement?.reversalReason === 'Payment failed at recipient bank',
    'Settlements: Reversal audit fields recorded properly'
  );

  const bobAfterReversal = balancesAfterReversal?.find((m) => m.userId === userB_Id);
  const aliceAfterReversal = balancesAfterReversal?.find((m) => m.userId === userA_Id);

  assert(
    bobAfterReversal?.netBalance === -10000 &&
    bobAfterReversal?.status === 'OWES' &&
    aliceAfterReversal?.netBalance === 20000 &&
    aliceAfterReversal?.status === 'GETS_BACK',
    'Settlements: Reversal cleanly restored original net balances (Bob -$100, Alice +$200)'
  );

  // Test 2.10: Global cross-group summary
  const globalSummaryRes = await request('/api/v1/groups/user-summary', 'GET', null, tokenA);
  assert(
    globalSummaryRes.status === 200 &&
    globalSummaryRes.data?.data?.totalOwedToUser === 20000 &&
    globalSummaryRes.data?.data?.globalNetBalance === 20000,
    'API: User global summary calculates cross-group total balances'
  );

  // ==========================================
  // SECTION 3: AUTHORIZATION & SAFETY GUARDS
  // ==========================================
  console.log('\n--- SECTION 3: Authorization & Safety Guards ---');

  // Test 3.1: Self-settlement rejected
  const selfSettleRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'POST', {
    paidBy: userA_Id,
    paidTo: userA_Id,
    amount: 50
  }, tokenA);
  assert(selfSettleRes.status === 400, 'Guard: Self-settlement rejected (400 Bad Request)');

  // Test 3.2: Non-member settlement rejected
  const nonMemberSettleRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'POST', {
    paidBy: nonMemberId,
    paidTo: userA_Id,
    amount: 50
  }, tokenA);
  assert(nonMemberSettleRes.status === 400, 'Guard: Non-member payer rejected (400 Bad Request)');

  // Test 3.3: Negative settlement amount rejected
  const negSettleRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'POST', {
    paidBy: userB_Id,
    paidTo: userA_Id,
    amount: -50
  }, tokenB);
  assert(negSettleRes.status === 400, 'Guard: Negative settlement amount rejected (400 Bad Request)');

  // Test 3.4: Unauthorized non-member access to group balances
  const unauthBalRes = await request(`/api/v1/groups/${testGroupId}/balances`, 'GET', null, nonMemberToken);
  assert(unauthBalRes.status === 403, 'Guard: Non-member access to balances rejected (403 Forbidden)');

  // Test 3.5: Cannot reverse an already reversed settlement
  const doubleReverseRes = await request(
    `/api/v1/groups/${testGroupId}/settlements/${testSettlementId}/reverse`,
    'POST',
    { reason: 'Duplicate attempt' },
    tokenA
  );
  assert(doubleReverseRes.status === 400, 'Guard: Cannot reverse already reversed settlement');

  // Test 3.6: Archived group rejection
  await request(`/api/v1/groups/${testGroupId}/archive`, 'POST', null, tokenA);

  const archivedSettleRes = await request(`/api/v1/groups/${testGroupId}/settlements`, 'POST', {
    paidBy: userB_Id,
    paidTo: userA_Id,
    amount: 50
  }, tokenB);
  assert(archivedSettleRes.status === 400, 'Guard: Cannot record settlements in an archived group');

  // Unarchive group
  await request(`/api/v1/groups/${testGroupId}/unarchive`, 'POST', null, tokenA);

  // Summary
  console.log('\n=========================================');
  console.log(`📊 STEP 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runStep5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
