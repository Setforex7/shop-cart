sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/controller/DialogHandler",
    "sap/ui/core/mvc/Controller",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
    "sap/m/Menu",
    "sap/m/MenuItem",
	"sap/ui/model/Binding",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (BaseController,
	DialogHandler,
	Controller,
    Formatter,
	Fragment,
	Menu,
	MenuItem,
	Binding,
	Filter,
	FilterOperator,
	MessageToast,
	MessageBox) => {
    "use strict";

    const sUserId = "1";
    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";

    return BaseController.extend("cap_try.controller.View1", {
        formatter: Formatter,
        onInit: function() {
            this._createMessageView();

            console.log(this.getOwnerComponent().getModel().getMetaModel());

            //? I18n object declaration
            this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            //? Base controller call
            this._getProducts();
            // BaseController.prototype.onInit.call(this);
            this.getOwnerComponent().getModel().bindList(sEntityProducts).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Produto: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCompany).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Empresa: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCart).requestContexts().then((aContexts) => {
                aContexts.forEach(oContext => console.log("Cart: ", oContext.getObject()) );
            })
            // console.log(this.getView().byId("productsWorklist").getRows());
            this._oDialogHandler = new DialogHandler(this);
        },

        onBeforeRendering: function() {
        },

        onAfterRendering: async function() {
        },

        onQuantityInputChange: function(oEvent) {
            const iQuantity = parseInt(oEvent.getParameter("value"));
            const { stock_min, stock_max } = oEvent.getSource().getBindingContext("globalModel").getObject();

            if(iQuantity > stock_max){
                oEvent.getSource().setValueState("Error");
                return oEvent.getSource().setValueStateText("Quantity exceeds the maximum stock limit.");
            }else if(iQuantity <= stock_max && iQuantity !== 0){
                oEvent.getSource().setValueState("Success");
            }else{
                oEvent.getSource().setValueState("None");
                oEvent.getSource().setValue("0");
            }
            oEvent.getSource().setValueStateText("");
        },

        onAddCartButtonPress: function(){ 
            const { ID } = this.getOwnerComponent().getModel("globalModel").getProperty("/selectedCompany");
            
            this._createCart(ID);
        },

        onEditProductPress: function(oEvent) {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oSelectedProduct = oEvent.getSource().getBindingContext("globalModel").getObject();
            
            oGlobalModel.setProperty("/selectedProduct", oSelectedProduct);
            oGlobalModel.refresh(true);

            this._oDialogHandler._openEditProductDialog();
        },

        onDeleteProductPress: async function(oEvent) {
            const oView = this.getView();
            const oCurrentProduct = oEvent.getSource().getBindingContext("globalModel").getObject();

            MessageBox.confirm(this._i18n.getText("delete_product", [oCurrentProduct.name]), {
                title: this._i18n.getText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                           await this._deleteProduct(oCurrentProduct); }}.bind(this)                                          
            });
        },

        onDeleteSelectedCartPress: async function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oSelectedCart = oGlobalModel.getProperty("/selectedCart");

            if (!oSelectedCart) return MessageToast.show(this._i18n.getText("delete_current_cart_selection_missing"));

            MessageBox.confirm(this._i18n.getText("delete_current_cart_message", [oSelectedCart.name]), {
                title: this._i18n.getText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        this.getView().setBusy(true);
                        await this._deleteCart(oSelectedCart);
                    }
                }.bind(this)
            });
        },

        addProductCart: async function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oTable = this.getView().byId("productsWorklist");
            const aSelectedProducts = oTable.getSelectedItems();
            const { ID } = oGlobalModel.getProperty("/selectedCompany");
            const aSelectedProductsContexts = aSelectedProducts.map(oProduct => { return { cart_user_id: sUserId,
                                                                                           product_ID: oProduct.getBindingContext("globalModel").getObject().ID,
                                                                                           quantity: oProduct.getBindingContext("globalModel").getObject().quantity }});

            if(!this._validateCompanySelection()) return;

            if(aSelectedProducts.length === 0) return MessageToast.show(this._i18n.getText("add_product_null_selection"));

            const aCarts = await this._getEntitySet(sEntityCart, undefined, undefined, [ new Filter("user_id", FilterOperator.EQ, sUserId),
                                                                                         new Filter("company/ID", FilterOperator.EQ, ID) ]);

            if(aCarts.length === 0)
                MessageBox.confirm(this._i18n.getText("create_cart_confirm_message"), {
                    title: this._i18n.getText("confirmation_needed"),
                    actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: async function(oAction) {
                        if(oAction === MessageBox.Action.YES) { this.openCartDialog();
                                                                await this._createCart(ID);
                                                                this._addProductsCart(aSelectedProductsContexts) }
                    }.bind(this)
                });
            else
                this._addProductsCart(aSelectedProductsContexts);
        },

        _validateCompanySelection: function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const cCompanyComboBox = this.getView().byId("companyComboBox");
            const { name } = oGlobalModel.getProperty("/selectedCompany");

            this._deleteMessages();

            if(!name) {
                cCompanyComboBox.setValueState("Error");
                cCompanyComboBox.setValueStateText(this._i18n.getText("add_product_error_company"));
                MessageToast.show(this._i18n.getText("add_product_error_company"));
                this._addMessage.call(this, { type: "Error", title: this._i18n.getText("error"), subtitle: this._i18n.getText("add_product_error_company") });
                return false;
            }

            cCompanyComboBox.setValueState("None");
            cCompanyComboBox.setValueStateText("");
            return true;
        },

        onCartsSelectChange: function(oEvent){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oSelectedCart = oEvent.getParameter("selectedItem").getBindingContext("globalModel").getObject();

            this.getView().setBusy(true);

            oGlobalModel.setProperty("/selectedCart", oSelectedCart);
            oGlobalModel.refresh(true);

            this._getCartProducts();

            this._resetProductQuantity();
        },

        _resetProductQuantity: function(){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            oGlobalModel.setProperty("/products",
            oGlobalModel.getProperty("/products").map(oProduct => {
                oProduct.quantity = 0;
                return oProduct;
            }));
        },

        toggleMessageView: function (oEvent) {
            this._handlePopoverPress(oEvent);
        },

        onCreateButtonPress: async function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            this.getView().setBusy(true);

            const oResult = await this._createProduct({ name: oGlobalModel.getProperty("/product/name"),
                                                        description: oGlobalModel.getProperty("/product/description"),
                                                        price: oGlobalModel.getProperty("/product/price"),
                                                        currency: "EUR",
                                                        stock_min: oGlobalModel.getProperty("/product/stock_min"),
                                                        stock_max: oGlobalModel.getProperty("/product/stock_max") });
            if(oResult) this.getView().byId("addProduct").close();
        },

        menu: function (oEvent) {
            if (!this._oGlobalMenu) 
                this._oGlobalMenu = new sap.m.Menu({ items: [ new MenuItem({ text: "Início", icon: "sap-icon://home" }),
                                                              new MenuItem({ text: "History", icon: "sap-icon://product" }),
                                                              new MenuItem({ text: "Definições", icon: "sap-icon://action-settings" }) ] });
            
            this._oGlobalMenu.openBy(oEvent.getSource());
        },

        onCompanyCancelPress: function(oEvent) {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            oGlobalModel.setProperty("/selectedCompany", {});
            oGlobalModel.refresh(true);
        },

        onCompanyChange: async function(oEvent){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oView = this.getView();

            oView.setBusy(true);

            oEvent.getSource().setValueState("None");

            const oSelectedCompany = await this._getEntity(sEntityCompany, oEvent.getSource().getSelectedKey());
            oGlobalModel.setProperty("/selectedCompany", oSelectedCompany);
            oGlobalModel.setProperty("/selectedCart", {});
            oGlobalModel.setProperty("/cart", []);
            oGlobalModel.refresh(true);
            this._getCarts();
            oView.setBusy(false);
        },

        //#region Dialog OPEN/CLOSE

        openAddProductDialog: function () { this._oDialogHandler._openAddProductDialog() },

        closeAddProductDialog: function () { this._oDialogHandler._closeAddProductDialog() },

        openEditProductDialog: function (oEvent) { this._oDialogHandler._openEditProductDialog() },

        closeEditProductDialog: function () { this._oDialogHandler._closeEditProductDialog() },

        openCartDialog: function () { if(!this._validateCompanySelection()) return;
                                      this._oDialogHandler._openCartDialog() },

        closeCartDialog: function () { this._oDialogHandler._closeCartDialog() },

        //#endregion
    });
});