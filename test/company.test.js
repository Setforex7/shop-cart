const cds = require('@sap/cds');
const path = require('path');

/**
 * COMPANY TESTS
 *
 * Why these tests:
 * - Companies are the top-level entity that products, carts, and orders all
 *   reference. If company reads fail, the entire app is unusable since the
 *   first action on any view is selecting a company.
 * - The seed data (3 companies with specific capitals and currencies) is the
 *   baseline for the app to function. We verify it loads correctly.
 * - Company is read-only for non-admin users via @restrict — we verify that
 *   the authorization boundary holds. Only the Settings admin view exposes
 *   company creation/editing, so these should be blocked for normal users.
 */

const { GET, POST, DELETE } = cds.test(path.resolve(__dirname, '..'));

const TECH_COMPANY_ID = '8d828172-9bb7-4afe-9957-2f1c060f5b26';
const AUTH_BOB = { auth: { username: 'bob' } };

describe('Company', () => {

    describe('Read', () => {
        test('returns all seed companies', async () => {
            const { data } = await GET('/shop/Company', AUTH_BOB);

            expect(data.value.length).toBeGreaterThanOrEqual(3);

            const names = data.value.map(c => c.name);
            expect(names).toContain('Tech Innovators Inc.');
            expect(names).toContain('Green Energy Corp.');
            expect(names).toContain('HealthCare Solutions Ltd.');
        });

        test('returns company with correct fields', async () => {
            const { data } = await GET(
                `/shop/Company(${TECH_COMPANY_ID})`,
                AUTH_BOB
            );

            expect(data.name).toBe('Tech Innovators Inc.');
            expect(data.capital).toBe(5000000);
            expect(data.currency_code).toBe('EUR');
            expect(data.description).toBe('Leading tech solutions provider');
        });
    });

    describe('Write restrictions', () => {
        test('non-admin cannot create a company', async () => {
            try {
                await POST('/shop/Company', {
                    name: 'Unauthorized Corp',
                    capital: 1000,
                    currency_code: 'EUR'
                }, AUTH_BOB);
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(403);
            }
        });

        test('non-admin cannot delete a company', async () => {
            try {
                await DELETE(
                    `/shop/Company(${TECH_COMPANY_ID})`,
                    AUTH_BOB
                );
                fail('Should have rejected');
            } catch (e) {
                expect(e.response.status).toBe(403);
            }
        });
    });
});
