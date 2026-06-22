/**
 * @namespace cap_try_ts.formatters
 */
export default {

    stockStateFormatter(iCurrentStock: string | number, iMinStock: string | number): string {
        if (isNaN(iCurrentStock as number) || isNaN(iMinStock as number)) return 'None';

        iCurrentStock = parseInt(iCurrentStock as string);
        iMinStock = parseInt(iMinStock as string);

        const iWarningStockPercentage = iMinStock * 0.20;
        const iWarningStock = iMinStock + iWarningStockPercentage;

        if (iCurrentStock < iMinStock) return 'Error';
        else if (iCurrentStock <= iWarningStock) return 'Warning';
        else return 'Success';
    },

    stockIconFormatter(iCurrentStock: string | number, iMinStock: string | number): string {
        if (isNaN(iCurrentStock as number) || isNaN(iMinStock as number)) return '';

        iCurrentStock = parseInt(iCurrentStock as string);
        iMinStock = parseInt(iMinStock as string);

        const iWarningStockPercentage = iMinStock * 0.20;
        const iWarningStock = iMinStock + iWarningStockPercentage;

        if (iCurrentStock < iMinStock) return 'sap-icon://error';
        else if (iCurrentStock <= iWarningStock) return 'sap-icon://alert';
        else return 'sap-icon://sys-enter-2';
    },

    stockIconColorFormatter(iCurrentStock: string | number, iMinStock: string | number): string {
        if (isNaN(iCurrentStock as number) || isNaN(iMinStock as number)) return 'Default';

        iCurrentStock = parseInt(iCurrentStock as string);
        iMinStock = parseInt(iMinStock as string);

        const iWarningStockPercentage = iMinStock * 0.20;
        const iWarningStock = iMinStock + iWarningStockPercentage;

        if (iCurrentStock < iMinStock) return 'Negative';
        else if (iCurrentStock <= iWarningStock) return 'Critical';
        else return 'Positive';
    },

    toNumber(sNumber: string | number): number { return parseInt(sNumber as string); }
};
