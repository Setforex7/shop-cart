sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
  ], (BaseObject,
	  Fragment,
      Filter,
      FilterOperator) => {
	"use strict";
  
	return BaseObject.extend("cap_try.controller.DialogHandler", {
		_oController: undefined,
		constructor: function(oController) {
			this._oController = oController;
			this._dDialogCart = undefined;
			this._dDialogAddProduct = undefined;
            this._dDialogEditProduct = undefined;
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

            this._dDialogEditProduct.then(oDialog => { 
                oDialog.open(); 
            });
        },

        _closeEditProductDialog: function () { 
            this._oController.byId("editProduct").close();
        },

		_openCartDialog: async function () {
            if (!this._dDialogCart) {
                this._dDialogCart = await Fragment.load({ id: this._oController.getView().getId(),
                                                          name: "cap_try.view.fragments.Cart",
                                                          controller: this._oController });
                this._dDialogCart.setModel(this._oController.getOwnerComponent().getModel());
            }   

            const oDialog =  await this._dDialogCart;

            oDialog.open();
            this._oController._setCartOnLoad();
        },

        _closeCartDialog: function () { 
			this._oController.byId("Cart").close();
		},
	});
});