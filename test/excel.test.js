const cds = require('@sap/cds');
const path = require('path');

/**
 * EXCEL TEMPLATE TESTS
 *
 * Why these tests:
 * - The downloadExcelTemplate function generates an .xlsx file that users
 *   fill in and re-upload for bulk product creation. If the template is
 *   malformed or the endpoint fails, the entire bulk-upload workflow breaks.
 * - We verify the endpoint returns a binary response with the correct
 *   content-type header, since the frontend downloads it via URL redirect
 *   (not a standard JSON API call).
 */

const { GET } = cds.test(path.resolve(__dirname, '..'));

describe('Excel Template', () => {
    test('downloadExcelTemplate returns a binary file', async () => {
        const { status, headers } = await GET(
            '/shop/downloadExcelTemplate()/$value',
            {
                auth: { username: 'alice' },
                responseType: 'arraybuffer'
            }
        );

        expect(status).toBe(200);
        expect(headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    test('downloadExcelTemplate returns non-empty content', async () => {
        const { data } = await GET(
            '/shop/downloadExcelTemplate()/$value',
            {
                auth: { username: 'alice' },
                responseType: 'arraybuffer'
            }
        );

        expect(data.byteLength).toBeGreaterThan(0);
    });
});
