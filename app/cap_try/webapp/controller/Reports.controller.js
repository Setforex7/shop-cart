sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/formatters/formatter",
], function(
	BaseController,
	Formatter
) {
	"use strict";

	return BaseController.extend("cap_try.controller.Reports", {
        onInit: function() { 
            console.log("teste");      
            this.getView().setModel(this.getOwnerComponent().getModel());     
        }
	});
});