const cds = require('@sap/cds');
const path = require('path');

/**
 * ORDER TESTS
 *
 * Why these tests:
 * - Orders are created by finalizeCart and contain financial data (prices,
 *   quantities, company references). If the @restrict annotation breaks,
 *   users can see each other's purchase history — a privacy violation.
 * - The admin role should have unrestricted access to all orders for
 *   reporting and management purposes.
 * - Order structure must be correct: items, company_ID, total_price,
 *   status, and type are all required for the Reports view to work.
 */

const { GET, POST } = cds.test(path.resolve(__dirname, '..'));

const TECH_COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';
const SMARTPHONE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const AUTH_BOB = { auth: { username: 'bob' } };
const AUTH_ALICE = { auth: { username: 'alice' } };

describe('Orders', () => {
    beforeAll(async () => {
        // Create a cart, add a product, and finalize to generate an order
        const { data: cart } = await POST('/shop/Cart', {
            company_ID: TECH_COMPANY_ID,
            currency_code: 'EUR'
        }, AUTH_BOB);

        await POST(
            `/shop/Cart(${cart.ID})/ShopCartService.addProductsToCart`,
            { product_IDs: [SMARTPHONE_ID] },
            AUTH_BOB
        );

        await POST(
            `/shop/Cart(${cart.ID})/ShopCartService.finalizeCart`,
            {},
            AUTH_BOB
        );
    });

    describe('Order visibility', () => {
        test('user can only see their own orders', async () => {
            const { data } = await GET('/shop/Orders', AUTH_BOB);

            expect(data.value.length).toBeGreaterThan(0);
            data.value.forEach(order => {
                expect(order.createdBy).toBe('bob');
            });
        });

        test('admin can see all orders', async () => {
            const { data } = await GET('/shop/Orders', AUTH_ALICE);

            expect(data.value.length).toBeGreaterThan(0);
        });
    });

    describe('Order structure', () => {
        test('order has correct fields after finalization', async () => {
            const { data } = await GET('/shop/Orders?$expand=items', AUTH_BOB);

            const order = data.value[0];

            expect(order.ID).toBeDefined();
            expect(order.company_ID).toBe(TECH_COMPANY_ID);
            expect(order.total_price).toBeGreaterThan(0);
            expect(order.status).toBeDefined();
            expect(order.type).toBe('S');
            expect(order.items).toBeDefined();
            expect(order.items.length).toBeGreaterThan(0);
        });

        test('order items have price and quantity', async () => {
            const { data } = await GET('/shop/Orders?$expand=items', AUTH_BOB);

            const order = data.value[0];
            const item = order.items[0];

            expect(item.quantity).toBeGreaterThan(0);
            expect(item.price_at_create).toBeGreaterThan(0);
            expect(item.total_price).toBeGreaterThan(0);
        });
    });
});
