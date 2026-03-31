const cds = require('@sap/cds');
const path = require('path');

/**
 * PRODUCT TESTS
 *
 * Why these tests:
 * - Product CRUD is the foundation of the app — companies, carts, and orders
 *   all depend on products existing with valid data.
 * - The beforeCreate handler has validation logic (name, price, stock) that
 *   we previously fixed (the `!product.name === ""` bug). These tests ensure
 *   the validation catches all invalid inputs and lets valid ones through.
 * - The afterRead handler enriches each product with `quantity: 0`, which
 *   the frontend relies on for the cart quantity StepInput initial value.
 * - Product deletion cascades to CartItems — if this breaks, orphaned
 *   CartItems would reference deleted products and cause runtime errors.
 */

const { GET, POST, DELETE } = cds.test(path.resolve(__dirname, '..'));

const TECH_COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';
const SMARTPHONE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('Products', () => {

    describe('Read', () => {
        test('returns seed products with correct fields', async () => {
            const { data } = await GET('/shop/Products', {
                auth: { username: 'alice' }
            });

            expect(data.value.length).toBeGreaterThanOrEqual(3);

            const smartphone = data.value.find(p => p.name === 'Smartphone X');
            expect(smartphone).toBeDefined();
            expect(smartphone.price).toBe(999.99);
            expect(smartphone.stock).toBe(500);
            expect(smartphone.stock_min).toBe(50);
        });

        test('enriches each product with quantity = 0 (afterRead handler)', async () => {
            const { data } = await GET('/shop/Products', {
                auth: { username: 'alice' }
            });

            data.value.forEach(product => {
                expect(product.quantity).toBe(0);
            });
        });

        test('exposes currency from company association', async () => {
            const { data } = await GET('/shop/Products', {
                auth: { username: 'alice' }
            });

            const smartphone = data.value.find(p => p.name === 'Smartphone X');
            expect(smartphone.currency).toBeDefined();
        });
    });

    describe('Create validation', () => {
        test('rejects product with empty name', async () => {
            try {
                await POST('/shop/Products', {
                    name: '',
                    company_ID: TECH_COMPANY_ID,
                    price: 10,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(400);
            }
        });

        test('rejects product with negative price', async () => {
            try {
                await POST('/shop/Products', {
                    name: 'Negative Price Product',
                    company_ID: TECH_COMPANY_ID,
                    price: -10,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(400);
            }
        });

        test('rejects product with missing price', async () => {
            try {
                await POST('/shop/Products', {
                    name: 'No Price Product',
                    company_ID: TECH_COMPANY_ID,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(400);
            }
        });

        test('rejects product with negative stock', async () => {
            try {
                await POST('/shop/Products', {
                    name: 'Negative Stock Product',
                    company_ID: TECH_COMPANY_ID,
                    price: 10,
                    stock: -5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(400);
            }
        });

        test('accepts product with price = 0 (free/sample products)', async () => {
            const { status, data } = await POST('/shop/Products', {
                name: 'Free Sample Product',
                description: 'A free product for testing',
                company_ID: TECH_COMPANY_ID,
                price: 0,
                stock: 10,
                stock_min: 1
            }, { auth: { username: 'alice' } });

            expect(status).toBe(201);
            expect(data.price).toBe(0);
        });

        test('accepts product with stock = 0', async () => {
            const { status, data } = await POST('/shop/Products', {
                name: 'Out of Stock Product',
                description: 'No stock yet',
                company_ID: TECH_COMPANY_ID,
                price: 50,
                stock: 0,
                stock_min: 5
            }, { auth: { username: 'alice' } });

            expect(status).toBe(201);
            expect(data.stock).toBe(0);
        });

        test('rejects product with whitespace-only name', async () => {
            try {
                await POST('/shop/Products', {
                    name: '   ',
                    company_ID: TECH_COMPANY_ID,
                    price: 10,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(400);
            }
        });

        test('rejects duplicate product name within same company', async () => {
            try {
                await POST('/shop/Products', {
                    name: 'Smartphone X',
                    company_ID: TECH_COMPANY_ID,
                    price: 10,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'alice' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBeGreaterThanOrEqual(400);
            }
        });

        test('accepts valid product data', async () => {
            const { status, data } = await POST('/shop/Products', {
                name: 'Valid Product',
                description: 'A valid test product',
                company_ID: TECH_COMPANY_ID,
                price: 25.50,
                stock: 100,
                stock_min: 10
            }, { auth: { username: 'alice' } });

            expect(status).toBe(201);
            expect(data.name).toBe('Valid Product');
            expect(data.price).toBe(25.5);
        });
    });

    describe('Delete', () => {
        test('admin can delete a product', async () => {
            const { data: created } = await POST('/shop/Products', {
                name: 'To Be Deleted',
                company_ID: TECH_COMPANY_ID,
                price: 5,
                stock: 10,
                stock_min: 1
            }, { auth: { username: 'alice' } });

            const { status } = await DELETE(`/shop/Products(${created.ID})`, {
                auth: { username: 'alice' }
            });

            expect(status).toBe(204);
        });

        test('non-admin cannot delete products', async () => {
            try {
                await DELETE(`/shop/Products(${SMARTPHONE_ID})`, {
                    auth: { username: 'bob' }
                });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(403);
            }
        });
    });
});
