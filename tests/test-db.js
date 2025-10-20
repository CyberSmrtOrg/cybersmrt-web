/**
 * Test D1 Database CRUD Operations
 * Run with: npx wrangler dev and make requests to this worker
 */

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // Test routes
    if (pathname === '/test-db') {
      return await testDatabase(env.DB);
    }

    return new Response('D1 Test Endpoints:\n\n/test-db - Run all CRUD tests', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

async function testDatabase(db) {
  const results = [];
  let allPassed = true;

  try {
    // Test 1: Create User
    results.push('\n🧪 Test 1: CREATE USER');
    const userId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    const createResult = await db
      .prepare(`
        INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        'test@cybersmrt.org',
        '$2a$10$test_hash_here',
        'Test User',
        'user',
        timestamp,
        timestamp
      )
      .run();

    if (createResult.success) {
      results.push('✅ User created successfully');
    } else {
      results.push('❌ Failed to create user');
      allPassed = false;
    }

    // Test 2: Read User
    results.push('\n🧪 Test 2: READ USER');
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (user && user.email === 'test@cybersmrt.org') {
      results.push('✅ User retrieved successfully');
      results.push(`   Email: ${user.email}`);
      results.push(`   Display Name: ${user.display_name}`);
      results.push(`   Role: ${user.role}`);
    } else {
      results.push('❌ Failed to retrieve user');
      allPassed = false;
    }

    // Test 3: Update User
    results.push('\n🧪 Test 3: UPDATE USER');
    const updateResult = await db
      .prepare('UPDATE users SET display_name = ?, last_login_at = ? WHERE id = ?')
      .bind('Updated Test User', timestamp, userId)
      .run();

    if (updateResult.success) {
      const updatedUser = await db
        .prepare('SELECT display_name FROM users WHERE id = ?')
        .bind(userId)
        .first();

      if (updatedUser.display_name === 'Updated Test User') {
        results.push('✅ User updated successfully');
      } else {
        results.push('❌ User update verification failed');
        allPassed = false;
      }
    } else {
      results.push('❌ Failed to update user');
      allPassed = false;
    }

    // Test 4: Create Session
    results.push('\n🧪 Test 4: CREATE SESSION');
    const sessionId = crypto.randomUUID();
    const expiresAt = timestamp + (7 * 24 * 60 * 60); // 7 days

    const sessionResult = await db
      .prepare(`
        INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at, created_at, last_activity_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sessionId,
        userId,
        '127.0.0.1',
        'Mozilla/5.0 Test',
        expiresAt,
        timestamp,
        timestamp
      )
      .run();

    if (sessionResult.success) {
      results.push('✅ Session created successfully');
    } else {
      results.push('❌ Failed to create session');
      allPassed = false;
    }

    // Test 5: Create Security Log
    results.push('\n🧪 Test 5: CREATE SECURITY LOG');
    const logId = crypto.randomUUID();

    const logResult = await db
      .prepare(`
        INSERT INTO security_logs (id, user_id, event_type, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        logId,
        userId,
        'login',
        '127.0.0.1',
        'Mozilla/5.0 Test',
        timestamp
      )
      .run();

    if (logResult.success) {
      results.push('✅ Security log created successfully');
    } else {
      results.push('❌ Failed to create security log');
      allPassed = false;
    }

    // Test 6: List Users
    results.push('\n🧪 Test 6: LIST USERS');
    const users = await db
      .prepare('SELECT id, email, display_name, role FROM users LIMIT 10')
      .all();

    if (users.results && users.results.length > 0) {
      results.push(`✅ Retrieved ${users.results.length} user(s)`);
      users.results.forEach((u, i) => {
        results.push(`   ${i + 1}. ${u.email} (${u.role})`);
      });
    } else {
      results.push('❌ Failed to list users');
      allPassed = false;
    }

    // Test 7: Count Records
    results.push('\n🧪 Test 7: COUNT RECORDS');
    const counts = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM users').first(),
      db.prepare('SELECT COUNT(*) as count FROM sessions').first(),
      db.prepare('SELECT COUNT(*) as count FROM security_logs').first(),
    ]);

    results.push(`✅ Database Statistics:`);
    results.push(`   Users: ${counts[0].count}`);
    results.push(`   Sessions: ${counts[1].count}`);
    results.push(`   Security Logs: ${counts[2].count}`);

    // Test 8: Delete Records (Cleanup)
    results.push('\n🧪 Test 8: CLEANUP (DELETE)');

    // Delete session (will cascade from user deletion, but testing explicitly)
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();

    // Delete security log
    await db.prepare('DELETE FROM security_logs WHERE id = ?').bind(logId).run();

    // Delete user (should cascade to related records)
    const deleteResult = await db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();

    if (deleteResult.success) {
      results.push('✅ Test records cleaned up successfully');
    } else {
      results.push('❌ Failed to cleanup test records');
      allPassed = false;
    }

    // Final Summary
    results.push('\n' + '='.repeat(50));
    if (allPassed) {
      results.push('✅ ALL TESTS PASSED!');
      results.push('Your D1 database is working correctly.');
    } else {
      results.push('❌ SOME TESTS FAILED');
      results.push('Please review the errors above.');
    }

  } catch (error) {
    results.push('\n❌ ERROR: ' + error.message);
    results.push('Stack: ' + error.stack);
    allPassed = false;
  }

  return new Response(results.join('\n'), {
    headers: { 'Content-Type': 'text/plain' },
    status: allPassed ? 200 : 500,
  });
}