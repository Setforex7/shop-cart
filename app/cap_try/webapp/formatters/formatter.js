sap.ui.define([
    "sap/ui/core/format/NumberFormat" 
], function(NumberFormat) {
    "use strict";

    return {

        priceDecimalCasesFormatter: function(nValue) {
            const oNumberFormat = NumberFormat.getFloatInstance({ minFractionDigits: 2,
                                                                  maxFractionDigits: 2 });

            return oNumberFormat.format(nValue);
        }
    };
});