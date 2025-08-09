sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/core/Fragment"
  ], (BaseObject,
	  Fragment) => {
	"use strict";
  
	return BaseObject.extend("cap_try.controller.DialogHandler", {
		_oController: undefined,
		constructor: function(oController) {
			this._oController = oController;
			this._dDialogCart = undefined;
			this._dDialogAddProduct = undefined;
		},
		
		_openAddProductDialog: function () {
            if (!this._dDialogAddProduct) {
                this._dDialogAddProduct = Fragment.load({ id: this._oController.getView().getId(),
                                                		  name: "cap_try.view.fragments.AddProduct",
                                                		  controller: this._oController })
                .then(function (oDialog) {
                    this._oController.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._dDialogAddProduct.then(oDialog => oDialog.open() );
        },

        _closeAddProductDialog: function () { 
			this._oController.byId("addProduct").close();
		},

        _openEditProductDialog: function () {
            if (!this._dDialogEditProduct) {
                this._dDialogEditProduct = Fragment.load({ id: this._oController.getView().getId(),
                                                 name: "cap_try.view.fragments.EditProduct",
                                                 controller: this._oController })
                .then(function (oDialog) {
                    this._oController.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            this._dDialogEditProduct.then(oDialog => oDialog.open() );
        },

        _closeEditProductDialog: function () { 
            this._oController.byId("editProduct").close();
        },

		_openCartDialog: function () {
            if (!this._dDialogCart) {
                this._dDialogCart = Fragment.load({ id: this._oController.getView().getId(),
                                                    name: "cap_try.view.fragments.Cart",
                                                    controller: this._oController })
                .then(function (oDialog) {
                    this._oController.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }   

            this._dDialogCart.then(oDialog => {
                const oGlobalModel = this._oController.getOwnerComponent().getModel("globalModel");
                const oSelectedCart = oGlobalModel.getProperty("/selectedCart");
                if(oSelectedCart?.ID) Fragment.byId(this._oController.getView().getId(), "cartsSelect").setSelectedKey(oSelectedCart.ID);
                else Fragment.byId(this._oController.getView().getId(), "cartsSelect").setSelectedKey("");
                oDialog.open();
            });
        },

        _closeCartDialog: function () { 
			this._oController.byId("Cart").close();
		},
	});
});