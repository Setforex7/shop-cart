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
  
	return BaseObject.extend("cap_try.controller.ValueHelp", {
		_oController: undefined,
		constructor: function(oController) {
			this._oController = oController;
			this._dDialogCart = undefined;
			this._dDialogAddProduct = undefined;
            this._dDialogEditProduct = undefined;
		},
		
		
	});
});