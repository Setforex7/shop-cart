const cds = require('@sap/cds');
const cron = require('node-cron');

const onCdsServer = async () => {
    if (process.env.NODE_ENV === 'test') return;

    const { Cart } = cds.entities;
    let isCartJobRunning = false;

    cron.schedule('* * * * *', async () => {
        if (isCartJobRunning) return;
        isCartJobRunning = true;

        try {
            const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
            const updatedCount = await UPDATE(Cart)
                  .set({ status: 'Abandoned' })
                  .where({
                      status: 'Active',
                      modifiedAt: { '<': oneMinuteAgo } });

            if (updatedCount > 0) {
                console.log(`Action: Successfully moved ${updatedCount} carts to Abandoned.`);
            }
        } catch (err) {
            console.error('Cron Job Error:', err);
        } finally {
            isCartJobRunning = false;
        }
    });
    await orderStatusJob();
}

const orderStatusJob = async () => {
    const { Orders } = cds.entities;
    let isOrderJobRunning = false;

    cron.schedule('*/2 * * * *', async () => {
        if (isOrderJobRunning) return;
        isOrderJobRunning = true;

        try {
            const now = new Date();
            const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
            const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();

            const shippingCount = await UPDATE(Orders)
                .set({ status: 'Shipping' })
                .where({
                    status: 'Initiated',
                    modifiedAt: { '<': twoMinutesAgo }
                });

            const deliveredCount = await UPDATE(Orders)
                .set({ status: 'Delivered' })
                .where({
                    status: 'Shipping',
                    modifiedAt: { '<': fiveMinutesAgo }
                });

            if (shippingCount > 0 || deliveredCount > 0) {
                console.log(`Logistics: ${shippingCount} orders shipped, ${deliveredCount} delivered.`);
            }

        } catch (err) {
            console.error('Logistics Job Error:', err);
        } finally {
            isOrderJobRunning = false;
        }
    });
}

module.exports = { onCdsServer };