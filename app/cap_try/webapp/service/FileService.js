sap.ui.define([
    "sap/m/MessageBox"
], function(MessageBox) {
    "use strict";

    return {
        read: function(oController, oEvent, fCallback) {
            const oFile = oEvent.getParameter("files")[0];
            if (!oFile) return;

            const reader = new FileReader();

            reader.onload = function (e) {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });

                const sSheetName = workbook.SheetNames[0];
                const aData = XLSX.utils.sheet_to_json(workbook.Sheets[sSheetName]);

                fCallback(aData);
            };

            reader.onerror = function () {
                MessageBox.error(oController.getI18nText("file_read_error"));
            };

            reader.readAsBinaryString(oFile);
        }
    };
});
