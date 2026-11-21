import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closePool, query } from '../src/config/db.js';
import { initDatabaseExtensions } from '../src/services/dbInitService.js';

const app = createApp();

test('Admin Portal, Dynamic Pricing & Enquiry Flow Tests', async (t) => {
  await initDatabaseExtensions();

  let adminToken = '';

  t.after(async () => {
    // Reset test price back to default
    await query('UPDATE rooms SET base_price = 5000.00 WHERE id = 1');
    await closePool();
  });

  await t.test('POST /api/admin/auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('POST /api/admin/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'AncestralAbode@2026' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.username, 'admin');
    adminToken = res.body.data.token;
  });

  await t.test('GET /api/admin/dashboard requires authentication', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/admin/dashboard returns stats when authenticated', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.stats);
    assert.ok(Array.isArray(res.body.data.rooms));
  });

  await t.test('PATCH /api/admin/rooms/:id/price updates base price dynamically', async () => {
    // 1. Update price to 4850
    const patchRes = await request(app)
      .patch('/api/admin/rooms/1/price')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basePrice: 4850 });

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.success, true);
    assert.equal(patchRes.body.data.room.basePrice, 4850);

    // 2. Verify public GET /api/rooms reflects updated price immediately
    const roomsRes = await request(app).get('/api/rooms');
    assert.equal(roomsRes.status, 200);
    const room1 = roomsRes.body.data.rooms.find((r) => r.id === 1);
    assert.equal(room1.basePrice, 4850);

    // 3. Reset price back to 5000
    await request(app)
      .patch('/api/admin/rooms/1/price')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ basePrice: 5000 });
  });

  await t.test('POST /api/enquiries saves user enquiry and sends notification', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        name: 'Devika Sharma',
        email: 'devika@example.com',
        phone: '+91 9876543210',
        subject: 'Heritage Suite Query for Family Reunion',
        message: 'We are planning a visit to Jaipur in December and would love to reserve both rooms.',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.enquiry.id);
  });

  await t.test('GET /api/admin/enquiries lists all guest enquiries', async () => {
    const res = await request(app)
      .get('/api/admin/enquiries')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.enquiries));
    assert.ok(res.body.data.enquiries.length > 0);
  });
});
