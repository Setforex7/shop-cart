sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/service/ProductService",
    "cap_try/service/CartService",
    "cap_try/service/FileService",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (BaseController,
    ProductService,
    CartService,
    FileService,
    Formatter,
    Fragment,
    Filter,
    FilterOperator,
    MessageToast,
    MessageBox) => {
    "use strict";

    const sEntityCompany = "/Company";

    return BaseController.extend("cap_try.controller.Shop", {
        formatter: Formatter,
        onInit: async function() {
            this._onControllerLoad();
            this.getRouter().getRoute("Shop").attachPatternMatched(this._onObjectMatched, this);
        },

        onExit: function() {
            this.getRouter().getRoute("Shop").detachPatternMatched(this._onObjectMatched, this);
        },

        onDownloadTemplatePress: function() {
            const sUrl = this.getModel().getServiceUrl() + "downloadExcelTemplate()/$value";
            sap.m.URLHelper.redirect(sUrl, true);
        },

        onUploadTemplatePress: function(oEvent) {
            FileService.read(this, oEvent, ProductService.createBatch.bind(ProductService, this));
        },

        onFinalizePurchasePress: function() {
            const oSelectedCart = this.getProp("globalModel", "/selectedCart");

            if(!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("finalize_cart_selection_missing"));

            const { ID } = oSelectedCart.getObject();
            CartService.finalize(this, ID);
        },

        onAddCartButtonPress: function() {
            const { ID } = this.getProp("globalModel", "/selectedCompany");
            CartService.create(this, ID);
        },

        onEditProductPress: function(oEvent) {
            const oSelectedProduct = oEvent.getSource().getBindingContext().getObject();
            oSelectedProduct.metadata = oEvent.getSource().getBindingContext();

            this.setProp("globalModel", "/selectedProduct", oSelectedProduct);
            this.getModel("globalModel").refresh(true);

            this.getDialogHandler()._openEditProductDialog();
        },

        onEditProduct: function() {
            const oSelectedProduct = this.getProp("globalModel", "/selectedProduct");
            ProductService.edit(this, oSelectedProduct);
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
                                                                                           await ProductService.delete(this, oCurrentProductBinding);
                                                                                           oView.setBusy(false) }}.bind(this)});
        },

        onDeleteMultiplesProductsPress: async function() {
            const oView = this.getView();
            const oProductsTable = this.getView().byId("productsWorklist");
            const aSelectedProductsContexts = oProductsTable.getSelectedContexts();

            if(!aSelectedProductsContexts.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

            MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                           await ProductService.delete(this, aSelectedProductsContexts);
                                                                                           oView.setBusy(false); }}.bind(this)});
        },

        onDeleteCartItemPress: async function(oEvent) {
            const oSelectedItemBinding = oEvent.getSource().getBindingContext();
            const { name } = oSelectedItemBinding.getObject();

            MessageBox.confirm(this.getI18nText("delete_product", [name]), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { await CartService.deleteItem(this, oSelectedItemBinding); }}.bind(this)});
        },

        onDeleteMultipleCartItemPress: async function() {
            const oCartTable = Fragment.byId(this.getView().getId(), "cartTable");
            if (!oCartTable) return;
            const aSelectedItemsIndices = oCartTable.getSelectedIndices();

            if(!aSelectedItemsIndices.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

            const aSelectedItems = aSelectedItemsIndices.map(iIndex => { return oCartTable.getContextByIndex(iIndex) } );

            MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) { if(oAction === MessageBox.Action.YES) { await CartService.deleteItem(this, aSelectedItems); }}.bind(this)});
        },

        onDeleteSelectedCartPress: async function() {
            const oSelectedCart = this.getProp("globalModel", "/selectedCart");

            if (!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("delete_current_cart_selection_missing"));

            MessageBox.confirm(this.getI18nText("delete_current_cart_message", [oSelectedCart.name]), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(oAction) {
                    if (oAction === MessageBox.Action.YES) { await CartService.delete(this, oSelectedCart); }
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
                                                                await CartService.create(this, ID);
                                                                await CartService.addProducts(this, aSelectedProductsContexts);
                                                                oTable.removeSelections(); }
                    }.bind(this)
                });
            else{
                await CartService.addProducts(this, aSelectedProductsContexts);
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

        onCartsSelectChange: function(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;

            const oSelectedCart = oSelectedItem.getBindingContext();

            this.setProp("globalModel", "/selectedCart", oSelectedCart);
            this.getModel("globalModel").refresh(true);

            CartService.bindDataToFragment(this);
        },

        onCreateButtonPress: async function() {
            const { name, description, price, stock_min, stock } = this.getProp("globalModel", "/product");
            const { ID } = this.getProp("globalModel", "/selectedCompany");

            if(!name || !description || !price || !stock_min || !stock)
                return MessageToast.show(this.getI18nText("add_product_error_fields"));

            this.getView().setBusy(true);
            await ProductService.create(this, { name, description, company_ID: ID, price, stock_min, stock });
            this.getView().setBusy(false);
        },

        onCompanyCancelPress: function() {
            this.setProp("globalModel", "/selectedCompany", {});
            this.getView().unbindElement("/Company");
            this.getModel("globalModel").refresh(true);
        },

        onCompanyChange: async function(oEvent) {
            const oView = this.getView();
            oView.setBusy(true);

            oEvent.getSource().setValueState("None");

            const oSelectedCompany = await this._getEntityContexts(sEntityCompany, oEvent.getSource().getSelectedKey());
            this.setProp("globalModel", "/selectedCompany", oSelectedCompany);
            this.setProp("globalModel", "/selectedCart", {});
            this.setProp("globalModel", "/cartItemsQuantity", 0);
            this.setProp("globalModel", "/cart", []);
            this.getModel("globalModel").refresh(true);
            ProductService.loadByCompany(this);
            CartService.assignOnCompanyLoad(this);
        },

        onProductCartQuantityChangePress: function(oEvent) {
            const iNewQuantity = oEvent.getParameter("value");
            const oContext = oEvent.getSource().getBindingContext();

            if (!oContext || iNewQuantity < 1) return;

            oContext.setProperty("quantity", iNewQuantity);

            const oFooterTable = Fragment.byId(this.getView().getId(), "cartTableFooter");
            if (oFooterTable) {
                const oFooterContext = oFooterTable.getBindingContext();
                if (oFooterContext) oFooterContext.refresh();
            }
        },

        onSearch: function(oEvent) {
            const sQuery = oEvent.getParameter("newValue");
            const oProductsTable = this.getView().byId("productsWorklist");
            const oBinding = oProductsTable.getBinding("items");

            if (sQuery) {
                oBinding.filter([new Filter("name", FilterOperator.Contains, sQuery)]);
            } else {
                oBinding.filter([]);
            }
        },

        //#region Dialog OPEN/CLOSE

        openAddProductDialog: function () { this.getDialogHandler()._openAddProductDialog() },

        closeAddProductDialog: function () { this.getDialogHandler()._closeAddProductDialog() },

        openEditProductDialog: function () { this.getDialogHandler()._openEditProductDialog() },

        closeEditProductDialog: function () { this.getDialogHandler()._closeEditProductDialog() },

        openCartDialog: async function () { if(!this._validateCompanieselection()) return;
                                            await this.getDialogHandler()._openCartDialog() },

        closeCartDialog: function () { this.getDialogHandler()._closeCartDialog() },

        //#endregion
    });
});
