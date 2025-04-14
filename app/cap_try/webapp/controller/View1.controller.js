sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/controller/DialogHandler",
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/Menu",
    "sap/m/MenuItem",
	"sap/ui/model/Binding",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (BaseController,
    DialogHandler,
	Controller,
	Fragment,
	Menu,
	MenuItem,
	Binding,
	Filter,
    FilterOperator) => {
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

            this._oDialogHandler = new DialogHandler(this);
        },

        openAddProductDialog: function () { this._oDialogHandler._openAddProductDialog();},

        closeAddProductDialog: function () { this._oDialogHandler._closeAddProductDialog() },

        openCartDialog: function () { this._oDialogHandler._openCartDialog();},

        closeCartDialog: function () { this._oDialogHandler._closeCartDialog() },

        toggleMessageView: function (oEvent) {
            BaseController.prototype._handlePopoverPress.call(this, oEvent);
        },

        createProduct: async function() {
            const oResult = await BaseController.prototype._createProduct.apply(this, [{ ID: BaseController.prototype._getProductsLastId.call(this),
                                                                          name: this.getOwnerComponent().getModel('globalModel').getProperty("/product/name"),
                                                                          description: this.getOwnerComponent().getModel('globalModel').getProperty("/product/description"),
                                                                          price: this.getOwnerComponent().getModel('globalModel').getProperty("/product/price"),
                                                                          currency: "EUR",
                                                                          stock_min: this.getOwnerComponent().getModel('globalModel').getProperty("/product/stock_min"),
                                                                          stock_max: this.getOwnerComponent().getModel('globalModel').getProperty("/product/stock_max") }]);
            if(oResult) this.getView().byId("addProduct").close();
        },

        menu: function (oEvent) {
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new sap.m.Menu({ items: [ new MenuItem({ text: "Início", icon: "sap-icon://home" }),
                                                              new MenuItem({ text: "History", icon: "sap-icon://product" }),
                                                              new MenuItem({ text: "Definições", icon: "sap-icon://action-settings" }) ] });
            
            this._oGlobalMenu.openBy(oEvent.getSource());
        },

        companyChange: function(oEvent){
            this.getView().setBusy(true);
            
            this.getOwnerComponent().getModel()
            .bindList("/Company", undefined, undefined, [new Filter("name", FilterOperator.EQ, oEvent.getParameter("value"))])
            .requestContexts().then(([oCompany]) => {
                this.getOwnerComponent().getModel("globalModel").setProperty("/selectedCompany", oCompany.getObject());
                this.getOwnerComponent().getModel("globalModel").refresh(true);
                this.getView().setBusy(false);
            }).bind(this)
            .catch(function(oError) { 
                this.getView().setBusy(false);
                console.error("Erro ao buscar empresa:", oError) 
            });
        }
    });
});