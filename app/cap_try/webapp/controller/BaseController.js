/* global console */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], (Controller,
	MessageBox,
	MessageToast
) => {
	"use strict";

	return Controller.extend("captry.controller.BaseController", {
		onInit: function() {
		},

		//? Gets the products from the entity
		getProducts: function(){
			//? Gets the products from the entity
			const aProducts = this.getOwnerComponent().getModel().bindList("/Products").requestContexts()
			.then(aProducts => { 
				//? Creates a the array with the products object
				const aProductsFinal = aProducts.map(oProduct => { return oProduct.getObject() }) 
				//? Adds the quantity property to each products on the entity
				aProductsFinal.forEach(oProduct => oProduct.quantity = 0 );
				this.getOwnerComponent().getModel('globalModel').setProperty("/products", aProductsFinal );
            	this.getOwnerComponent().getModel('globalModel').refresh(true);
				this.getView().setBusy(false);
			});
		},

		createProduct: async function(oProduct){

			const oContext = this.getOwnerComponent().getModel().bindContext("/createProduct(...)");
		 	// Definir os parâmetros da ação
			 oContext.setParameter("product", oProduct);

			// Executar a chamada
			await oContext.execute().then(oData => {
				console.log("Produto criado com sucesso:", oData);
			}).catch(oError => {
				console.error("Erro ao criar produto:", oError);
			});
		}
	});
});