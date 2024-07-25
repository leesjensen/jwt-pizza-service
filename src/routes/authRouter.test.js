const request = require('supertest');
const app = require('../service');
const TestHelper = require('../testHelper.js');

let testUser;

beforeAll(async () => {
  [testUser] = await TestHelper.createDinerUser();
});

test('register', async () => {
  const registerRes = await request(app).post('/api/auth').send({ name: 'new', email: 'new@test.com', password: 'a' });
  expect(registerRes.status).toBe(200);

  expect(registerRes.body.user).toMatchObject({ email: 'new@test.com', name: 'new', roles: [{ role: 'diner' }] });
});

test('register bad params', async () => {
  let registerRes = await request(app).post('/api/auth').send({ email: 'a@test.com', password: 'a' });
  expect(registerRes.status).toBe(400);

  registerRes = await request(app).post('/api/auth').send({ name: 'b', password: 'a' });
  expect(registerRes.status).toBe(400);

  registerRes = await request(app).post('/api/auth').send({ name: 'c', email: 'c@test.com' });
  expect(registerRes.status).toBe(400);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const user = { ...testUser, roles: [{ role: 'diner' }] };
  delete user.password;
  expect(loginRes.body.user).toMatchObject(user);
});

test('logout', async () => {
  const registerRes = await request(app).post('/api/auth').send({ name: 'new', email: 'new@test.com', password: 'a' });
  const authToken = registerRes.body.token;

  const logoutRes = await request(app).delete('/api/auth/').set('Authorization', `Bearer ${authToken}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body).toMatchObject({ message: 'logout successful' });
});

test('change user', async () => {
  let [user, userAuthToken] = await TestHelper.createDinerUser();

  const body = { email: user.email, password: 'b' };

  const updateRes = await request(app).put(`/api/auth/${user.id}`).set('Authorization', `Bearer ${userAuthToken}`).send(body);
  expect(updateRes.status).toBe(200);
  const loginRes = await request(app).put('/api/auth').send(body);
  expect(loginRes.status).toBe(200);
});

test('auth bad token', async () => {
  const badCookie = ['token=garbage; Path=/; HttpOnly; Secure; SameSite=Strict'];
  const getOrdersRes = await request(app).get('/api/order/').set('Cookie', badCookie);
  expect(getOrdersRes.status).toBe(401);
});

test('auth no token', async () => {
  const getOrdersRes = await request(app).get('/api/order/');
  expect(getOrdersRes.status).toBe(401);
});
