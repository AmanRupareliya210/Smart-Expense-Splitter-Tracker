/**
 * Comprehensive Automated Verification Test Suite for STEP 6:
 * Dashboard, Financial Insights & Analytics
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

const runStep6Tests = async () => {
  console.log('🧪 Starting STEP 6: Dashboard, Financial Insights & Analytics Test Suite...\n');
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

    // 1. Create Test Users
    console.log('\n--- 1. Setting up Test Users for Analytics ---');
    const userA_res = await request('/api/v1/auth/register', 'POST', {
      name: `Analytics User A ${timestamp}`,
      email: `user_a_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenA = userA_res.data.data.token;
    const userAId = userA_res.data.data.user.id || userA_res.data.data.user._id;

    const userB_res = await request('/api/v1/auth/register', 'POST', {
      name: `Analytics User B ${timestamp}`,
      email: `user_b_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenB = userB_res.data.data.token;
    const userBId = userB_res.data.data.user.id || userB_res.data.data.user._id;

    const userC_res = await request('/api/v1/auth/register', 'POST', {
      name: `Analytics User C ${timestamp}`,
      email: `user_c_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenC = userC_res.data.data.token;
    const userCId = userC_res.data.data.user.id || userC_res.data.data.user._id;

    assert(tokenA && tokenB && tokenC, 'All 3 test users registered successfully');

    // 2. Empty Dashboard Test (New User with 0 groups)
    console.log('\n--- 2. Empty Dashboard Verification (New User) ---');
    const emptyDash = await request('/api/v1/analytics/dashboard', 'GET', null, tokenA);
    assert(emptyDash.status === 200, 'User dashboard endpoint returns 200 for empty profile');
    assert(emptyDash.data.data.summary.totalExpensesPaid === 0, 'New user totalExpensesPaid is 0');
    assert(emptyDash.data.data.summary.totalOwedToUser === 0, 'New user totalOwedToUser is 0');
    assert(emptyDash.data.data.summary.totalUserOwes === 0, 'New user totalUserOwes is 0');
    assert(emptyDash.data.data.summary.globalNetBalance === 0, 'New user globalNetBalance is 0');
    assert(emptyDash.data.data.summary.activeGroupCount === 0, 'New user activeGroupCount is 0');
    assert(emptyDash.data.data.categorySpending.length === 0, 'New user categorySpending is empty array');
    assert(emptyDash.data.data.recentExpenses.length === 0, 'New user recentExpenses is empty array');

    // 3. Create Group and Invite Members
    console.log('\n--- 3. Creating Group & Adding Expenses Across Categories & Dates ---');
    const grpRes = await request('/api/v1/groups', 'POST', {
      name: `Analytics Trip ${timestamp}`,
      category: 'Trip',
      currency: 'USD'
    }, tokenA);
    const groupId = grpRes.data.data._id;

    // Add B and C to group
    await request(`/api/v1/groups/${groupId}/members`, 'POST', { email: `user_b_${timestamp}@example.com` }, tokenA);
    await request(`/api/v1/groups/${groupId}/members`, 'POST', { email: `user_c_${timestamp}@example.com` }, tokenA);

    // Add Expense 1: Food - $90 paid by A split equally among A, B, C ($30 each)
    const exp1 = await request(`/api/v1/groups/${groupId}/expenses`, 'POST', {
      description: 'Group Welcome Dinner',
      totalAmount: 90,
      currency: 'USD',
      category: 'Food',
      paidBy: userAId,
      splitType: 'EQUAL',
      expenseDate: new Date('2026-03-01T12:00:00Z').toISOString()
    }, tokenA);
    assert(exp1.status === 201, 'Expense 1 (Food, $90, Equal) created');

    // Add Expense 2: Transportation - $60 paid by B split equally among A, B, C ($20 each)
    const exp2 = await request(`/api/v1/groups/${groupId}/expenses`, 'POST', {
      description: 'Airport Cab Transfer',
      totalAmount: 60,
      currency: 'USD',
      category: 'Transportation',
      paidBy: userBId,
      splitType: 'EQUAL',
      expenseDate: new Date('2026-03-05T15:30:00Z').toISOString()
    }, tokenB);
    assert(exp2.status === 201, 'Expense 2 (Transportation, $60, Equal) created');

    // Add Expense 3: Entertainment - $150 paid by A split equally between A, B ($75 each, C not involved)
    const exp3 = await request(`/api/v1/groups/${groupId}/expenses`, 'POST', {
      description: 'Concert Tickets',
      totalAmount: 150,
      currency: 'USD',
      category: 'Entertainment',
      paidBy: userAId,
      splitType: 'EXACT',
      splits: [
        { userId: userAId, amount: 75 },
        { userId: userBId, amount: 75 }
      ],
      expenseDate: new Date('2026-04-10T20:00:00Z').toISOString()
    }, tokenA);
    assert(exp3.status === 201, 'Expense 3 (Entertainment, $150, Exact A+B) created', exp3.data);

    // 4. Test User Dashboard Analytics for User A
    console.log('\n--- 4. User Dashboard Aggregation & Totals Verification ---');
    const userADash = await request('/api/v1/analytics/dashboard', 'GET', null, tokenA);
    assert(userADash.status === 200, 'Fetched User A dashboard metrics');
    
    // Total expenses paid by User A = 9000 (Dinner) + 15000 (Concert) = 24000 cents ($240.00)
    assert(
      userADash.data.data.summary.totalExpensesPaid === 24000,
      'User A totalExpensesPaid is exactly $240.00 (24000 cents)',
      userADash.data.data.summary
    );

    // In this group:
    // A paid $240, owed share = $30 (Dinner) + $20 (Cab) + $75 (Concert) = $125. Net balance = +$115 (11500 cents)
    // B paid $60, owed share = $30 + $20 + $75 = $125. Net balance = -$65 (-6500 cents)
    // C paid $0, owed share = $30 (Dinner). Net balance = -$30 (-3000 cents)
    // For User A: owed to user = 11500 cents, user owes = 0, net = +11500
    assert(userADash.data.data.summary.totalOwedToUser === 11500, 'User A is owed $115.00 (11500 cents)');
    assert(userADash.data.data.summary.totalUserOwes === 0, 'User A owes $0.00');
    assert(userADash.data.data.summary.globalNetBalance === 11500, 'User A net balance is +$115.00');
    assert(userADash.data.data.summary.activeGroupCount === 1, 'User A has 1 active group');

    // User A category spending share:
    // Food: $30 (3000 cents)
    // Transport: $20 (2000 cents)
    // Entertainment: $75 (7500 cents)
    const catMapA = {};
    userADash.data.data.categorySpending.forEach(c => { catMapA[c._id] = c.userShareAmount; });
    assert(catMapA['Food'] === 3000, 'User A Food spending share is $30.00 (3000 cents)');
    assert(catMapA['Transportation'] === 2000, 'User A Transportation spending share is $20.00 (2000 cents)');
    assert(catMapA['Entertainment'] === 7500, 'User A Entertainment spending share is $75.00 (7500 cents)');

    // 5. Group-Level Analytics Aggregations
    console.log('\n--- 5. Group Analytics: Category, Monthly & Payer Breakdown ---');
    const groupAnalytics = await request(`/api/v1/groups/${groupId}/analytics`, 'GET', null, tokenA);
    assert(groupAnalytics.status === 200, 'Group analytics endpoint returned 200');
    assert(groupAnalytics.data.data.summary.totalSpending === 30000, 'Group total spending is $300.00 (30000 cents)');
    assert(groupAnalytics.data.data.summary.expenseCount === 3, 'Group expense count is 3');
    assert(groupAnalytics.data.data.summary.avgExpenseAmount === 10000, 'Average expense amount is $100.00 (10000 cents)');

    // Category breakdown percentage check
    const grpCatStats = groupAnalytics.data.data.categoryStats;
    const entCat = grpCatStats.find(c => c.category === 'Entertainment');
    assert(entCat && entCat.totalAmount === 15000 && entCat.percentage === 50.0, 'Entertainment is 50.0% ($150)');

    const foodCat = grpCatStats.find(c => c.category === 'Food');
    assert(foodCat && foodCat.totalAmount === 9000 && foodCat.percentage === 30.0, 'Food is 30.0% ($90)');

    const transCat = grpCatStats.find(c => c.category === 'Transportation');
    assert(transCat && transCat.totalAmount === 6000 && transCat.percentage === 20.0, 'Transportation is 20.0% ($60)');

    // Monthly trends check
    const monthlyStats = groupAnalytics.data.data.monthlyStats;
    assert(monthlyStats.length === 2, 'Monthly stats correctly aggregated across 2 months (March & April)');
    const marchStat = monthlyStats.find(m => m.month === 3);
    assert(marchStat && marchStat.totalAmount === 15000, 'March total is $150.00 ($90 + $60)');
    const aprilStat = monthlyStats.find(m => m.month === 4);
    assert(aprilStat && aprilStat.totalAmount === 15000, 'April total is $150.00');

    // Payer stats check
    const payerStats = groupAnalytics.data.data.payerStats;
    const payerA = payerStats.find(p => p.userId === userAId);
    assert(payerA && payerA.totalAmount === 24000 && payerA.percentage === 80.0, 'User A paid $240 (80.0%)');
    const payerB = payerStats.find(p => p.userId === userBId);
    assert(payerB && payerB.totalAmount === 6000 && payerB.percentage === 20.0, 'User B paid $60 (20.0%)');

    // 6. Date Range & Category Filtering on Group Analytics
    console.log('\n--- 6. Date Range & Category Filtering ---');
    // Filter by March only
    const marchFilter = await request(
      `/api/v1/groups/${groupId}/analytics?startDate=2026-03-01&endDate=2026-03-31`,
      'GET',
      null,
      tokenA
    );
    assert(marchFilter.status === 200, 'March date filter returns 200');
    assert(marchFilter.data.data.summary.totalSpending === 15000, 'March spending total is $150.00');
    assert(marchFilter.data.data.summary.expenseCount === 2, 'March has 2 expenses');

    // Filter by Category = Food
    const foodFilter = await request(
      `/api/v1/groups/${groupId}/analytics?category=Food`,
      'GET',
      null,
      tokenA
    );
    assert(foodFilter.status === 200, 'Category Food filter returns 200');
    assert(foodFilter.data.data.summary.totalSpending === 9000, 'Food category total is $90.00');
    assert(foodFilter.data.data.categoryStats.length === 1, 'Only Food is returned in categoryStats');

    // Invalid date format test
    const invalidDate = await request(
      `/api/v1/groups/${groupId}/analytics?startDate=invalid-date`,
      'GET',
      null,
      tokenA
    );
    assert(invalidDate.status === 400, 'Invalid startDate returns 400 Bad Request error');

    // 7. Settlement Separation (Settlements should NOT count as expenses)
    console.log('\n--- 7. Verification of Separation: Settlements vs Expenses ---');
    // User C settles $30 to User A
    const settleRes = await request(`/api/v1/groups/${groupId}/settlements`, 'POST', {
      paidBy: userCId,
      paidTo: userAId,
      amount: 30,
      paymentMethod: 'VENMO',
      referenceNote: 'Settling welcome dinner debt'
    }, tokenC);
    assert(settleRes.status === 201, 'Recorded $30 settlement from C to A', settleRes.data);

    // Re-check Group Analytics spending total: MUST REMAIN $300 (not $330!)
    const postSettleAnalytics = await request(`/api/v1/groups/${groupId}/analytics`, 'GET', null, tokenA);
    assert(
      postSettleAnalytics.data.data.summary.totalSpending === 30000,
      'Group total spending is strictly preserved at $300.00 (settlement NOT double-counted as expense)'
    );

    // Re-check User Dashboard for A:
    // C paid A $30, so C now owes $0 to A.
    // User A net balance after receiving $30 = $115 - $30 = $85 (8500 cents owed to A from B)
    const userADashAfterSettle = await request('/api/v1/analytics/dashboard', 'GET', null, tokenA);
    assert(
      userADashAfterSettle.data.data.summary.totalOwedToUser === 8500,
      'User A is now owed $85.00 after receiving $30 settlement'
    );
    assert(
      userADashAfterSettle.data.data.recentSettlements.length >= 1,
      'User A recent settlements feed shows the received payment'
    );

    // 8. Group Activity Timeline and Pagination
    console.log('\n--- 8. Group Activity Timeline & Pagination ---');
    const activityRes = await request(`/api/v1/groups/${groupId}/activity?limit=10&page=1`, 'GET', null, tokenA);
    assert(activityRes.status === 200, 'Fetched group activity log timeline');
    assert(activityRes.data.data.logs.length >= 4, 'Activity log contains logged actions (creation, members, expenses, settlement)');
    assert(activityRes.data.data.pagination.page === 1, 'Pagination page is 1');
    assert(activityRes.data.data.pagination.total >= 4, 'Pagination total reflects logged events');

    // 9. Multi-Tenant Authorization Security
    console.log('\n--- 9. Security & Multi-Tenant Authorization ---');
    // Create an outsider user D not in the group
    const userD_res = await request('/api/v1/auth/register', 'POST', {
      name: `Outsider User ${timestamp}`,
      email: `user_d_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenD = userD_res.data.data.token;

    const outsiderAnalytics = await request(`/api/v1/groups/${groupId}/analytics`, 'GET', null, tokenD);
    assert(outsiderAnalytics.status === 403, 'Non-member access to group analytics is rejected with 403 Forbidden');

    const outsiderActivity = await request(`/api/v1/groups/${groupId}/activity`, 'GET', null, tokenD);
    assert(outsiderActivity.status === 403, 'Non-member access to group activity is rejected with 403 Forbidden');

    const unauthAnalytics = await request(`/api/v1/groups/${groupId}/analytics`, 'GET', null, null);
    assert(unauthAnalytics.status === 401, 'Unauthenticated access to group analytics is rejected with 401 Unauthorized');

    console.log(`\n========================================`);
    console.log(`Step 6 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runStep6Tests();
