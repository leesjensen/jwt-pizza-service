const request = require('supertest');
const app = require('../service');
const TestHelper = require('../testHelper.js');
const franchiseRouter = require('./franchiseRouter.test.js');

let dinerAuthToken;
let admin;
let adminAuthToken;
let testFranchise;
let testStore;

beforeAll(async () => {
  [, dinerAuthToken] = await TestHelper.createDinerUser();
  [admin, adminAuthToken] = await TestHelper.createAdminUser();
  testFranchise = await franchiseRouter.createFranchise(admin, adminAuthToken);
  testStore = await franchiseRouter.createStore(testFranchise.id, adminAuthToken);
});

test('add menu item', async () => {
  const menuItem = { title: TestHelper.randomName(), description: 'test description', image: 'pizza1.png', price: 0.001 };
  const addMenuItemRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminAuthToken}`).send(menuItem);
  expect(addMenuItemRes.status).toBe(200);

  const menu = await getMenu();
  const newMenuItem = menu.find((item) => item.title === menuItem.title);
  expect(newMenuItem).toMatchObject(menuItem);
});

test('get orders', async () => {
  const getOrdersRes = await request(app).get('/api/order/').set('Authorization', `Bearer ${dinerAuthToken}`);
  expect(getOrdersRes.status).toBe(200);
});

test('create order', async () => {
  const menu = await getMenu();
  const orderItem = menu[0];
  const order = { franchiseId: testFranchise.id, storeId: testStore.id, items: [{ menuId: orderItem.id, ...orderItem }] };

  global.fetch = jest.fn((url) => {
    let response = {};
    switch (url) {
      case 'https://pizza-factory.cs329.click/api/order':
        response = { jwt: 'xxx' };
        break;
    }

    return Promise.resolve({
      status: 200,
      ok: true,
      json: () => {
        return Promise.resolve(response);
      },
    });
  });

  const createOrdersRes = await request(app).post('/api/order/').set('Authorization', `Bearer ${dinerAuthToken}`).send(order);
  expect(createOrdersRes.status).toBe(200);
  expect(createOrdersRes.body.order).toMatchObject(order);
  expect(createOrdersRes.body.jwt).toBeDefined();

  expect(fetch).toHaveBeenCalledWith(expect.any(String), {
    body: expect.any(String),
    headers: expect.objectContaining({
      'Content-Type': expect.any(String),
      authorization: expect.any(String),
    }),
    method: expect.stringMatching('POST'),
  });
});

async function getMenu() {
  const getMenuRes = await request(app).get('/api/order/menu');
  expect(getMenuRes.status).toBe(200);
  expect(getMenuRes.headers['content-type']).toMatch('application/json; charset=utf-8');

  return getMenuRes.body;
}
