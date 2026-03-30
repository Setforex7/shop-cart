const cds = require('@sap/cds');
const path = require('path');

/**
 * ORDER & PURCHASE HISTORY TESTS
 *
 * Why these tests:
 * - Orders are the final output of the cart finalization flow. They are
 *   read-only projections — we verify that the data written by finalizeCart
 *   is correctly exposed through the Orders and OrderItems entities.
 * - Order ownership is critical: users should only see their own orders,
 *   while admins can see all. This is enforced by @restrict annotations.
 * - OrderItems store the price_at_create snapshot, which must match the
 *   product price at the time of purchase (not the current price). This is
 *   important for financial accuracy.
 * - PurchaseHistory is a CDS view that aggregates order data — we verify
 *   the view resolves correctly and respects user ownership.
 */

const { GET, POST } = cds.test(path.resolve(__dirname, '..'));

const TECH_COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';
const SMARTPHONE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const AUTH_BOB = { auth: { username: 'bob' } };

describe('Orders & Purchase History', () => {

    beforeAll(async () => {
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

    describe('Orders', () => {
        test('user can read their own orders', async () => {
            const { data } = await GET('/shop/Orders', AUTH_BOB);

            expect(data.value.length).toBeGreaterThan(0);
            data.value.forEach(order => {
                expect(order.createdBy).toBe('bob');
            });
        });

        test('order has correct structure', async () => {
            const { data } = await GET('/shop/Orders', AUTH_BOB);
            const order = data.value[0];

            expect(order.type).toBe('S');
            expect(order.status).toBe('Initiated');
            expect(order.total_price).toBeGreaterThan(0);
            expect(order.company_ID).toBe(TECH_COMPANY_ID);
        });

        test('order items are accessible via expand', async () => {
            const { data } = await GET(
                '/shop/Orders?$expand=items',
                AUTH_BOB
            );

            const order = data.value[0];
            expect(order.items).toBeDefined();
            expect(order.items.length).toBeGreaterThan(0);

            const item = order.items[0];
            expect(item.quantity).toBeGreaterThan(0);
            expect(item.price_at_create).toBeGreaterThan(0);
            expect(item.total_price).toBeGreaterThan(0);
        });
    });

    describe('OrderItems', () => {
        test('order items capture price at creation time', async () => {
            const { data: orders } = await GET(
                '/shop/Orders?$expand=items',
                AUTH_BOB
            );
            const item = orders.value[0].items[0];

            expect(item.price_at_create).toBe(999.99);
        });
    });

    describe('PurchaseHistory view', () => {
        test('user can read their own purchase history', async () => {
            const { status, data } = await GET(
                '/shop/PurchaseHistory',
                AUTH_BOB
            );

            expect(status).toBe(200);
            expect(data.value.length).toBeGreaterThan(0);
        });

        test('purchase history contains correct fields', async () => {
            const { data } = await GET(
                '/shop/PurchaseHistory',
                AUTH_BOB
            );

            const entry = data.value[0];
            expect(entry.product_name).toBeDefined();
            expect(entry.quantity).toBeDefined();
            expect(entry.unit_price).toBeDefined();
            expect(entry.total_price).toBeDefined();
            expect(entry.company_name).toBeDefined();
        });
    });
});
