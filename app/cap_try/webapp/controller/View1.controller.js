sap.ui.define([
    "captry/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/m/Menu",
    "sap/m/MenuItem"
], (BaseController,
	Controller,
	Menu,
	MenuItem) => {
    "use strict";

    return BaseController.extend("captry.controller.View1", {
        onInit: function() {
            this._oView = this.getView();
            this._oView.setBusy(true);
            this.getProducts();
            // BaseController.prototype.onInit.call(this);
            this.getOwnerComponent().getModel().bindList("/Products").requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Produto: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList("/Company").requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Empresa: ", oContext.getObject()) );
            });
        },

        createProduct: async function(oProduct) {
            await BaseController.prototype.createProduct.apply(this, [{
                name: "Produto 7",
                description: "bom dia",
                price: "4.00",
                currency: "EU",
                stock_min: "50",
                stock_max: "100"
            }]);
        },
        /**
         * @override //? Example
         */
        // getProducts: function() {
        //     BaseController.prototype.getProducts.apply(this, arguments);
        //     console.log("View1 getProducts");
        // },

        menu: function (oEvent) {
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new sap.m.Menu({
                    items: [ new MenuItem({ text: "Início", icon: "sap-icon://home" }),
                             new MenuItem({ text: "History", icon: "sap-icon://product" }),
                             new MenuItem({ text: "Definições", icon: "sap-icon://action-settings" }) ] });
            
            this._oGlobalMenu.openBy(oEvent.getSource());
        },
    });
});