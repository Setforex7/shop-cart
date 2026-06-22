import MessageBox from "sap/m/MessageBox";
import type Event from "sap/ui/base/Event";
import type BaseController from "cap_try_ts/controller/BaseController";

/**
 * @namespace cap_try_ts.service
 */
export default {
    read(oController: BaseController, oEvent: Event, fCallback: (data: unknown[]) => void): void {
        const oFile = ((oEvent.getParameter as (name: string) => unknown)("files") as File[])[0];
        if (!oFile) return;

        const reader = new FileReader();

        reader.onload = function (e: ProgressEvent<FileReader>) {
            const data = e.target!.result;
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
