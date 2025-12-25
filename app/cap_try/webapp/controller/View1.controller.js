sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/controller/DialogHandler",
    "sap/ui/core/mvc/Controller",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
	"sap/ui/model/Binding",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
], (BaseController,
	DialogHandler,
	Controller,
	Formatter,
	Fragment,
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

            //? Router object declaration
            this._oRouter = this.getOwnerComponent().getRouter();

            BaseController.prototype.onInit.call(this);

            this.getOwnerComponent().getModel().bindList(sEntityProducts).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Produto: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCompany).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Empresa: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCart).requestContexts().then((aContexts) => {
                aContexts.forEach(oContext => console.log("Cart: ", oContext.getObject()) );
            })
        },



        // onBeforeRendering: function() {
        // },

        // onAfterRendering: async function() {
        // },

        onAddCartButtonPress: function(){ 
            const { ID } = this.getOwnerComponent().getModel("globalModel").getProperty("/selectedCompany");
            
            this._createCart(ID);
        },

        onEditProductPress: function(oEvent) {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            const oSelectedProduct = oEvent.getSource().getBindingContext().getObject();
            oSelectedProduct.metadata = oEvent.getSource().getBindingContext();
            
            oGlobalModel.setProperty("/selectedProduct", oSelectedProduct);
            oGlobalModel.refresh(true);

            this._oDialogHandler._openEditProductDialog();
        },

        onEditProduct: function(){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oSelectedProduct = oGlobalModel.getProperty("/selectedProduct");
            this._editProduct(oSelectedProduct);

            this._oDialogHandler._closeEditProductDialog();
        },

        onDeleteProductPress: async function(oEvent) {
            const oView = this.getView();
            const oCurrentProductBinding = oEvent.getSource().getBindingContext();
            const oCurrentProduct = oCurrentProductBinding.getObject();

            MessageBox.confirm(this._i18n.getText("delete_product", [oCurrentProduct.name]), {
                title: this._i18n.getText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                           await this._deleteProduct(oCurrentProductBinding);
                                                                                        //    this._getCart();
                                                                                           oView.setBusy(false) }}.bind(this)});
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
            const aSelectedProductsContexts = aSelectedProducts.map(oProduct => { return oProduct.getBindingContext().getObject().ID;  });
            
            if(!this._validateCompanySelection()) return;

            if(aSelectedProducts.length === 0){
                this._addMessage({ type: "Warning", title: this._i18n.getText("warning"), subtitle: this._i18n.getText("add_product_null_selection") })
                return MessageToast.show(this._i18n.getText("add_product_null_selection"));
            }

            const aCarts = await this._getEntitySetContexts(sEntityCart, undefined, undefined, [ new Filter("company/ID", FilterOperator.EQ, ID) ]);

            if(aCarts.length === 0)
                MessageBox.confirm(this._i18n.getText("create_cart_confirm_message"), {
                    title: this._i18n.getText("confirmation_needed"),
                    actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: async function(oAction) {
                        if(oAction === MessageBox.Action.YES) { this.openCartDialog();
                                                                await this._createCart(ID);
                                                                await this._addProductsCart(aSelectedProductsContexts);
                                                                // await this._getCart() 
                                                            }
                    }.bind(this)
                });
            else
                await this._addProductsCart(aSelectedProductsContexts);
        },

        _validateCompanySelection: function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const cCompanyComboBox = this.getView().byId("companyComboBox");
            const { name } = oGlobalModel.getProperty("/selectedCompany");

            if(!name) {
                cCompanyComboBox.setValueState("Error");
                cCompanyComboBox.setValueStateText(this._i18n.getText("add_product_error_company"));
                MessageToast.show(this._i18n.getText("add_product_error_company"));
                this._addMessage({ type: "Error", title: this._i18n.getText("error"), subtitle: this._i18n.getText("add_product_error_company") });
                return false;
            }

            cCompanyComboBox.setValueState("None");
            cCompanyComboBox.setValueStateText("");
            return true;
        },

        onCartsSelectChange: function(oEvent){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oView = this.getView();
            const oCartTable = Fragment.byId(oView.getId(), "cartTable");
            const oSelectedCart = oEvent.getParameter("selectedItem").getBindingContext();
            const { ID } = oSelectedCart.getObject();
            const oCartItemsTable = this.getView().byId("cartTable");
            oView.setBusy(true);
            oCartTable.setBusy(true);

            oCartItemsTable.bindRows({ path: `/Cart('"${ID}"')/items`,
                                       events: { dataReceived: (oEvent) => { oView.setBusy(false);
                                                                             oCartTable.setBusy(false); }} });
            oGlobalModel.setProperty("/selectedCart", oSelectedCart);
            oGlobalModel.refresh(true);

            // this._getCartProducts();

            // this._resetProductQuantity();
        },

        // _resetProductQuantity: function(){
        //     const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

        //     oGlobalModel.setProperty("/products",
        //     oGlobalModel.getProperty("/products").map(oProduct => {
        //         oProduct.quantity = 0;
        //         return oProduct;
        //     }));
        // },

        toggleMessageView: function (oEvent) { this._handlePopoverPress(oEvent); },

        onCreateButtonPress: async function() {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const { name, description, price, stock_min, stock } = oGlobalModel.getProperty("/product");
            const { ID, currency_code } = oGlobalModel.getProperty("/selectedCompany");

            this.getView().setBusy(true);
            const oResult = await this._createProduct({ name: name,
                                                        description: description,
                                                        company_ID: ID,
                                                        price: price,
                                                        stock_min: stock_min,
                                                        stock: stock });
            if(oResult) this.getView().byId("addProduct").close();
        },

        // menu: function (oEvent) {
        //     if (!this._oGlobalMenu) 
        //         this._oGlobalMenu = new Menu({ items: [ new MenuItem({ text: "Start", icon: "sap-icon://home" }),
        //                                                 new MenuItem({ text: "Reports", icon: "sap-icon://product" }),
        //                                                 new MenuItem({ text: "Settings", icon: "sap-icon://action-settings" }) ],
        //                                        itemSelected: function(oEvent){ 
        //                                            const sSelectedAction = oEvent.getParameter("item").getText() || "";

        //                                            switch(sSelectedAction){
        //                                             case "Start": this._oRouter.navTo("View1");
        //                                                           break;
        //                                             case "Reports": this._oRouter.navTo("Reports")
        //                                                             break;
        //                                             case "Settings": MessageToast.show("Feature still under maintance!");
        //                                                              break;
        //                                            }
        //                                     }.bind(this) });
            
        //     this._oGlobalMenu.openBy(oEvent.getSource());
        // },

        onCompanyCancelPress: function(oEvent) {
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");

            oGlobalModel.setProperty("/selectedCompany", {});
            this.getView().unbindElement("/Company");
            oGlobalModel.refresh(true);
        },

        onCompanyChange: async function(oEvent){
            const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
            const oView = this.getView();

            oView.setBusy(true);

            oEvent.getSource().setValueState("None");

            const oSelectedCompany = await this._getEntityContexts(sEntityCompany, oEvent.getSource().getSelectedKey());
            oGlobalModel.setProperty("/selectedCompany", oSelectedCompany);
            oGlobalModel.setProperty("/selectedCart", {});
            oGlobalModel.setProperty("/cart", []);
            oGlobalModel.refresh(true);
            this._getProducts();
            // this._getCarts();
            // oView.setBusy(false);

        },
        
        // onDeleteCartProductPress: function (){
        //     const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
        //     const oView = this.getView();
        //     const oTable = this.getView().byId("cartTable");
        //     const oTableId = oView.byId("cartTable");
        //     const aSelectedProductsIndex = oTable.getSelectedIndices();
        //     const aSelectedProdcuts = aSelectedProductsIndex.map(iIndex => { return oTable.getContextByIndex(iIndex).getObject() });

        //     MessageBox.confirm(this._i18n.getText("delete_cart_product_confirmation"), {
        //         actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
        //         emphasizedAction: MessageBox.Action.YES,
        //         onClose: (oAction) => {
        //             if (oAction === MessageBox.Action.YES){
        //                 oTableId.setBusy(true);
        //                 this._deleteProduct(aSelectedProdcuts);
        //                 this._getCart();
        //                 oTableId.setBusy(false);
        //             } 
        //         }
        //     });
        // },

        // onProductCartQuantityChangePress: function (oEvent) {
        //     const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
        //     const oView = this.getView();
        //     const oUpdatedProduct = oEvent.getSource().getBindingContext("globalModel")?.getObject();
        //     const iNewQuantity = oEvent.getParameter("value");

        //     oView.setBusy(true);

        //     oUpdatedProduct.metadata.setProperty("quantity", iNewQuantity);
        //     this._getCart();

        //     oView.setBusy(false);
        // },

        // onFinalizePurchaseButtonPress: function (oEvent){
        //     const oGlobalModel = this.getOwnerComponent().getModel("globalModel");
        //     const oView = this.getView();
        //     const oCurrentCart = oGlobalModel.getProperty("/selectedCart");
        //     const oCartProducts = oGlobalModel.getProperty("/cart");
        //     const { ID } = oGlobalModel.getProperty("/selectedCompany");

        //     console.log(oCartProducts);

        //     const oPayloadCart = { ID: oCurrentCart.ID,
        //                            company_ID: ID,
        //                            user_id: oCurrentCart.user_id,
        //                            type: "S",
        //                            currency: "EUR",
        //                            products: oCartProducts.map(oProduct => { return { cart_ID: oCurrentCart.ID,
        //                                                                               cart_user_id: oCurrentCart.user_id,
        //                                                                               product_ID: oProduct.ID,
        //                                                                               price: oProduct.price.toFixed(2),
        //                                                                               total_price: (oProduct.price * oProduct.quantity).toFixed(2),
        //                                                                               quantity: oProduct.quantity, }}) };
        //     oView.setBusy(true);

        //     this._finalizeCart(oPayloadCart);
        // },

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