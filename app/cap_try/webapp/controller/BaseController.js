sap.ui.define([
    "sap/ui/core/mvc/Controller", // Controller
    'sap/ui/core/IconPool',       // IconPool
    'sap/ui/model/json/JSONModel',
    'sap/ui/core/Icon',
    'sap/m/Link',
    'sap/m/MessageItem',
    'sap/m/MessageView',
    'sap/m/Button',
    'sap/m/Bar',
    'sap/m/Title',
    'sap/m/Popover',
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (
    Controller,
    IconPool,          
    JSONModel,        
    Icon,               
    Link,
    MessageItem,
    MessageView,
    Button,
    Bar,
    Title,
    Popover,          
    MessageBox,      
    MessageToast    
) => {
	"use strict";

	return Controller.extend("cap_try.controller.BaseController", {
		onInit: function() {
			
		},

		_createMessageView: function(){
			this._aMessages = [];

			const oLink = new Link({ text: "Show more information",
									 href: "http://sap.com",
									 target: "_blank" });

			const oMessageTemplate = new MessageItem({ type: '{type}',
													   title: '{title}',
													   description: '{description}',
													   subtitle: '{subtitle}',
													   counter: '{counter}',
													   markupDescription: "{markupDescription}" });

			this._oMessageView = new MessageView({ showDetailsPageHeader: false,
												   itemSelect: function () {
												   	   oBackButton.setVisible(true);
												   },
												   items: { path: "/",
												   	   		template: oMessageTemplate }
				});

			this._oMessageView.setModel(this.getOwnerComponent().getModel("messageModel"));
			this._oMessageView.getModel().setData(this._aMessages);

			const oBackButton = new Button({ icon: IconPool.getIconURI("nav-back"),
											 visible: false,
											 press: function () {
												this._oMessageView.navigateBack();
												this._oPopover.focus();
											 	this.setVisible(false);
											 }.bind(this) });

			const oCloseButton =  new Button({ text: "Close",
											   press: function () {
											       this._oPopover.close()
											   }.bind(this)}).addStyleClass("sapUiTinyMarginEnd"),
											   oPopoverFooter = new Bar({ contentRight: oCloseButton}),
											   oPopoverBar = new Bar({ contentLeft: [oBackButton],
											   contentMiddle: [ new Title({text: "Messages"})]});
			this._oPopover = new Popover({ customHeader: oPopoverBar,
										   contentWidth: "440px",
										   contentHeight: "440px",
										   verticalScrolling: false,
										   modal: true,
										   content: [this._oMessageView],
										   footer: oPopoverFooter });
		},

		_deleteMessages: function(){
			this._aMessages = [];
			this._oMessageView.getModel().setData(this._aMessages);
			this._oMessageView.getModel().refresh(true);
		},

		_addMessage: function(oMessage){
			this._aMessages.push(oMessage);
			this._oMessageView.getModel().setData(this._aMessages);
			this._oMessageView.getModel().refresh(true);
		},

		_handlePopoverPress: function (oEvent) {
			this._oMessageView.navigateBack();
			this._oPopover.openBy(oEvent.getSource());
		},

		//? Gets the products from the entity
		_getProducts: function(){
			//? Gets the products from the entity
			this.getOwnerComponent().getModel().bindList("/Products").requestContexts()
			.then(aProducts => { 
				//? Creates a the array with the products object
				const aProductsFinal = aProducts.map(oProduct => { return oProduct.getObject() }) 
				//? Adds the quantity property to each products on the entity
				aProductsFinal.forEach(oProduct => oProduct.quantity = 0 );
				this.getOwnerComponent().getModel('globalModel').setProperty("/products", aProductsFinal );
            	this.getOwnerComponent().getModel('globalModel').refresh(true);
				this.getView().setBusy(false);
			})
			.catch(oError => { console.error(oError) });
		},

		//? Returns the last ID of the products entity
		_getProductsLastId: function(){
			let sLastId = "0";
			this.getOwnerComponent().getModel('globalModel').getProperty('/products')
			.forEach(oProduct => { if(parseInt(sLastId) < parseInt(oProduct.ID)) sLastId = oProduct.ID });
			return (parseInt(sLastId) + 1).toString();
		},

		_createProduct: async function(oProduct){
			return new Promise(async (resolve, reject) => {
				//? Prepares the call for the backend
				// const oCreatingContext = this.getOwnerComponent().getModel().bindContext("/createProduct(...)");
				//? We assing the parameters of the creation action
				// oCreatingContext.setParameter("product", oProduct);

				// const sGetLastId = this.getOwnerComponent().getModel().bindContext("/getLastId(...)");
				// sGetLastId.setParameter("entityName", "Products");

				try{
					const oListBinding = this.getOwnerComponent().getModel().bindList("/Products");
					//? Sends the request to the backend
					const oCreatedContext = oListBinding.create(oProduct);
					//? Fully awaits for the backend response
					await oCreatedContext.created();
					//? Gets the data returned to the backend
					const oCreatedData = oCreatedContext.getObject();
					this._addMessage({ type: "Success",
									   title: "Success",
									   subtitle: `Product ${oCreatedContext.getObject().name} created successfully`});
					MessageBox.success(`Product ${oCreatedContext.getObject().name} created successfully`);
					this._getProducts();
					resolve(true);
					this._o
				}catch(oError){
					this._addMessage({ type: "Error",
									   title: "Error",
									   subtitle: `Something went wrong creating the product ${oProduct.name}`});
					console.error(oError);
					reject(oError);
				}

				// try {
				// 	//? Executes the backend request
				//     await oCreatingContext.execute();
				// 	//? Gets the return object from the action
				// 	const oReturnedResponse = oCreatingContext.getBoundContext().getObject();
				// 	console.log(oReturnedResponse);
				// 	// const oData = await oReturnedResponse.requestObject();
				// 	console.log("Produto criado com sucesso:", oReturnedResponse);
				// } catch (oError) {
				//     console.error(oError);
				// 	console.log(oError);
				// }
			});
		}
	});
});