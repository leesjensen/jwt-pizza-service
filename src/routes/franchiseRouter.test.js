const request = require('supertest');
const app = require('../service');
const TestHelper = require('../testHelper.js');

let admin;
let adminAuthToken;
let franchisee;
let franchiseeAuthToken;
let testFranchise;

beforeAll(async () => {
  [admin, adminAuthToken] = await TestHelper.createAdminUser();
  [franchisee, franchiseeAuthToken] = await TestHelper.createDinerUser();
  testFranchise = await createFranchise(franchisee, adminAuthToken);
});

test('get franchise', async () => {
  const getFranchiseRes = await request(app).get('/api/franchise');
  expect(getFranchiseRes.status).toBe(200);
  expect(getFranchiseRes.headers['content-type']).toMatch('application/json; charset=utf-8');

  const franchise = getFranchiseRes.body.find((item) => item.id === testFranchise.id);
  expect(franchise).toMatchObject(franchise);

  expect(getFranchiseRes.body.length).not.toBe(0);
  expect(franchise).toMatchObject(franchise);
});

test('create franchise', async () => {
  const franchise = await createFranchise(admin, adminAuthToken);
  expect(franchise.admins[0].id).toBe(admin.id);
});

test('get franchises for users', async () => {
  const franchises = await getFranchises(franchisee, franchiseeAuthToken);
  expect(franchises.length).toBe(1);
  expect(franchises[0]).toMatchObject(testFranchise);
});

test('create store', async () => {
  const store = await createStore(testFranchise.id, adminAuthToken);

  expect(store).toMatchObject(store);
});

test('delete store', async () => {
  const store = await createStore(testFranchise.id, adminAuthToken);
  const { status, body: deleteStoreRes } = await request(app).delete(`/api/franchise/${testFranchise.id}/store/${store.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(status).toBe(200);

  expect(deleteStoreRes.message).toMatch('store deleted');
  expect(await getStore(testFranchise.id, store.id, admin, adminAuthToken)).toBeUndefined();
});

test('delete franchise', async () => {
  const franchise = await createFranchise(admin, adminAuthToken);
  const store = await createStore(franchise.id, adminAuthToken);
  const { status, body: deleteFranchiseRes } = await request(app).delete(`/api/franchise/${franchise.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(status).toBe(200);

  expect(deleteFranchiseRes.message).toMatch('franchise deleted');
  expect(await getStore(franchise.id, store.id, admin, adminAuthToken)).toBeUndefined();
  expect(await getFranchise(franchise.id, admin, adminAuthToken)).toBeUndefined();
});

async function getFranchise(franchiseId, user, authToken) {
  const franchises = await getFranchises(user, authToken);
  if (franchises) {
    return franchises.find((f) => f.id === franchiseId);
  }
  return undefined;
}

async function getStore(franchiseId, storeId, user, authToken) {
  const franchise = await getFranchise(franchiseId, user, authToken);
  if (franchise) {
    const matchingStore = franchise.stores.find((s) => s.id === storeId);
    return matchingStore;
  }
  return undefined;
}

async function createFranchise(user, authToken) {
  const franchise = { name: TestHelper.randomName(), admins: [{ email: user.email }] };
  const getFranchiseRes = await request(app).post(`/api/franchise`).set('Authorization', `Bearer ${authToken}`).send(franchise);
  expect(getFranchiseRes.status).toBe(200);
  expect(getFranchiseRes.headers['content-type']).toMatch('application/json; charset=utf-8');

  return getFranchiseRes.body;
}

async function createStore(franchiseId, authToken) {
  const store = { name: TestHelper.randomName(), franchiseId: franchiseId };
  const createStoreRes = await request(app).post(`/api/franchise/${franchiseId}/store`).set('Authorization', `Bearer ${authToken}`).send(store);
  expect(createStoreRes.status).toBe(200);
  expect(createStoreRes.headers['content-type']).toMatch('application/json; charset=utf-8');

  return createStoreRes.body;
}

async function getFranchises(user, authToken) {
  const getFranchisesRes = await request(app).get(`/api/franchise/${user.id}`).set('Authorization', `Bearer ${authToken}`);
  expect(getFranchisesRes.status).toBe(200);
  expect(getFranchisesRes.headers['content-type']).toMatch('application/json; charset=utf-8');
  return getFranchisesRes.body;
}

module.exports = { getFranchise, getStore, createFranchise, createStore, getFranchises };
