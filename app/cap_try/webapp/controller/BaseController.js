sap.ui.define([
    "sap/ui/core/mvc/Controller", // Controller
    'sap/ui/core/IconPool',       // IconPool
    'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment', // Fragment
    'sap/ui/core/Icon',
    'sap/m/Link',
    'sap/m/MessageItem',
    'sap/m/MessageView',
    'sap/m/Button',
    'sap/m/Bar',
    'sap/m/Title',
    'sap/m/Popover',
    "sap/m/MessageBox",
    "sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], (
    Controller,
	IconPool,
	JSONModel,
	Fragment,
	Icon,
	Link,
	MessageItem,
	MessageView,
	Button,
	Bar,
	Title,
	Popover,
	MessageBox,
	MessageToast,
	Filter,
	FilterOperator    
) => {
	"use strict";


	const sUserId = "1";
    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";

	return Controller.extend("cap_try.controller.BaseController", {
		onInit: function() {
			this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
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
			const oGlobalModel = this.getOwnerComponent().getModel('globalModel');
			const oView = this.getView();

			//? Gets the products from the entity
			this.getOwnerComponent().getModel().bindList("/Products").requestContexts()
			.then(aProducts => { 

				//? Creates a the array with the products object
				const aProductsFinal = aProducts.map(oProduct => {
					const oProductObject = oProduct.getObject();
					Object.assign(oProductObject, { quantity: 0, 
													status: this._setProductsStockStatus(oProduct.getObject()),
													metadata: oProduct });
					return oProductObject
				});

				oGlobalModel.setProperty("/products", aProductsFinal );
            	oGlobalModel.refresh(true);
				oView.setBusy(false);
			})
			.catch(oError => { 
				console.error(oError);
				oView.setBusy(false);
			});
		},

		_deleteProduct: async function(oProduct){
			try{
				await oProduct.metadata.delete();
				MessageToast.show(this._i18n.getText("delete_product_success", [oProduct.name]));
				this._getProducts();
			}catch(oError){
				this.getView().setBusy(false);
				return MessageBox.error(this._i18n.getText("delete_product_error", [oProduct.name]));
			}
		},

		_setProductsStockStatus: function(oProduct){
			const { stock_min, stock_max } = oProduct;

			if (stock_max > (stock_min * 1.5)) return "Success";
            else if (stock_max > (stock_min * 1.25)) return "Warning";
            else return "Error";
		},

		//? Returns the last ID of the products entity
		_getProductsLastId: function(){
			let sLastId = "0";
			this.getOwnerComponent().getModel('globalModel').getProperty('/products')
			.forEach(oProduct => { if(parseInt(sLastId) < parseInt(oProduct.ID)) sLastId = oProduct.ID });
			return (parseInt(sLastId) + 1).toString();
		},

		_getEntitySet: async function(sPath, oContext, aSorters, aFilters, oParameters){
			const aEntity = await this.getOwnerComponent().getModel().bindList(sPath,
																			   oContext || undefined,
																			   aSorters || undefined,
																			   aFilters || undefined,
																			   oParameters || undefined).requestContexts();
			return aEntity;
		},

		_getEntity: async function(sEntity, sKey){
			return await this.getOwnerComponent().getModel().bindContext(sEntity + `('${sKey}')`).requestObject();
		},

		_setEntityModel: async function(sEntity, sProperty, oContext, aSorters, aFilters, oParameters){
			const aEntity = await this._getEntitySet(sEntity);
			this.getOwnerComponent().getModel("globalModel").setProperty(sProperty,
			aEntity.map(oEntity => { return oEntity.getObject() }));
		},

		_setUserCartsName: function(){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

			let iNameCount = 1;
			oGlobalModel.setProperty("/carts",
			oGlobalModel.getProperty("/carts").map(oCart => { 
				oCart.name = `Cart - ${iNameCount++}`;
				return oCart; 
			}));

			oGlobalModel.refresh(true);
		},

		_createProduct: async function(oProduct){
			try{
				const oListBinding = this.getOwnerComponent().getModel().bindList("/Products");
				//? Sends the request to the backend
				const oCreatedContext = oListBinding.create(oProduct);
				//? Fully awaits for the backend response
				await oCreatedContext.created();
				this._addMessage({ type: "Success",
									title: "Success",
									subtitle: `Product ${oCreatedContext.getObject().name} created successfully`});
				MessageBox.success(`Product ${oCreatedContext.getObject().name} created successfully`);
				this._getProducts();
			}catch(oError){
				this._addMessage({ type: "Error",
									title: "Error",
									subtitle: `Something went wrong creating the product ${oProduct.name}`});
				console.error(oError);
			}

			//? Prepares the call for the backend
			// const oCreatingContext = this.getOwnerComponent().getModel().bindContext("/createProduct(...)");
			//? We assing the parameters of the creation action
			// oCreatingContext.setParameter("product", oProduct);

			// const sGetLastId = this.getOwnerComponent().getModel().bindContext("/getLastId(...)");
			// sGetLastId.setParameter("entityName", "Products");

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
		},

		_createCart: async function(sCompanyID){
            try{            
                const oCartList = this.getOwnerComponent().getModel().bindList(sEntityCart);
                const oNewCart = { user_id: sUserId,
                                   company: { ID: sCompanyID, "@odata.bind": `${sEntityCompany}(${sCompanyID})` }, 
                                   total_price: 0, 
                                   currency: "EUR" };

                const oCreatedCart = oCartList.create(oNewCart);
                await oCreatedCart.created();
                const oResult = oCreatedCart.getObject();

				this._getCarts();
				
				Fragment.byId(this.getView().getId(), "cartsSelect").setSelectedKey(oResult.ID);
				console.log(oResult);
				
				MessageToast.show(this._i18n.getText("create_cart_success"));
                this._addMessage.call(this, { type: "Success", title: this._i18n.getText("success"), subtitle: this._i18n.getText("create_cart_success") });
            
            } catch (oError) {
                console.error(oError);
				MessageToast.show(this._i18n.getText("create_cart_error"));
                this._addMessage.call(this, { type: "Error", title: this._i18n.getText("error"), subtitle: this._i18n.getText("create_cart_error") });
            }
        },

		_getCarts: function(){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

			this.getOwnerComponent().getModel().bindList(sEntityCart, undefined, undefined, [new Filter("user_id", FilterOperator.EQ, sUserId || "")])
			.requestContexts()
			.then(aCartsData => {
				const aCarts = aCartsData.map(oCart => {
					const aCurrentCart = oCart.getObject();
					aCurrentCart.metadata = oCart;
					return aCurrentCart;
				});
				console.log(aCarts);
				oGlobalModel.setProperty("/carts", aCarts);
				oGlobalModel.refresh(true);
				// this._setUserCartsName();
			});
		},

		_addProductsCart: function(aProducts){
			

			const oCartProductsBinding = this.getOwnerComponent().getModel().bindList(sEntityCart + `(ID='')`);
		},
	});
});