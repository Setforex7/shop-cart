sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/UIComponent",
    "cap_try/model/models"
], (JSONModel, UIComponent, models) => {
    "use strict";

    return UIComponent.extend("cap_try.Component", {
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

            const oGlobalModel = new JSONModel({ product: { name: "", description: "", price: "0", stock_min: "0", stock_max: "500" },
                                                 selectedCompany: {},
                                                 cart: {},
                                                 selectedCart: [],
                                                 products: [],
                                                 Companys: [] });    
            this.setModel(oGlobalModel, "globalModel"); 
            this.setModel(new JSONModel(), "messageModel");    
            
            // this.getModel().setRefreshAfterChange(true);

            // enable routing
            this.getRouter().initialize();
        }
    });
});