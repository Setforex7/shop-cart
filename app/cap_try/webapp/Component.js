sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",
    "captry/model/models"
], (JSONModel, UIComponent, models) => {
    "use strict";

    return UIComponent.extend("captry.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            const oGlobalModel = new JSONModel({ cart: ["teste", "bomdia"],
                                                 products: [],
                                                 Companys: [] });    
            this.setModel(oGlobalModel, "globalModel");                

            // enable routing
            this.getRouter().initialize();
        }
    });
});