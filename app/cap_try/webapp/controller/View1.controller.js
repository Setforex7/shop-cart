sap.ui.define([
    "cap_try/controller/BaseController",
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/Menu",
    "sap/m/MenuItem",
	"sap/ui/model/Binding"
], (BaseController,
	Controller,
	Fragment,
	Menu,
	MenuItem,
	Binding) => {
    "use strict";

    return BaseController.extend("cap_try.controller.View1", {
        onInit: function() {
            BaseController.prototype._createMessageView.call(this);
            this._oView = this.getView();
            this._oView.setBusy(true);
            this._getProducts();
            // BaseController.prototype.onInit.call(this);
            this.getOwnerComponent().getModel().bindList("/Products").requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Produto: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList("/Company").requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Empresa: ", oContext.getObject()) );
            });
        },

        openAddProductDialog: function () {
            if (!this._dDialog) {
                this._dDialog = Fragment.load({ id: this.getView().getId(),
                                                name: "cap_try.view.fragments.AddProduct",
                                                controller: this })
                .then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._dDialog.then(oDialog => oDialog.open() );
        },

        closeAddProductDialog: function () { this.byId("addProductDialog").close() },

        handlePopoverPress: function (oEvent) {
            BaseController.prototype._handlePopoverPress.call(this, oEvent);
        },

        createProduct: async function(oProduct) {
            await BaseController.prototype.createProduct.apply(this, [{ name: this.getOwnerComponent().getModel('globalModel').getProperty("/product/name"),
                                                                        description: this.getOwnerComponent().getModel('globalModel').getProperty("/product/description"),
                                                                        price: this.getOwnerComponent().getModel('globalModel').getProperty("/product/price"),
                                                                        currency: "EUR",
                                                                        stock_min: this.getOwnerComponent().getModel('globalModel').getProperty("/product/stock_min"),
                                                                        stock_max: this.getOwnerComponent().getModel('globalModel').getProperty("/product/stock_max") }]);
        },

        menu: function (oEvent) {
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new sap.m.Menu({ items: [ new MenuItem({ text: "Início", icon: "sap-icon://home" }),
                                                              new MenuItem({ text: "History", icon: "sap-icon://product" }),
                                                              new MenuItem({ text: "Definições", icon: "sap-icon://action-settings" }) ] });
            
            this._oGlobalMenu.openBy(oEvent.getSource());
        },
    });
});