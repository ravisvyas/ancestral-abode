import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { closePool } from '../src/config/db.js';

const app = createApp();

test('API Health, Catalogue and Enquiries Integration Tests', async (t) => {
  t.after(async () => {
    await closePool();
  });

  await t.test('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.equal(res.body.data.database, 'up');
  });

  await t.test('GET /api/rooms returns a list of rooms', async () => {
    const res = await request(app).get('/api/rooms');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.rooms));
    assert.ok(res.body.data.rooms.length > 0);
    assert.ok(res.body.data.rooms[0].name);
    assert.ok(res.body.data.rooms[0].slug);
  });

  await t.test('GET /api/experiences returns experiences list', async () => {
    const res = await request(app).get('/api/experiences');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.experiences));
  });

  await t.test('GET /api/sights returns sights list', async () => {
    const res = await request(app).get('/api/sights');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.sights));
  });

  await t.test('GET /api/reviews returns guest reviews', async () => {
    const res = await request(app).get('/api/reviews');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.reviews));
  });

  await t.test('GET /api/availability returns rooms matrix for dates', async () => {
    const checkIn = '2026-11-10';
    const checkOut = '2026-11-15';
    const res = await request(app).get(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=2`);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.rooms));
    assert.ok(res.body.data.rooms.length > 0);
  });

  await t.test('POST /api/newsletter accepts valid subscription', async () => {
    const randomEmail = `guest_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: randomEmail });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  await t.test('POST /api/newsletter rejects invalid email with 422', async () => {
    const res = await request(app)
      .post('/api/newsletter')
      .send({ email: 'not-an-email' });
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
  });
});
