sap.ui.define([
    "sap/ui/core/format/NumberFormat" 
], function(NumberFormat) {
    "use strict";

    return {

        stockStateFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return 'None';

            iCurrentStock = parseInt(iCurrentStock);
            iMinStock = parseInt(iMinStock);

            const iWarningStockPercentage = iMinStock * 0.20;
            const iWarningStock = iMinStock + iWarningStockPercentage;

            if (iCurrentStock < iMinStock) return 'Error'; 
            else if (iCurrentStock <= iWarningStock) return 'Warning'; 
            else return 'Success';
        },

        stockIconFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return '';
            
            iCurrentStock = parseInt(iCurrentStock);
            iMinStock = parseInt(iMinStock);

            const iWarningStockPercentage = iMinStock * 0.20;
            const iWarningStock = iMinStock + iWarningStockPercentage;

            if (iCurrentStock < iMinStock) return 'sap-icon://error'; 
            else if (iCurrentStock <= iWarningStock) return 'sap-icon://alert'; 
            else return 'sap-icon://sys-enter-2';
        },

        stockIconColorFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return 'Default';

            iCurrentStock = parseInt(iCurrentStock);
            iMinStock = parseInt(iMinStock);

            const iWarningStockPercentage = iMinStock * 0.20;
            const iWarningStock = iMinStock + iWarningStockPercentage;

            if (iCurrentStock < iMinStock) return 'Negative'; 
            else if (iCurrentStock <= iWarningStock) return 'Critical'; 
            else return 'Positive';
        },

        toNumber: function(sNumber){ return parseInt(sNumber); }
    };
});