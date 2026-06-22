import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import models from "cap_try_ts/model/models";

/**
 * @namespace cap_try_ts
 */
export default class Component extends UIComponent {

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    public init(): void {
        // call the base component's init function
        super.init();

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        const oGlobalModel = new JSONModel({ product: {},
                                             selectedCompany: {},
                                             selectedProduct: {},
                                             selectedCart: {},
                                             cartItemsQuantity: 0,
                                             userInfo: {} });
        this.setModel(oGlobalModel, "globalModel");
        this.setModel(new JSONModel(), "messageModel");

        // this.getModel().setRefreshAfterChange(true);

        // enable routing
        this.getRouter().initialize();
    }
}
