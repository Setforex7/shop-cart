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
	FilterOperator,
	Sorter 
) => {
	"use strict";

	const sUserId = "1";
    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";
	const sFunctionGetUserInfoPath = "/getUserInfo(...)";

	return Controller.extend("cap_try.controller.BaseController", {
		_onControllerLoad: async function() {
			//? Global declarations for all of the controllers
			this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			this._oDialogHandler = new DialogHandler(this);
			this._oRouter = this.getOwnerComponent().getRouter();
			
			this.getView().setModel(this.getModel());

			this._createMessageView();
			await this._getUserInfo();
		},

		_onObjectMatched: function(){
			this.setProp("globalModel", "/selectedCompany", {});
            this.setProp("globalModel", "/selectedCart", {});
            this.getModel("globalModel").refresh(true);
		},

		_getUserInfo: async function(){
			const oView = this.getView();
			oView.setBusy(true);
			try{

                const oUserContext = this.getModel().bindContext(sFunctionGetUserInfoPath);
                await oUserContext.execute();
                const oUserInfo = oUserContext.getBoundContext();
                const { id, roles } = oUserInfo.getObject();
                this.setProp("globalModel", "/userInfo", { id, roles});
                this.getModel("globalModel").refresh(true);
                console.log(this.getProp("globalModel", "/userInfo"));

            }catch(oError){ console.error(oError); }
            finally{ oView.setBusy(false); }
		},

		getRouter: function(){
			return this._oRouter;
		},

		getDialogHandler: function(){
			return this._oDialogHandler;
		},

		getI18n: function(){
			return this._i18n;
		},

		getI18nText: function(sValue, aParameters){
			return this.getI18n().getText(sValue, aParameters);
		},

		getModel: function(alias){
			return this.getOwnerComponent().getModel(alias);
		},

		setProp: function(sAlias, sProperty, uValue){
			this.getOwnerComponent().getModel(sAlias).setProperty(sProperty, uValue);
		},

		getProp: function(sAlias, sProperty){
			return this.getOwnerComponent().getModel(sAlias).getProperty(sProperty);
		},

		initializeMenu: function(oEvent){
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new Menu({ items: [ new MenuItem({ text: "Start", 
																	   icon: "sap-icon://home", }),
                                                        new MenuItem({ text: "Reports", icon: "sap-icon://product" }),
                                                        new MenuItem({ text: "Settings", 
																	   icon: "sap-icon://action-settings",
																	   visible: this.getProp("globalModel", "/userInfo/roles").includes("admin") }) ],
                                               itemSelected: function(oEvent){ 
                                                   const sSelectedAction = oEvent.getParameter("item").getText() || "";

                                                   switch(sSelectedAction){
                                                    case "Start": this.getRouter().navTo("Shop");
                                                                  break;
                                                    case "Reports": this.getRouter().navTo("Reports");
                                                                    break;
                                                    case "Settings": this.getRouter().navTo("Settings");
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

		toggleMessageView: function (oEvent) {
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
			const oView = this.getView();
			const { ID } = this.getProp("globalModel", "/selectedCompany");

			oView.bindElement({ path: "/Company('" + ID + "')" });

			oView.setBusy(false);
		},

		_deleteProduct: async function(aProducts){
			if(!aProducts) return;

			try{
				if(!Array.isArray(aProducts)){
					await aProducts.delete();
					MessageToast.show(this.getI18nText("delete_product_success", [name]));
				}
				else
					aProducts.forEach(async oProduct => { await oProduct.delete();
														  MessageToast.show(this.getI18nText("delete_product_success", [oProduct.name])); });
				this._getProducts();
				
			}catch(oError){
				this.getView().setBusy(false);
				return MessageBox.error(this.getI18nText("delete_product_error", [aProducts.name]));
			}
		},	

		_createCompany: async function(oCompany){
			console.log("CREATING COMPANY: ", oCompany);
			try{
				const oCompanyList = this.getModel().bindList(sEntityCompany);

				const oNewCompany = oCompanyList.create(oCompany);
				await oNewCompany.created();

				console.log("Sucesouuuuu: ", oNewCompany, oNewCompany.getObject());
			}catch(oError) { console.error(oError); }
		},

		_createProduct: async function(oProduct){
			try{
				const oProductsList = this.getModel().bindList(sEntityProducts);
				//? Sends the request to the backend
				const oCreatedContext = oProductsList.create(oProduct);
				//? Fully awaits for the backend response
				await oCreatedContext.created();
				const { name } = oCreatedContext.getObject();
				this._addMessage({ type: "Success",
									title: "Success",
									subtitle: `Product ${name} created successfully`});
				MessageBox.success(`Product ${name} created successfully`);
				this.setProp("globalModel", "/product", {});
				this.getDialogHandler()._closeAddProductDialog();
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
							   title: this.getI18nText("success"), 
							   subtitle: this.getI18nText("edit_product_success", [name]) });
		},

		_editCompany: function(oCompany){
			const { metadata, name, description, capital } = oCompany;

			const oNewCompanyData = { name,
									  description,
									  capital };

			for (const [sKey, sValue] of Object.entries(oNewCompanyData)) 
				metadata.setProperty(sKey, sValue);

			this._addMessage({ type: "Success", 
							   title: this.getI18nText("success"), 
							   subtitle: this.getI18nText("edit_company_success", [name]) });
		},

		_clearSelectedCompany: function(){
			this.setProp("globalModel", "/selectedCompany", {});
			this.getModel("globalModel").refresh(true);
		},

		//region Cart Methods

		_finalizeCart: async function(sCartID){
			const oDataModel = this.getOwnerComponent().getModel();
			
			try {
				//? Prepares the call for the backend
				const oFinalizeCartAction = oDataModel.bindContext(sEntityCart + `(${sCartID})/ShopCartService.finalizeCart(...)`);
				//? We assing the parameters of the creation action
				// oAddManyToCartAction.setParameter("product_IDs", aProducts);

				//? Executes the backend request
				await oFinalizeCartAction.execute();
				//? Gets the return object from the action
				const oReturnedResponse = oFinalizeCartAction.getBoundContext();

				console.log("new order: ", oReturnedResponse.getObject());
				this.setProp("globalModel", "/selectedCart", {});
				this.getModel("globalModel").refresh(true);
				
				this._assignCartOnCompanyLoad();
				this._bindCartDataToFragment();
					
				this._addMessage({ type: "Success", title: this.getI18nText("success"), subtitle: this.getI18nText("finalize_cart_success") });
				MessageBox.success(this.getI18nText("finalize_cart_success"));
				}catch (oError) {
					console.error(oError);
				}
		},

		_createCart: async function(sCompanyID){
			const { currency_code } = this.getProp("globalModel", "/selectedCompany");

            try{            
                const oCartList = this.getOwnerComponent().getModel().bindList(sEntityCart);
                const oNewCart = { company_ID: sCompanyID,
								   currency_code: currency_code };

                const oCreateCart = oCartList.create(oNewCart);
                await oCreateCart.created();
				const oCreatedCart = oCreateCart;
				
				this.setProp("globalModel", "/selectedCart", oCreatedCart);
				this.getModel("globalModel").refresh(true);

				this._bindCartDataToFragment();

				MessageToast.show(this.getI18nText("create_cart_success"));
                this._addMessage({ type: "Success", title: this.getI18nText("success"), subtitle: this.getI18nText("create_cart_success") });
            
            } catch (oError) {
                console.error(oError);
				MessageToast.show(this.getI18nText("create_cart_error"));
                this._addMessage({ type: "Error", title: this.getI18nText("error"), subtitle: this.getI18nText("create_cart_error") });
            }
        },

		_deleteCart: async function(oCart){		
			const { name } = oCart.getObject();	

			try{
				await oCart.delete();
				MessageToast.show(this.getI18nText("delete_current_cart_success", [name]));
				this.setProp("globalModel", "/selectedCart", {});
				this.getModel("globalModel").refresh(true);

				await this._assignCartOnCompanyLoad();
				this._bindCartDataToFragment();
			}catch(oError){
				return MessageBox.error(this.getI18nText("delete_current_cart_error"));
			}
		},

		_assignCartOnCompanyLoad: async function(){
            const aCarts = await this._getEntitySetContexts(sEntityCart, 
                                                            undefined, 
                                                            new Sorter("createdAt", false), 
                                                            [ new Filter("company_ID", FilterOperator.EQ, this.getProp("globalModel", "/selectedCompany/ID")),
															  new Filter("status", FilterOperator.EQ, "Active") ], 
                                                            { '$expand': 'items' });

            if(!aCarts || !aCarts.length) return;

            const [ oCart ] = aCarts;
            const { items } = oCart.getObject();

            this.setProp("globalModel", "/selectedCart", oCart);
            this.setProp("globalModel", "/cartItemsQuantity", items.length);
            this.getModel("globalModel").refresh(true);
        },

		_bindCartDataToFragment: async function(){
			const oSelectedCart = this.getProp("globalModel", "/selectedCart");
			const oCartTable = Fragment.byId(this.getView().getId(), "cartTable");
			const oCartTableFooter = Fragment.byId(this.getView().getId(), "cartTableFooter");
			const oCartSelect = Fragment.byId(this.getView().getId(), "cartsSelect");
			const oCartSelectBinding = oCartSelect.getBinding("items");

			if(!Object.keys(oSelectedCart).length){
				oCartSelectBinding.filter([ new Filter("company_ID", FilterOperator.EQ, this.getProp("globalModel", "/selectedCompany/ID")),
											new Filter("status", FilterOperator.EQ, "Active")]);
				oCartSelectBinding.refresh();
				this.setProp("globalModel", "/cartItemsQuantity", 0);
				this.getModel("globalModel").refresh(true);
				oCartSelect.setSelectedKey("");
				oCartTableFooter.unbindElement();
				return oCartTable.unbindRows();
			} 

			const { ID } = oSelectedCart.getObject();
			const sCartPath = oSelectedCart.getPath();

			oCartSelectBinding.filter([ new Filter("company_ID", FilterOperator.EQ, this.getProp("globalModel", "/selectedCompany/ID")),
									    new Filter("status", FilterOperator.EQ, "Active")]);
			oCartSelectBinding.refresh();

			//? Bind the products of the selected cart to the table
			oCartSelect.setSelectedKey(ID);
			oCartTable.bindRows({ path: sCartPath + "/items",
								  events: { dataReceived: function(oEvent) {
												const aItems = oEvent.getSource().getContexts();
												this.setProp("globalModel", "/cartItemsQuantity", aItems.length);	
												this.getModel("globalModel").refresh(true);
												oCartTable.setBusy(false); }.bind(this) } });
			oCartTableFooter.bindElement({ path: sCartPath });
		},

		_addProductsCart: async function(aProducts){
			const oDataModel = this.getOwnerComponent().getModel();
			const { ID } = this.getProp("globalModel", "/selectedCart").getObject();
			
			try {
				//? Prepares the call for the backend
				const oAddManyToCartAction = oDataModel.bindContext(sEntityCart + `(${ID})/ShopCartService.addProductsToCart(...)`);
				//? We assing the parameters of the creation action
				oAddManyToCartAction.setParameter("product_IDs", aProducts);

				//? Executes the backend request
				await oAddManyToCartAction.execute();
				//? Gets the return object from the action
				const oReturnedResponse = oAddManyToCartAction.getBoundContext();

				const { items } = oReturnedResponse.getObject();

				this.setProp("globalModel", "/cartItemsQuantity", items.length);
				this.getModel("globalModel").refresh(true);

				MessageToast.show(this.getI18nText("add_products_cart_success"));
			} catch (oError) {
			    console.error(oError);
			}
		},

		_deleteCartItem: async function(aCartItems){
			if(!aCartItems) return;

			try{
				if(!Array.isArray(aCartItems)){
					await aCartItems.delete();
					MessageToast.show(this.getI18nText("delete_product_success", [name]));
				}
				else
					aCartItems.forEach(async oItem => { const { name } = oItem;
														await oItem.delete();
														MessageToast.show(this.getI18nText("delete_product_success", [name])); });
				this._bindCartDataToFragment();
				
			}catch(oError){
				const { name } = aCartItems;
				this.getView().setBusy(false);
				return MessageBox.error(this.getI18nText("delete_product_error", [name]));
			}
		},

		//#endregion
	});
});