const request = require('supertest');
const app = require('../service');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

test('delete user', async () => {
  const testUser = { name: 'delete me', email: `${randomName()}@test.com`, password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(testUser);

  const userId = registerRes.body.user.id;
  const authToken = registerRes.body.token;

  const deleteRes = await request(app).delete(`/api/user/${userId}`).set('Authorization', `Bearer ${authToken}`);

  expect(deleteRes.status).toBe(200);
  expect(deleteRes.body).toMatchObject({ deleted: true });
});
