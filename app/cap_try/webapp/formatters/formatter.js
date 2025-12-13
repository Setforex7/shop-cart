sap.ui.define([
    "sap/ui/core/format/NumberFormat" 
], function(NumberFormat) {
    "use strict";

    return {

        // priceCurrencyFormatter: function (fValue, sCurrencyCode) {
        //     if (fValue === null || fValue === undefined || !sCurrencyCode) return "";

        //     const oCurrencyFormat = NumberFormat.getCurrencyInstance({
        //         currencyCode: sCurrencyCode,
        //         showMeasure: true          
        //     });

        //     return oCurrencyFormat.format(fValue);
        // },

        stockStateFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return 'None';

            const iWarningStock = iMinStock * 0.20;

            if (iCurrentStock < iMinStock) return 'Error'; 
            else if (iCurrentStock <= iWarningStock) return 'Warning'; 
            else return 'Success';
            
        },

        stockIconFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return '';

            const iWarningStock = iMinStock * 0.20;

            if (iCurrentStock < iMinStock) return 'sap-icon://error'; 
            else if (iCurrentStock <= iWarningStock) return 'sap-icon://alert'; 
            else return 'sap-icon://sys-enter-2';
        },

        stockIconColorFormatter: function (iCurrentStock, iMinStock) {
            if (isNaN(iCurrentStock) || isNaN(iMinStock)) return 'None';

            const iWarningStock = iMinStock * 0.20;

            if (iCurrentStock < iMinStock) return 'Negative'; 
            else if (iCurrentStock <= iWarningStock) return 'Critical'; 
            else return 'Positive';
            
        },
    };
});