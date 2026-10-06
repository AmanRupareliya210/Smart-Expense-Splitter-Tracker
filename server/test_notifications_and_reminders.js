/**
 * Comprehensive Automated Verification Test Suite for STEP 7:
 * In-App Notifications & Settlement Reminders
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

const runStep7Tests = async () => {
  console.log('🧪 Starting STEP 7: In-App Notifications & Settlement Reminders Test Suite...\n');
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
    console.log('\n--- 1. Setting Up Test Accounts ---');
    const userA_res = await request('/api/v1/auth/register', 'POST', {
      name: `Alice Notifications ${timestamp}`,
      email: `alice_notif_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenA = userA_res.data.data.token;
    const userAId = userA_res.data.data.user.id || userA_res.data.data.user._id;

    const userB_res = await request('/api/v1/auth/register', 'POST', {
      name: `Bob Notifications ${timestamp}`,
      email: `bob_notif_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenB = userB_res.data.data.token;
    const userBId = userB_res.data.data.user.id || userB_res.data.data.user._id;

    const userC_res = await request('/api/v1/auth/register', 'POST', {
      name: `Charlie Notifications ${timestamp}`,
      email: `charlie_notif_${timestamp}@example.com`,
      password: 'Password123!'
    });
    const tokenC = userC_res.data.data.token;
    const userCId = userC_res.data.data.user.id || userC_res.data.data.user._id;

    assert(tokenA && tokenB && tokenC, 'Registered 3 test users for notification tests');

    // 2. Setup Group & Verify Member Add Notification
    console.log('\n--- 2. Member Added Notification Verification ---');
    const grpRes = await request('/api/v1/groups', 'POST', {
      name: `Notification Group ${timestamp}`,
      category: 'Trip',
      currency: 'USD'
    }, tokenA);
    const groupId = grpRes.data.data._id;

    // Alice adds Bob to group
    await request(`/api/v1/groups/${groupId}/members`, 'POST', {
      email: `bob_notif_${timestamp}@example.com`
    }, tokenA);

    // Alice adds Charlie to group
    await request(`/api/v1/groups/${groupId}/members`, 'POST', {
      email: `charlie_notif_${timestamp}@example.com`
    }, tokenA);

    // Check Bob's inbox: should receive MEMBER_ADDED welcome notification
    const bobInbox1 = await request('/api/v1/notifications', 'GET', null, tokenB);
    assert(bobInbox1.status === 200, 'Fetched Bob notification inbox');
    assert(bobInbox1.data.data.notifications.length >= 1, 'Bob received MEMBER_ADDED notification');
    const bobWelcome = bobInbox1.data.data.notifications.find(n => n.type === 'MEMBER_ADDED');
    assert(bobWelcome && bobWelcome.recipient === userBId, 'Welcome notification recipient is Bob');
    assert(bobInbox1.data.data.unreadCount >= 1, 'Bob unread count is at least 1');

    // 3. Expense Creation Trigger Notifications
    console.log('\n--- 3. Expense Creation Notifications ---');
    // Alice records a $90 expense split equally between Alice, Bob, Charlie ($30 each)
    const expRes = await request(`/api/v1/groups/${groupId}/expenses`, 'POST', {
      description: 'Mountain Cabin Rental',
      totalAmount: 90,
      currency: 'USD',
      category: 'Accommodation',
      paidBy: userAId,
      splitType: 'EQUAL',
      expenseDate: new Date().toISOString()
    }, tokenA);
    const expenseId = expRes.data.data.expense._id;
    assert(expRes.status === 201, 'Expense recorded by Alice');

    // Check Alice inbox: Alice (payer) should NOT receive a notification for her own expense
    const aliceInbox1 = await request('/api/v1/notifications', 'GET', null, tokenA);
    const aliceSelfExpense = aliceInbox1.data.data.notifications.find(
      n => n.type === 'EXPENSE_ADDED' && n.relatedEntityId === expenseId
    );
    assert(!aliceSelfExpense, 'Alice (payer) did NOT receive redundant self-notification');

    // Check Bob inbox: Bob should have received EXPENSE_ADDED notification
    const bobInbox2 = await request('/api/v1/notifications', 'GET', null, tokenB);
    const bobExpNotif = bobInbox2.data.data.notifications.find(
      n => n.type === 'EXPENSE_ADDED' && String(n.relatedEntityId) === String(expenseId)
    );
    assert(bobExpNotif !== undefined, 'Bob received EXPENSE_ADDED notification');
    if (bobExpNotif) {
      assert(bobExpNotif.message.includes('$30.00') || bobExpNotif.message.includes('30.00'), 'Notification includes user split share');
    }

    // Check Charlie inbox: Charlie also received EXPENSE_ADDED notification
    const charlieInbox1 = await request('/api/v1/notifications', 'GET', null, tokenC);
    const charlieExpNotif = charlieInbox1.data.data.notifications.find(
      n => n.type === 'EXPENSE_ADDED' && n.relatedEntityId === expenseId
    );
    assert(charlieExpNotif !== undefined, 'Charlie received EXPENSE_ADDED notification');

    // 4. Expense Update Trigger Notification
    console.log('\n--- 4. Expense Update Notifications ---');
    await request(`/api/v1/groups/${groupId}/expenses/${expenseId}`, 'PATCH', {
      title: 'Mountain Luxury Cabin Rental'
    }, tokenA);

    const bobInbox3 = await request('/api/v1/notifications', 'GET', null, tokenB);
    const bobUpdateNotif = bobInbox3.data.data.notifications.find(
      n => n.type === 'EXPENSE_UPDATED' && n.relatedEntityId === expenseId
    );
    assert(bobUpdateNotif !== undefined, 'Bob received EXPENSE_UPDATED notification');

    // 5. Settlement Recording Trigger Notification
    console.log('\n--- 5. Settlement Recording Notifications ---');
    // Bob pays Alice $30
    const settleRes = await request(`/api/v1/groups/${groupId}/settlements`, 'POST', {
      paidBy: userBId,
      paidTo: userAId,
      amount: 30,
      paymentMethod: 'UPI',
      notes: 'Cabin split'
    }, tokenB);
    const settlementId = settleRes.data.data.settlement._id;
    assert(settleRes.status === 201, 'Recorded $30 settlement from Bob to Alice');

    // Alice should receive SETTLEMENT_RECORDED notification
    const aliceInbox2 = await request('/api/v1/notifications', 'GET', null, tokenA);
    const aliceSettleNotif = aliceInbox2.data.data.notifications.find(
      n => n.type === 'SETTLEMENT_RECORDED' && String(n.relatedEntityId) === String(settlementId)
    );
    assert(aliceSettleNotif !== undefined, 'Alice received SETTLEMENT_RECORDED notification for received payment');
    if (aliceSettleNotif) {
      assert(aliceSettleNotif.message.includes('Bob') || aliceSettleNotif.title.includes('Payment Received'), 'Notification details payer');
    }

    // 6. Settlement Reversal Trigger Notification
    console.log('\n--- 6. Settlement Reversal Notifications ---');
    await request(`/api/v1/groups/${groupId}/settlements/${settlementId}/reverse`, 'POST', {
      reason: 'Incorrect transaction amount'
    }, tokenA);

    // Bob should receive SETTLEMENT_REVERSED notification
    const bobInbox4 = await request('/api/v1/notifications', 'GET', null, tokenB);
    const bobReversalNotif = bobInbox4.data.data.notifications.find(
      n => n.type === 'SETTLEMENT_REVERSED' && String(n.relatedEntityId) === String(settlementId)
    );
    assert(bobReversalNotif !== undefined, 'Bob received SETTLEMENT_REVERSED notification');

    // 7. Settlement Reminders & Cooldown Anti-Spam Rules
    console.log('\n--- 7. Settlement Reminders & Cooldown Rate Limiting ---');
    // Charlie owes Alice $30. Alice sends Charlie a settlement reminder.
    const reminderRes = await request(`/api/v1/groups/${groupId}/reminders`, 'POST', {
      debtorId: userCId,
      customNote: 'Please settle the cabin share before Friday'
    }, tokenA);
    assert(reminderRes.status === 201, 'Alice sent settlement reminder to Charlie (201 Created)');

    // Charlie should receive SETTLEMENT_REMINDER notification
    const charlieInbox2 = await request('/api/v1/notifications', 'GET', null, tokenC);
    const charlieReminder = charlieInbox2.data.data.notifications.find(
      n => n.type === 'SETTLEMENT_REMINDER'
    );
    assert(charlieReminder !== undefined, 'Charlie received SETTLEMENT_REMINDER notification');
    assert(charlieReminder.message.includes('Please settle the cabin share'), 'Reminder contains custom note');

    // Attempt duplicate reminder immediately: MUST BE REJECTED (429 Too Many Requests / Cooldown active)
    const dupReminder = await request(`/api/v1/groups/${groupId}/reminders`, 'POST', {
      debtorId: userCId
    }, tokenA);
    assert(dupReminder.status === 429, 'Immediate second reminder is rate-limited (429 Too Many Requests on cooldown)');

    // Self-reminder rejection
    const selfReminder = await request(`/api/v1/groups/${groupId}/reminders`, 'POST', {
      debtorId: userAId
    }, tokenA);
    assert(selfReminder.status === 400, 'Self-reminder is rejected with 400 Bad Request');

    // 8. Notification Read State & Management APIs
    console.log('\n--- 8. Notification Read States & Bulk Actions ---');
    // Check Charlie unread count
    const charlieUnreadBefore = await request('/api/v1/notifications/unread-count', 'GET', null, tokenC);
    const initialUnread = charlieUnreadBefore.data.data.unreadCount;
    assert(initialUnread >= 2, `Charlie has ${initialUnread} unread notifications`);

    // Mark single notification read
    const notifToRead = charlieInbox2.data.data.notifications[0]._id;
    const markReadRes = await request(`/api/v1/notifications/${notifToRead}/read`, 'PATCH', null, tokenC);
    assert(markReadRes.status === 200, 'Marked individual notification as read');
    assert(markReadRes.data.data.notification.isRead === true, 'Notification isRead is true');
    assert(markReadRes.data.data.unreadCount === initialUnread - 1, 'Unread count decremented by 1');

    // Mark all read
    const markAllRes = await request('/api/v1/notifications/read-all', 'PATCH', null, tokenC);
    assert(markAllRes.status === 200, 'Marked all notifications as read');
    assert(markAllRes.data.data.unreadCount === 0, 'Unread count is now 0');

    // Delete a notification
    const deleteRes = await request(`/api/v1/notifications/${notifToRead}`, 'DELETE', null, tokenC);
    assert(deleteRes.status === 200, 'Deleted notification successfully');

    // 9. Multi-Tenant Authorization Security & Isolation
    console.log('\n--- 9. Cross-User Isolation & Security ---');
    // User B tries to mark User A's notification as read: MUST BE REJECTED with 403
    const aliceNotifId = aliceInbox2.data.data.notifications[0]._id;
    const hijackRead = await request(`/api/v1/notifications/${aliceNotifId}/read`, 'PATCH', null, tokenB);
    assert(hijackRead.status === 403, 'Cross-user attempt to mark another user notification read is 403 Forbidden');

    // User B tries to delete User A's notification: MUST BE REJECTED with 403
    const hijackDelete = await request(`/api/v1/notifications/${aliceNotifId}`, 'DELETE', null, tokenB);
    assert(hijackDelete.status === 403, 'Cross-user attempt to delete another user notification is 403 Forbidden');

    // Unauthenticated access
    const unauthNotifs = await request('/api/v1/notifications', 'GET', null, null);
    assert(unauthNotifs.status === 401, 'Unauthenticated access to notifications rejected with 401 Unauthorized');

    // 10. Archived Group Reminder Rules
    console.log('\n--- 10. Archived Group Rules ---');
    // Archive group
    await request(`/api/v1/groups/${groupId}/archive`, 'POST', null, tokenA);

    // Attempting to send a reminder in an archived group must fail (400)
    const archivedReminder = await request(`/api/v1/groups/${groupId}/reminders`, 'POST', {
      debtorId: userCId
    }, tokenA);
    assert(archivedReminder.status === 400, 'Cannot send settlement reminders for an archived group (400 Bad Request)');

    console.log(`\n========================================`);
    console.log(`Step 7 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runStep7Tests();
