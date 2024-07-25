const request = require('supertest');
const app = require('./service');
const { Role, DB } = require('./database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'a', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  const addRes = await DB.addUser(user);
  user = { ...user, id: addRes.id, password: 'a' };

  const registerRes = await request(app).put('/api/auth').send(user);
  return [user, registerRes.body.token];
}

async function createDinerUser() {
  let user = { password: 'a' };
  user.name = randomName();
  user.email = user.name + '@diner.com';
  const registerRes = await request(app).post('/api/auth').send(user);
  user = { ...registerRes.body.user, password: 'a' };

  return [user, registerRes.body.token];
}

module.exports = { randomName, createAdminUser, createDinerUser };
