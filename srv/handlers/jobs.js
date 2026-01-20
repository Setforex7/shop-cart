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
    await orderStatusJob();
}

const orderStatusJob = async () => {
    const { Orders } = cds.entities;

    // Cron Job: Corre a cada 2 minutos (ajusta conforme necessário)
    cron.schedule('*/2 * * * *', async () => {
        const now = new Date();
        const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();

        try {
            const shippingCount = await UPDATE(Orders)
                .set({ status: 'S' })
                .where({ 
                    status: 'I', 
                    modifiedAt: { '<': twoMinutesAgo } 
                });

            const deliveredCount = await UPDATE(Orders)
                .set({ status: 'D' })
                .where({ 
                    status: 'S', 
                    modifiedAt: { '<': fiveMinutesAgo } 
                });

            if (shippingCount > 0 || deliveredCount > 0) {
                console.log(`Logística: ${shippingCount} encomendas enviadas, ${deliveredCount} entregues.`);
            }

        } catch (err) {
            console.error('Erro no Job de Logística:', err);
        }
    });
}

module.exports = { onCdsServer };