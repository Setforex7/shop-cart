sap.ui.define([
    "sap/ui/core/mvc/Controller", 
	"cap_try/controller/DialogHandler",
    'sap/ui/core/IconPool',      
    'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment', 
    'sap/ui/core/Icon',
    'sap/m/Link',
	"sap/m/Menu",
    "sap/m/MenuItem",
    'sap/m/MessageItem',
    'sap/m/MessageView',
    'sap/m/Button',
    'sap/m/Bar',
    'sap/m/Title',
    'sap/m/Popover',
    "sap/m/MessageBox",
    "sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter"
], (
    Controller,
	DialogHandler,
	IconPool,
	JSONModel,
	Fragment,
	Icon,
	Link,
	Menu,
	MenuItem,
	MessageItem,
	MessageView,
	Button,
	Bar,
	Title,
	Popover,
	MessageBox,
	MessageToast,
	Filter,
	FilterOperator   ,
	Sorter 
) => {
	"use strict";


	const sUserId = "1";
    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";

	return Controller.extend("cap_try.controller.BaseController", {
		onInit: function() {
			//? Global declarations for all of the controllers
			this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._oDialogHandler = new DialogHandler(this);

			this._createMessageView();
		},

		initializeMenu: function(oEvent){
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new Menu({ items: [ new MenuItem({ text: "Start", icon: "sap-icon://home" }),
                                                        new MenuItem({ text: "Reports", icon: "sap-icon://product" }),
                                                        new MenuItem({ text: "Settings", icon: "sap-icon://action-settings" }) ],
                                               itemSelected: function(oEvent){ 
                                                   const sSelectedAction = oEvent.getParameter("item").getText() || "";

                                                   switch(sSelectedAction){
                                                    case "Start": this._oRouter.navTo("View1");
                                                                  break;
                                                    case "Reports": this._oRouter.navTo("Reports")
                                                                    break;
                                                    case "Settings": MessageToast.show("Feature still under maintance!");
                                                                     break;
                                                   }
                                            }.bind(this) });
            
            this._oGlobalMenu.openBy(oEvent.getSource());
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

		_getEntityContexts: async function(sEntity, sKey){
			return await this.getOwnerComponent().getModel().bindContext(sEntity + `('${sKey}')`).requestObject();
		},

		_getEntitySetContexts: async function(sPath, oContext, aSorters, aFilters, oParameters){
			const aEntity = await this.getOwnerComponent().getModel().bindList(sPath,
																			oContext || undefined,
																			aSorters || undefined,
																			aFilters || undefined,
																			oParameters || undefined).requestContexts();
			return aEntity;
		},

		//? Gets the products from the entity
		_getProducts: function() {
			const oGlobalModel = this.getOwnerComponent().getModel('globalModel');
			const oView = this.getView();
			const { ID } = oGlobalModel.getProperty("/selectedCompany");

			this.getView().bindElement({ path: "/Company('" + ID + "')" });

			oView.setBusy(false);
		},

		_deleteProduct: async function(aProducts){
			if(!aProducts) return;

			try{
				if(!Array.isArray(aProducts)){
					await aProducts.delete();
					MessageToast.show(this._i18n.getText("delete_product_success", [name]));
				}
				else
					aProducts.forEach(async oProduct => { await oProduct.delete();
														  MessageToast.show(this._i18n.getText("delete_product_success", [oProduct.name])); });
				this._getProducts();
				
			}catch(oError){
				this.getView().setBusy(false);
				return MessageBox.error(this._i18n.getText("delete_product_error", [aProducts.name]));
			}
		},

	// 	_setProductsStockStatus: function(oProduct){
	// 		const { stock_min, stock_max } = oProduct;

	// 		if (stock_max > (stock_min * 1.5)) return "Success";
    //         else if (stock_max > (stock_min * 1.25)) return "Warning";
    //         else return "Error";
	// 	},

	// 	_setEntityModel: async function(sEntity, sProperty, oContext, aSorters, aFilters, oParameters){
	// 		const aEntity = await this._getEntitySetContexts(sEntity);
	// 		this.getOwnerComponent().getModel("globalModel").setProperty(sProperty,
	// 		aEntity.map(oEntity => { return oEntity.getObject() }));
	// 	},

	// 	_setUserCartsName: function(){
	// 		const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

	// 		let iNameCount = 1;
	// 		oGlobalModel.setProperty("/carts",
	// 		oGlobalModel.getProperty("/carts").map(oCart => { 
	// 			oCart.name = `Cart - ${iNameCount++}`;
	// 			return oCart; 
	// 		}));

	// 		oGlobalModel.refresh(true);
	// 	},

		_createProduct: async function(oProduct){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
			
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
				oGlobalModel.setProperty("/product", {});
				this._oDialogHandler._closeAddProductDialog();
				this._getProducts();
			}catch(oError){
				this._addMessage({ type: "Error",
									title: "Error",
									subtitle: `Something went wrong creating the product ${oProduct.name}`});
				console.error(oError);
			}
		},

		_editProduct: function(oProduct){
			const { metadata, name, description, price, stock, stock_min } = oProduct;

			const oNewProductData = { name,
									  description,
									  price,
									  stock,
									  stock_min };


			for (const [sKey, sValue] of Object.entries(oNewProductData)) 
				metadata.setProperty(sKey, sValue);

			this._addMessage({ type: "Success", 
							   title: this._i18n.getText("success"), 
							   subtitle: this._i18n.getText("edit_product_success", [name]) });
		},

		_createCart: async function(sCompanyID){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            try{            
                const oCartList = this.getOwnerComponent().getModel().bindList(sEntityCart);
                const oNewCart = { company_ID: sCompanyID };

                const oCreatedCart = oCartList.create(oNewCart);
                await oCreatedCart.created();
                const oResult = oCreatedCart.getObject();

				await this._getCarts();
				
				Object.assign(oResult, { metadata: oCreatedCart });
				oGlobalModel.setProperty("/selectedCart", oResult);
				Fragment.byId(this.getView().getId(), "cartsSelect")?.setSelectedKey(oResult.ID);

				MessageToast.show(this._i18n.getText("create_cart_success"));
                this._addMessage.call(this, { type: "Success", title: this._i18n.getText("success"), subtitle: this._i18n.getText("create_cart_success") });
            
            } catch (oError) {
                console.error(oError);
				MessageToast.show(this._i18n.getText("create_cart_error"));
                this._addMessage.call(this, { type: "Error", title: this._i18n.getText("error"), subtitle: this._i18n.getText("create_cart_error") });
            }
        },

	// 	_deleteCart: async function(oCart){
	// 		const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
	// 		const oView = this.getView();
	// 		const { name, metadata } = oCart;

	// 		try{
	// 			await metadata.delete();
	// 			MessageToast.show(this._i18n.getText("delete_current_cart_success", [name]));
	// 			// oGlobalModel.setProperty("/selectedCart", {});
	// 			oGlobalModel.refresh(true);
	// 			this._getCarts();
	// 			oView.setBusy(false);
	// 		}catch(oError){
	// 			oView.setBusy(false);
	// 			return MessageBox.error(this._i18n.getText("delete_current_cart_error"));
	// 		}

	// 	},

		_getCart: async function(){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
			const { ID } = oGlobalModel.getProperty("/selectedCart");

			// this.getOwnerComponent().getModel().bindContext(sEntityCart + `(ID='${ID}',user_id='${sUserId}')`, undefined, undefined, undefined)
			// .requestObject()
			// .then(oCart => {
			// 	const { total_price } = oCart;
			// 	oGlobalModel.setProperty("/selectedCart/total_price", total_price);
			// 	oGlobalModel.refresh(true);
			// 	this._getCartProducts();
			// });

			const oCurrentCart = await this.getOwnerComponent().getModel().bindContext(sEntityCart + `(ID='${ID}')`, undefined, undefined, undefined).requestObject();
			const { total_price } = oCurrentCart;
			oGlobalModel.setProperty("/selectedCart/total_price", total_price);
			oGlobalModel.refresh(true);
			await this._getCartProducts();
		},

		_getCarts: async function(){
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

			const aCartsData = await this.getOwnerComponent().getModel().bindList(sEntityCart, undefined, [ new Sorter("createdAt", false) ], [ /* new Filter("user_id", FilterOperator.EQ, sUserId || ""), */
																	  						  				new Filter("company/ID", FilterOperator.EQ, oGlobalModel.getProperty("/selectedCompany/ID") || "") ])
			.requestContexts();
			
				if(aCartsData.length === 0){ oGlobalModel.setProperty("/cart", []);
											 oGlobalModel.setProperty("/carts", []);	
											 oGlobalModel.setProperty("/selectedCart", {}); 
											 return oGlobalModel.refresh(true); }

				const aCarts = aCartsData.map(oCart => { const aCurrentCart = oCart.getObject();
														 	   aCurrentCart.metadata = oCart;
														 	   return aCurrentCart });
				const aCartsSorted = aCarts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
				console.log("Carts sorted:", aCartsSorted);
				oGlobalModel.setProperty("/carts", aCartsSorted);
				if(!oGlobalModel.getProperty("/selectedCart/ID")) oGlobalModel.setProperty("/selectedCart", aCartsSorted[0] || {});
				oGlobalModel.refresh(true);
				await this._getCartProducts();
			
		},

	// 	_getCartProducts: async function(){
	// 		const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
	// 		const oView = this.getView();	
	// 		const { ID } = oGlobalModel.getProperty("/selectedCart");

	// 		const aCartProductsData = await this.getOwnerComponent().getModel().bindList(sEntityCart + `(ID='${ID}')/products`, undefined, undefined, undefined, { $expand: "product" })
	// 		.requestContexts();

	// 		// this.getOwnerComponent().getModel().bindList(sEntityCart + `(ID='${ID}',user_id='${sUserId}')/products`, undefined, undefined, undefined, { $expand: "product" })
	// 		// .requestContexts()
	// 		// .then(aCartProductsData => {
	// 			if(aCartProductsData.length === 0) { Fragment.byId(oView.getId(), "cartsSelect")?.setSelectedKey(ID);;
	// 												 oGlobalModel.setProperty("/cart", []); 
	// 												 oGlobalModel.refresh(true);
	// 												 return oView.setBusy(false); }	

	// 			const aCartProducts = aCartProductsData.map(oProduct => { 
	// 				const { ID, cart_ID, cart_user_id, product_ID, quantity, price, product } = oProduct.getObject();
	// 				const oCartProduct = { ID, cart_ID, cart_user_id, product_ID, quantity, price, name: product?.name, description: product?.description };
	// 				oCartProduct.metadata = oProduct;
	// 				oCartProduct.total_price = quantity * price;
	// 				return oCartProduct;
	// 			});

	// 			oGlobalModel.setProperty("/cart", aCartProducts);
	// 			oGlobalModel.refresh(true);
	// 			oView.setBusy(false);
	// 		// });
	// 	},

	// 	_finalizeCart: async function(oCart){
	// 		const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

	// 		//? Prepares the call for the backend
	// 		const oFinalizeCartAction = this.getOwnerComponent().getModel().bindContext("/finalizeProcess(...)");
	// 		//? We assign the parameters of the creation action
	// 		oFinalizeCartAction.setParameter("cart", oCart);

	// 		try {
	// 			//? Executes the backend request
	// 		    await oFinalizeCartAction.execute();
	// 			//? Gets the return object from the action
	// 			const oReturnedResponse = oFinalizeCartAction.getBoundContext();
	// 			console.log(oReturnedResponse?.getObject());

	// 			oGlobalModel.setProperty("/selectedCart", oReturnedResponse.getObject());
	// 			console.log(oReturnedResponse);
	// 			MessageToast.show(this._i18n.getText("add_products_cart_success"));
				
	// 			// this._getCartProducts();
	// 			// this._getProducts();
	// 			this.getView().setBusy(false);
	// 		} catch (oError) {
	// 		    console.error(oError);
	// 			console.log(oError);
	// 		}
	// 	},

		_addProductsCart: async function(aProducts){
			const oDataModel = this.getOwnerComponent().getModel();
			const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
			const { ID } = oGlobalModel.getProperty("/selectedCart");

			// const sGetLastId = this.getOwnerComponent().getModel().bindContext("/getLastId(...)");
			// sGetLastId.setParameter("entityName", "Products");

			try {
				//? Prepares the call for the backend
				const oAddManyToCartAction = oDataModel.bindContext(`/Cart(${ID})/addProductToCart(...)`);
				//? We assing the parameters of the creation action
				oAddManyToCartAction.setParameter("product_IDs", aProducts);

				//? Executes the backend request
				await oAddManyToCartAction.execute();
				//? Gets the return object from the action
				const oReturnedResponse = oAddManyToCartAction.getBoundContext();
				console.log(oReturnedResponse.getObject());

				// oGlobalModel.setProperty("/selectedCart", oReturnedResponse.getObject());
				MessageToast.show(this._i18n.getText("add_products_cart_success"));
				
				this._getCartProducts();
				this._getProducts();
			} catch (oError) {
			    console.error(oError);
				console.log(oError);
			}
		},
	});
});