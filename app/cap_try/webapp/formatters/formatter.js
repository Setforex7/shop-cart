sap.ui.define([
    "sap/ui/core/format/NumberFormat" 
], function(NumberFormat) {
    "use strict";

    return {

        priceCurrencyFormatter: function (fValue, sCurrencyCode) {
            if (fValue === null || fValue === undefined || !sCurrencyCode) return "";

            const oCurrencyFormat = NumberFormat.getCurrencyInstance({
                currencyCode: sCurrencyCode,
                showMeasure: true          
            });

            return oCurrencyFormat.format(fValue);
        },
    };
});