import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

/**
 * @namespace cap_try_ts.model
 */
export default {
    /**
     * Provides runtime information for the device the UI5 app is running on as a JSONModel.
     * @returns {sap.ui.model.json.JSONModel} The device model.
     */
    createDeviceModel(): JSONModel {
        const oModel = new JSONModel(Device);
        oModel.setDefaultBindingMode("OneWay");
        return oModel;
    }
};
