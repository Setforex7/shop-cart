const cds = require('@sap/cds');
const path = require('path');

/**
 * AUTH & USER INFO TESTS
 *
 * Why these tests:
 * - getUserInfo is called on every page load to determine the user's role
 *   and drive admin/user UI visibility. If it breaks, the entire role-based
 *   UI collapses (admin buttons vanish or appear for everyone).
 * - Authorization restrictions (@restrict annotations) are the security
 *   boundary of the app. We verify that unauthenticated requests are blocked
 *   and that role-based access is enforced by CAP at the service level.
 */

const { GET, POST, DELETE, axios } = cds.test(path.resolve(__dirname, '..'));

const COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';

describe('Authentication & User Info', () => {

    describe('getUserInfo function', () => {
        test('returns user id and roles for admin user', async () => {
            const { data } = await GET('/shop/getUserInfo()', {
                auth: { username: 'alice' }
            });

            expect(data.id).toBe('alice');
            expect(data.roles).toEqual(expect.arrayContaining(['admin']));
        });

        test('returns user id and roles for normal user', async () => {
            const { data } = await GET('/shop/getUserInfo()', {
                auth: { username: 'bob' }
            });

            expect(data.id).toBe('bob');
            expect(data.roles).toEqual(expect.arrayContaining(['User']));
        });

        test('rejects unauthenticated requests', async () => {
            try {
                await GET('/shop/getUserInfo()');
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(401);
            }
        });
    });

    describe('Role-based access control', () => {
        test('authenticated user can read companies', async () => {
            const { status } = await GET('/shop/Company', {
                auth: { username: 'bob' }
            });

            expect(status).toBe(200);
        });

        test('authenticated user can read products', async () => {
            const { status, data } = await GET('/shop/Products', {
                auth: { username: 'bob' }
            });

            expect(status).toBe(200);
            expect(data.value.length).toBeGreaterThan(0);
        });

        test('non-admin cannot create products', async () => {
            try {
                await POST('/shop/Products', {
                    name: 'Unauthorized Product',
                    company_ID: COMPANY_ID,
                    price: 10,
                    stock: 5,
                    stock_min: 1
                }, { auth: { username: 'bob' } });
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(403);
            }
        });

        test('admin can create products', async () => {
            const { status } = await POST('/shop/Products', {
                name: 'Admin Created Product',
                description: 'Test product',
                company_ID: COMPANY_ID,
                price: 50.00,
                stock: 100,
                stock_min: 10
            }, { auth: { username: 'alice' } });

            expect(status).toBe(201);
        });
    });
});
