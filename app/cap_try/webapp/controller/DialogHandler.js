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
            this._oCompaniesFragment = undefined;
            this._oCartsFragment = undefined;
			this._dDialogCart = undefined;
			this._dDialogAddProduct = undefined;
            this._dDialogEditProduct = undefined;
		},

        _openCompaniesFragment: function () {
            const oView = this._oController.getView();
            const oMainContainer = oView.byId("mainContainer");

            if (!this._oCompaniesFragment) {
                this._oCompaniesFragment = Fragment.load({
                    id: oView.getId(),
                    name: "cap_try.view.fragments.Companies",
                    controller: this._oController
                }).then(function (oFragment) {
                    oView.addDependent(oFragment);
                    oMainContainer.addPage(oFragment);
                    oMainContainer.to(oFragment); 
                    return oFragment;
                }.bind(this));
            } else this._oCompaniesFragment.then(oFragment => oMainContainer.to(oFragment));
        },

        _openCartsFragment: function () {
            const oView = this._oController.getView();
            const oMainContainer = oView.byId("mainContainer");

            if (!this._oCartsFragment) {
                this._oCartsFragment = Fragment.load({
                    id: oView.getId(),
                    name: "cap_try.view.fragments.Carts",
                    controller: this._oController
                }).then(function (oFragment) {
                    oView.addDependent(oFragment);
                    oMainContainer.addPage(oFragment);
                    oMainContainer.to(oFragment); 
                    return oFragment;
                }.bind(this));
            } else this._oCartsFragment.then(oFragment => oMainContainer.to(oFragment));
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
			this._oController.byId("AddProduct").close();
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
                this._dDialogCart.setModel(this._oController.getModel("globalModel"), "globalModel");
                this._dDialogCart.setModel(this._oController.getModel("i18n"), "i18n");
                this._dDialogCart.setModel(this._oController.getOwnerComponent().getModel());
            }   

            const oDialog =  await this._dDialogCart;

            oDialog.open();
            this._oController._bindCartDataToFragment();
        },

        _closeCartDialog: function () { 
			this._oController.byId("Cart").close();
		},
	});
});