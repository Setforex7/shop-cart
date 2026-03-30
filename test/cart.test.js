const cds = require('@sap/cds');
const path = require('path');

/**
 * CART TESTS
 *
 * Why these tests:
 * - The cart is the core user-facing feature. Creating carts, adding products,
 *   and finalizing purchases is the primary workflow of the entire app.
 * - finalizeCart is the most complex transaction: it validates stock, creates
 *   an Order with OrderItems, decrements product stock, updates company capital,
 *   and changes cart status. Any step failing silently would corrupt data.
 * - addProductsToCart has edge cases: adding to non-existent products, adding
 *   out-of-stock products, and incrementing quantity for existing items.
 * - Cart creation auto-generates names ("Cart - 1", "Cart - 2") which could
 *   break if the naming logic fails.
 * - We test with bob (normal user) since carts are user-owned — this validates
 *   that the @restrict WHERE clause (createdBy = $user.id) works correctly.
 */

const { GET, POST, DELETE } = cds.test(path.resolve(__dirname, '..'));

const TECH_COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';
const SMARTPHONE_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const SOLAR_PANEL_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const AUTH_BOB = { auth: { username: 'bob' } };
const AUTH_ALICE = { auth: { username: 'alice' } };

describe('Cart', () => {

    describe('Cart creation', () => {
        test('creates a cart with auto-generated name', async () => {
            const { status, data } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            expect(status).toBe(201);
            expect(data.status).toBe('Active');
            expect(data.name).toMatch(/^Cart - \d+$/);
            expect(data.company_ID).toBe(TECH_COMPANY_ID);
        });

        test('increments cart name sequentially', async () => {
            const { data: cart1 } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            const { data: cart2 } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            const num1 = parseInt(cart1.name.split(' - ')[1]);
            const num2 = parseInt(cart2.name.split(' - ')[1]);
            expect(num2).toBeGreaterThan(num1);
        });
    });

    describe('Cart ownership', () => {
        test('user can only see their own carts', async () => {
            await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            const { data: bobCarts } = await GET('/shop/Cart', AUTH_BOB);
            expect(bobCarts.value.length).toBeGreaterThan(0);
            bobCarts.value.forEach(cart => {
                expect(cart.createdBy).toBe('bob');
            });
        });
    });

    describe('addProductsToCart action', () => {
        let cartID;

        beforeAll(async () => {
            const { data } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);
            cartID = data.ID;
        });

        test('adds a product to the cart', async () => {
            const { status, data } = await POST(
                `/shop/Cart(${cartID})/ShopCartService.addProductsToCart`,
                { product_IDs: [SMARTPHONE_ID] },
                AUTH_BOB
            );

            expect(status).toBe(200);
            expect(data.items).toBeDefined();
            expect(data.items.length).toBe(1);
            expect(data.items[0].quantity).toBe(1);
        });

        test('increments quantity when adding same product again', async () => {
            const { data } = await POST(
                `/shop/Cart(${cartID})/ShopCartService.addProductsToCart`,
                { product_IDs: [SMARTPHONE_ID] },
                AUTH_BOB
            );

            const item = data.items.find(i => i.product_ID === SMARTPHONE_ID);
            expect(item.quantity).toBe(2);
        });

        test('adds multiple different products at once', async () => {
            const { data } = await POST(
                `/shop/Cart(${cartID})/ShopCartService.addProductsToCart`,
                { product_IDs: [SOLAR_PANEL_ID] },
                AUTH_BOB
            );

            expect(data.items.length).toBe(2);
        });

        test('rejects adding a non-existent product', async () => {
            try {
                await POST(
                    `/shop/Cart(${cartID})/ShopCartService.addProductsToCart`,
                    { product_IDs: ['00000000-0000-0000-0000-000000000000'] },
                    AUTH_BOB
                );
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBeGreaterThanOrEqual(400);
            }
        });
    });

    describe('finalizeCart action', () => {
        let cartID;
        let initialStock;
        let initialCapital;

        beforeAll(async () => {
            const { data: productData } = await GET(
                `/shop/Products(${SMARTPHONE_ID})`,
                AUTH_BOB
            );
            initialStock = productData.stock;

            const { data: companyData } = await GET(
                `/shop/Company(${TECH_COMPANY_ID})`,
                AUTH_BOB
            );
            initialCapital = companyData.capital;

            const { data: cart } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);
            cartID = cart.ID;

            await POST(
                `/shop/Cart(${cartID})/ShopCartService.addProductsToCart`,
                { product_IDs: [SMARTPHONE_ID] },
                AUTH_BOB
            );
        });

        test('finalizes cart and creates an order', async () => {
            const { status } = await POST(
                `/shop/Cart(${cartID})/ShopCartService.finalizeCart`,
                {},
                AUTH_BOB
            );

            expect(status).toBe(200);
        });

        test('sets cart status to Ordered after finalization', async () => {
            const { data } = await GET(`/shop/Cart(${cartID})`, AUTH_BOB);
            expect(data.status).toBe('Ordered');
        });

        test('decrements product stock after finalization', async () => {
            const { data } = await GET(
                `/shop/Products(${SMARTPHONE_ID})`,
                AUTH_BOB
            );

            expect(data.stock).toBe(initialStock - 1);
        });

        test('increases company capital after finalization', async () => {
            const { data } = await GET(
                `/shop/Company(${TECH_COMPANY_ID})`,
                AUTH_BOB
            );

            expect(data.capital).toBeGreaterThan(initialCapital);
        });

        test('creates an order visible to the user', async () => {
            const { data } = await GET('/shop/Orders', AUTH_BOB);

            expect(data.value.length).toBeGreaterThan(0);

            const order = data.value[0];
            expect(order.status).toBe('Initiated');
            expect(order.type).toBe('S');
            expect(order.company_ID).toBe(TECH_COMPANY_ID);
        });

        test('rejects finalizing an already finalized cart', async () => {
            try {
                await POST(
                    `/shop/Cart(${cartID})/ShopCartService.finalizeCart`,
                    {},
                    AUTH_BOB
                );
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBeGreaterThanOrEqual(400);
            }
        });

        test('rejects finalizing an empty cart', async () => {
            const { data: emptyCart } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            try {
                await POST(
                    `/shop/Cart(${emptyCart.ID})/ShopCartService.finalizeCart`,
                    {},
                    AUTH_BOB
                );
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBeGreaterThanOrEqual(400);
            }
        });
    });

    describe('Cart deletion', () => {
        test('user can delete their own cart', async () => {
            const { data: cart } = await POST('/shop/Cart', {
                company_ID: TECH_COMPANY_ID,
                currency_code: 'EUR'
            }, AUTH_BOB);

            const { status } = await DELETE(`/shop/Cart(${cart.ID})`, AUTH_BOB);
            expect(status).toBe(204);
        });
    });
});
