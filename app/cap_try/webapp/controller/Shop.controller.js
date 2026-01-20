sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Sorter"
], (BaseController,
	Formatter,
	Fragment,
	Filter,
	FilterOperator,
	MessageToast,
	MessageBox,
	Sorter) => {
    "use strict";

    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";

    return BaseController.extend("cap_try.controller.Shop", {
        formatter: Formatter,
        onInit: async function() {
            this._onControllerLoad();

            this.getRouter().getRoute("Shop").attachPatternMatched(this._onObjectMatched, this);

            this.getOwnerComponent().getModel().bindList(sEntityProducts).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Produto: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCompany).requestContexts().then(function(aContexts) {
                aContexts.forEach(oContext => console.log("Empresa: ", oContext.getObject()) );
            });
            this.getOwnerComponent().getModel().bindList(sEntityCart, undefined, undefined, undefined, { '$expand': 'items' }).requestContexts().then((aContexts) => {
                aContexts.forEach(oContext => console.log("Cart: ", oContext.getObject()) );
            })
        },

        onFinalizePurchasePress: function(oEvent) {
            const oSelectedCart = this.getProp("globalModel", "/selectedCart");

            if(!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("finalize_cart_selection_missing"));

            const { ID } = oSelectedCart.getObject();
            this._finalizeCart(ID);
        },

        onAddCartButtonPress: function(){ 
            const { ID } = this.getProp("globalModel", "/selectedCompany");
            
            this._createCart(ID);
        },

        onEditProductPress: function(oEvent) {
            const oSelectedProduct = oEvent.getSource().getBindingContext().getObject();
            oSelectedProduct.metadata = oEvent.getSource().getBindingContext();
            
            this.setProp("globalModel", "/selectedProduct", oSelectedProduct);
            this.getModel("globalModel").refresh(true);

            this.getDialogHandler()._openEditProductDialog();
        },

        onEditProduct: function(){
            const oSelectedProduct = this.getProp("globalModel", "/selectedProduct");
            this._editProduct(oSelectedProduct);

            this.getDialogHandler()._closeEditProductDialog();
        },

        onDeleteProductPress: async function(oEvent) {
            const oView = this.getView();
            const oCurrentProductBinding = oEvent.getSource().getBindingContext();
            const oCurrentProduct = oCurrentProductBinding.getObject();

            MessageBox.confirm(this.getI18nText("delete_product", [oCurrentProduct.name]), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                           await this._deleteProduct(oCurrentProductBinding);
                                                                                           oView.setBusy(false) }}.bind(this)});
        },

        onDeleteMultiplesProductsPress: async function(oEvent) {
            const oView = this.getView();
            const oProductsTable = this.getView().byId("productsWorklist");
            const aSelectedProductsContexts = oProductsTable.getSelectedContexts();

            if(!aSelectedProductsContexts.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

            MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                           await this._deleteProduct(aSelectedProductsContexts);
                                                                                           oView.setBusy(false); }}.bind(this)});
        },

        onDeleteCartItemPress: async function(oEvent) {
            const oSelectedItemBinding = oEvent.getSource().getBindingContext();
            const { name } = oSelectedItemBinding.getObject();

            MessageBox.confirm(this.getI18nText("delete_product", [name]), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { await this._deleteCartItem(oSelectedItemBinding); }}.bind(this)});
        },

        onDeleteMultipleCartItemPress: async function(oEvent) {
            const oCartTable = Fragment.byId(this.getView().getId(), "cartTable");
            const aSelectedItemsIndices = oCartTable.getSelectedIndices();

            if(!aSelectedItemsIndices.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

            const aSelectedItems = aSelectedItemsIndices.map(iIndex => { return oCartTable.getContextByIndex(iIndex) } );

            MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { await this._deleteCartItem(aSelectedItems); }}.bind(this)});
        },


        onDeleteSelectedCartPress: async function() {
            const oSelectedCart = this.getProp("globalModel", "/selectedCart");

            if (!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("delete_current_cart_selection_missing"));

            MessageBox.confirm(this.getI18nText("delete_current_cart_message", [oSelectedCart.name]), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) {
                    if (oAction === MessageBox.Action.YES) { await this._deleteCart(oSelectedCart); }
                }.bind(this)
            });
        },

        addProductCart: async function() {
            const oSelectedCart = this.getProp("globalModel", "/selectedCart");
            const oTable = this.getView().byId("productsWorklist");
            const { ID } = this.getProp("globalModel", "/selectedCompany");
            const aSelectedProducts = oTable.getSelectedItems();

            if(!aSelectedProducts.length){
                this._addMessage({ type: "Warning", title: this.getI18nText("warning"), subtitle: this.getI18nText("add_product_null_selection") })
                return MessageToast.show(this.getI18nText("add_product_null_selection"));
            }

            const aSelectedProductsContexts = aSelectedProducts.map(oProduct => { return oProduct.getBindingContext().getObject().ID;  });
            
            if(!this._validateCompanieselection()) return;

            if(!Object.keys(oSelectedCart).length)
                MessageBox.confirm(this.getI18nText("create_cart_confirm_message"), {
                    title: this.getI18nText("confirmation_needed"),
                    actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: async function(oAction) {
                        if(oAction === MessageBox.Action.YES) { await this.openCartDialog();
                                                                await this._createCart(ID);
                                                                await this._addProductsCart(aSelectedProductsContexts);
                                                                oTable.removeSelections(); }
                    }.bind(this)
                });
            else{
                await this._addProductsCart(aSelectedProductsContexts);
                oTable.removeSelections();
            }
        },

        _validateCompanieselection: function() {
            const cCompanyComboBox = this.getView().byId("companyComboBox");
            const { name } = this.getProp("globalModel", "/selectedCompany");

            if(!name) {
                cCompanyComboBox.setValueState("Error");
                cCompanyComboBox.setValueStateText(this.getI18nText("add_product_error_company"));
                MessageToast.show(this.getI18nText("add_product_error_company"));
                this._addMessage({ type: "Error", title: this.getI18nText("error"), subtitle: this.getI18nText("add_product_error_company") });
                return false;
            }

            cCompanyComboBox.setValueState("None");
            cCompanyComboBox.setValueStateText("");
            return true;
        },

        onCartsSelectChange: function(oEvent){
            const oView = this.getView();
            const oCartTable = Fragment.byId(oView.getId(), "cartTable");
            const oSelectedCart = oEvent.getParameter("selectedItem").getBindingContext();

            oCartTable.setBusy(true);
            
            this.setProp("globalModel", "/selectedCart", oSelectedCart);
            this.getModel("globalModel").refresh(true);

            this._bindCartDataToFragment();
        },

        onCreateButtonPress: async function() {
            const { name, description, price, stock_min, stock } = this.getProp("globalModel", "/product");
            const { ID, currency_code } = this.getProp("globalModel", "/selectedCompany");

            this.getView().setBusy(true);
            const oResult = await this._createProduct({ name: name,
                                                        description: description,
                                                        company_ID: ID,
                                                        price: price,
                                                        stock_min: stock_min,
                                                        stock: stock });
            if(oResult) this.getView().byId("addProduct").close();
        },

        onCompanyCancelPress: function(oEvent) {
            this.setProp("globalModel", "/selectedCompany", {});
            this.getView().unbindElement("/Company");
            this.getModel("globalModel").refresh(true);
        },

        onCompanyChange: async function(oEvent){
            const oView = this.getView();

            oView.setBusy(true);

            oEvent.getSource().setValueState("None");

            const oSelectedCompany = await this._getEntityContexts(sEntityCompany, oEvent.getSource().getSelectedKey());
            this.setProp("globalModel", "/selectedCompany", oSelectedCompany);
            this.setProp("globalModel", "/selectedCart", {});
            this.setProp("globalModel", "/cartItemsQuantity", 0);
            this.setProp("globalModel", "/cart", []);
            this.getModel("globalModel").refresh(true);
            this._getProducts();
            this._assignCartOnCompanyLoad();
        },

        onProductCartQuantityChangePress: function(oEvent){
            const oFooterTable = Fragment.byId(this.getView().getId(), "cartTableFooter");
            const oFooterTableModel = oFooterTable.getBindingContext();
            oFooterTableModel.refresh();
        },

        //#region Dialog OPEN/CLOSE

        openAddProductDialog: function () { this.getDialogHandler()._openAddProductDialog() },

        closeAddProductDialog: function () { this.getDialogHandler()._closeAddProductDialog() },

        openEditProductDialog: function (oEvent) { this.getDialogHandler()._openEditProductDialog() },

        closeEditProductDialog: function () { this.getDialogHandler()._closeEditProductDialog() },

        openCartDialog: async function () { if(!this._validateCompanieselection()) return;
                                            await this.getDialogHandler()._openCartDialog() },

        closeCartDialog: function () { this.getDialogHandler()._closeCartDialog() },

        //#endregion
    });
});