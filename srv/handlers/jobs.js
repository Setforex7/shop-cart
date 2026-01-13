const cds = require('@sap/cds');
const cron = require('node-cron');

const onCdsServer = async () => {
    const { Cart } = cds.entities;

    cron.schedule('* * * * *', async () => {
        const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();

        try {
            const updatedCount = await UPDATE(Cart)
                  .set({ status: 'Abandoned' })
                  .where({ 
                      status: 'Active',
                      modifiedAt: { '<': oneMinuteAgo } });

            if (updatedCount > 0) {
                console.log(`Action: Successfully moved ${updatedCount} carts to Abandoned.`);
            } else {
                console.log(`Result: No inactive carts found.`);
            }
        } catch (err) {
            console.error('Cron Job Error:', err);
        }
    });
}

module.exports = { onCdsServer };