sap.ui.define([
    "cap_try/controller/Shop.controller",
    "cap_try/service/ProductService",
    "cap_try/service/CartService",
    "cap_try/service/FileService",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/library",
    "sap/ui/thirdparty/sinon"
], function (ShopController, ProductService, CartService, FileService, Fragment, Filter, MessageToast, MessageBox, mLibrary, sinon) {
    "use strict";

    QUnit.module("cap_try.controller.Shop", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();
            this.oController = new ShopController();

            this.oGlobalModel = { refresh: this.sandbox.stub() };

            this.oViewStub = {
                setBusy: this.sandbox.stub(),
                byId: this.sandbox.stub(),
                getId: this.sandbox.stub().returns("shopView"),
                unbindElement: this.sandbox.stub()
            };

            this.oDialogHandler = {
                _openAddProductDialog: this.sandbox.stub(),
                _closeAddProductDialog: this.sandbox.stub(),
                _openEditProductDialog: this.sandbox.stub(),
                _closeEditProductDialog: this.sandbox.stub(),
                _openCartDialog: this.sandbox.stub().returns(Promise.resolve()),
                _closeCartDialog: this.sandbox.stub()
            };

            this.oController.getView = this.sandbox.stub().returns(this.oViewStub);
            this.oController.getModel = this.sandbox.stub();
            this.oController.getModel.withArgs("globalModel").returns(this.oGlobalModel);
            this.oController.getProp = this.sandbox.stub();
            this.oController.setProp = this.sandbox.stub();
            this.oController.getI18nText = this.sandbox.stub().returnsArg(0);
            this.oController.getDialogHandler = this.sandbox.stub().returns(this.oDialogHandler);
            this.oController._addMessage = this.sandbox.stub();

            this.oToastStub = this.sandbox.stub(MessageToast, "show");
            this.oConfirmStub = this.sandbox.stub(MessageBox, "confirm");
        },
        afterEach: function () {
            this.sandbox.restore();
            this.oController.destroy();
        }
    });

    QUnit.test("onInit loads the controller and attaches the pattern matched handler", function (assert) {
        const oAttachStub = this.sandbox.stub();
        const oGetRouteStub = this.sandbox.stub().returns({ attachPatternMatched: oAttachStub });
        this.oController._onControllerLoad = this.sandbox.stub();
        this.oController.getRouter = this.sandbox.stub().returns({ getRoute: oGetRouteStub });

        this.oController.onInit();

        assert.ok(this.oController._onControllerLoad.calledOnce, "_onControllerLoad was invoked once");
        assert.ok(oGetRouteStub.calledWith("Shop"), "the 'Shop' route was requested");
        assert.ok(oAttachStub.calledOnce, "attachPatternMatched was invoked once");
        assert.strictEqual(oAttachStub.firstCall.args[1], this.oController, "the controller is passed as listener");
    });

    QUnit.test("onExit detaches the pattern matched handler", function (assert) {
        const oDetachStub = this.sandbox.stub();
        const oGetRouteStub = this.sandbox.stub().returns({ detachPatternMatched: oDetachStub });
        this.oController.getRouter = this.sandbox.stub().returns({ getRoute: oGetRouteStub });

        this.oController.onExit();

        assert.ok(oGetRouteStub.calledWith("Shop"), "the 'Shop' route was requested");
        assert.ok(oDetachStub.calledOnce, "detachPatternMatched was invoked once");
        assert.strictEqual(oDetachStub.firstCall.args[1], this.oController, "the controller is passed as listener");
    });

    QUnit.test("onDownloadTemplatePress redirects to the Excel template URL", function (assert) {
        this.oController.getModel.returns({ getServiceUrl: this.sandbox.stub().returns("/shop/") });
        const oRedirectStub = this.sandbox.stub(mLibrary.URLHelper, "redirect");

        this.oController.onDownloadTemplatePress();

        assert.ok(oRedirectStub.calledOnce, "URLHelper.redirect was invoked once");
        assert.deepEqual(oRedirectStub.firstCall.args, ["/shop/downloadExcelTemplate()/$value", true], "redirect targets the template download URL in a new window");
    });

    QUnit.test("onUploadTemplatePress delegates the file to FileService.read", function (assert) {
        const oReadStub = this.sandbox.stub(FileService, "read");
        const oEvent = {};

        this.oController.onUploadTemplatePress(oEvent);

        assert.ok(oReadStub.calledOnce, "FileService.read was invoked once");
        assert.strictEqual(oReadStub.firstCall.args[0], this.oController, "the controller is passed first");
        assert.strictEqual(oReadStub.firstCall.args[1], oEvent, "the upload event is passed through");
        assert.strictEqual(typeof oReadStub.firstCall.args[2], "function", "a batch-create callback is passed");
    });

    QUnit.test("onFinalizePurchasePress warns without a cart and finalizes the selected one", function (assert) {
        const oFinalizeStub = this.sandbox.stub(CartService, "finalize");

        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({});
        this.oController.onFinalizePurchasePress();
        assert.ok(this.oToastStub.calledWith("finalize_cart_selection_missing"), "a toast warns about the missing cart selection");
        assert.ok(oFinalizeStub.notCalled, "no cart is finalized without a selection");

        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({
            getObject: this.sandbox.stub().returns({ ID: "cart-1" })
        });
        this.oController.onFinalizePurchasePress();
        assert.ok(oFinalizeStub.calledOnce, "CartService.finalize was invoked once");
        assert.ok(oFinalizeStub.calledWith(this.oController, "cart-1"), "the selected cart ID is finalized");
    });

    QUnit.test("onAddCartButtonPress creates a cart for the selected company", function (assert) {
        const oCreateStub = this.sandbox.stub(CartService, "create");
        this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "comp-1" });

        this.oController.onAddCartButtonPress();

        assert.ok(oCreateStub.calledOnce, "CartService.create was invoked once");
        assert.ok(oCreateStub.calledWith(this.oController, "comp-1"), "the selected company ID is used");
    });

    QUnit.test("onEditProductPress stores the product and opens the edit dialog", function (assert) {
        const oProduct = { name: "Laptop" };
        const oContext = { getObject: this.sandbox.stub().returns(oProduct) };
        const oEvent = { getSource: function () { return { getBindingContext: function () { return oContext; } }; } };

        this.oController.onEditProductPress(oEvent);

        assert.strictEqual(oProduct.metadata, oContext, "the binding context is stored as metadata");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedProduct", oProduct), "the selected product is written to the global model");
        assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model is refreshed");
        assert.ok(this.oDialogHandler._openEditProductDialog.calledOnce, "the edit product dialog is opened");
    });

    QUnit.test("onEditProduct edits the selected product and closes the dialog", function (assert) {
        const oProduct = { ID: "prod-1", name: "Laptop" };
        const oEditStub = this.sandbox.stub(ProductService, "edit");
        this.oController.getProp.withArgs("globalModel", "/selectedProduct").returns(oProduct);

        this.oController.onEditProduct();

        assert.ok(oEditStub.calledOnce, "ProductService.edit was invoked once");
        assert.ok(oEditStub.calledWith(this.oController, oProduct), "the selected product is passed for editing");
        assert.ok(this.oDialogHandler._closeEditProductDialog.calledOnce, "the edit product dialog is closed");
    });

    QUnit.test("onDeleteProductPress confirms and deletes the product on YES", async function (assert) {
        const oContext = { getObject: this.sandbox.stub().returns({ name: "Laptop" }) };
        const oEvent = { getSource: function () { return { getBindingContext: function () { return oContext; } }; } };
        const oDeleteStub = this.sandbox.stub(ProductService, "delete").returns(Promise.resolve());

        await this.oController.onDeleteProductPress(oEvent);

        assert.ok(this.oConfirmStub.calledOnce, "a confirmation dialog is shown");
        assert.strictEqual(this.oConfirmStub.firstCall.args[0], "delete_product", "the delete_product text is used");

        await this.oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);

        assert.ok(oDeleteStub.calledOnce, "ProductService.delete was invoked once");
        assert.strictEqual(oDeleteStub.firstCall.args[1], oContext, "the product binding context is deleted");
        assert.ok(this.oViewStub.setBusy.calledWith(true), "the view was set busy");
        assert.ok(this.oViewStub.setBusy.calledWith(false), "the view busy state was cleared");
    });

    QUnit.test("onDeleteMultiplesProductsPress warns on empty selection and deletes selected contexts", async function (assert) {
        const oDeleteStub = this.sandbox.stub(ProductService, "delete").returns(Promise.resolve());

        this.oViewStub.byId.withArgs("productsWorklist").returns({ getSelectedContexts: this.sandbox.stub().returns([]) });
        await this.oController.onDeleteMultiplesProductsPress();
        assert.ok(this.oToastStub.calledWith("delete_product_null_selection"), "a toast warns about the empty selection");
        assert.ok(this.oConfirmStub.notCalled, "no confirmation is shown without a selection");

        const oContext = { sPath: "/Products('1')" };
        this.oViewStub.byId.withArgs("productsWorklist").returns({ getSelectedContexts: this.sandbox.stub().returns([oContext]) });
        await this.oController.onDeleteMultiplesProductsPress();
        assert.ok(this.oConfirmStub.calledOnce, "a confirmation dialog is shown");

        await this.oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);

        assert.ok(oDeleteStub.calledOnce, "ProductService.delete was invoked once");
        assert.strictEqual(oDeleteStub.firstCall.args[1][0], oContext, "the selected contexts are deleted");
        assert.ok(this.oViewStub.setBusy.calledWith(true), "the view was set busy");
        assert.ok(this.oViewStub.setBusy.calledWith(false), "the view busy state was cleared");
    });

    QUnit.test("onDeleteCartItemPress confirms and deletes the cart item on YES", async function (assert) {
        const oContext = { getObject: this.sandbox.stub().returns({ name: "Mouse" }) };
        const oEvent = { getSource: function () { return { getBindingContext: function () { return oContext; } }; } };
        const oDeleteItemStub = this.sandbox.stub(CartService, "deleteItem").returns(Promise.resolve());

        await this.oController.onDeleteCartItemPress(oEvent);

        assert.ok(this.oConfirmStub.calledOnce, "a confirmation dialog is shown");

        await this.oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);

        assert.ok(oDeleteItemStub.calledOnce, "CartService.deleteItem was invoked once");
        assert.strictEqual(oDeleteItemStub.firstCall.args[1], oContext, "the cart item binding context is deleted");
    });

    QUnit.test("onDeleteMultipleCartItemPress deletes the selected cart item contexts on YES", async function (assert) {
        const oContext0 = { sPath: "/CartItem('a')" };
        const oContext1 = { sPath: "/CartItem('b')" };
        const oGetContextByIndex = this.sandbox.stub();
        oGetContextByIndex.withArgs(0).returns(oContext0);
        oGetContextByIndex.withArgs(1).returns(oContext1);
        const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId").returns({
            getSelectedIndices: this.sandbox.stub().returns([0, 1]),
            getContextByIndex: oGetContextByIndex
        });
        const oDeleteItemStub = this.sandbox.stub(CartService, "deleteItem").returns(Promise.resolve());

        await this.oController.onDeleteMultipleCartItemPress();

        assert.ok(oFragmentByIdStub.calledWith("shopView", "cartTable"), "the cart table fragment is looked up by view id");
        assert.ok(this.oConfirmStub.calledOnce, "a confirmation dialog is shown");

        await this.oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);

        assert.ok(oDeleteItemStub.calledOnce, "CartService.deleteItem was invoked once");
        assert.strictEqual(oDeleteItemStub.firstCall.args[1].length, 2, "both selected items are passed");
        assert.strictEqual(oDeleteItemStub.firstCall.args[1][0], oContext0, "the first context is passed");
        assert.strictEqual(oDeleteItemStub.firstCall.args[1][1], oContext1, "the second context is passed");
    });

    QUnit.test("onDeleteSelectedCartPress warns without a cart and deletes the selected one on YES", async function (assert) {
        const oDeleteStub = this.sandbox.stub(CartService, "delete").returns(Promise.resolve());

        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({});
        await this.oController.onDeleteSelectedCartPress();
        assert.ok(this.oToastStub.calledWith("delete_current_cart_selection_missing"), "a toast warns about the missing cart selection");
        assert.ok(this.oConfirmStub.notCalled, "no confirmation is shown without a selection");

        const oCart = { name: "Cart 1" };
        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns(oCart);
        await this.oController.onDeleteSelectedCartPress();
        assert.ok(this.oConfirmStub.calledOnce, "a confirmation dialog is shown");

        await this.oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);

        assert.ok(oDeleteStub.calledOnce, "CartService.delete was invoked once");
        assert.strictEqual(oDeleteStub.firstCall.args[1], oCart, "the selected cart is deleted");
    });

    QUnit.test("addProductCart warns on empty selection and adds products to an existing cart", async function (assert) {
        const oAddProductsStub = this.sandbox.stub(CartService, "addProducts").returns(Promise.resolve());
        this.oController._validateCompanieselection = this.sandbox.stub().returns(true);
        this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "comp-1" });

        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({});
        this.oViewStub.byId.withArgs("productsWorklist").returns({
            getSelectedItems: this.sandbox.stub().returns([]),
            removeSelections: this.sandbox.stub()
        });
        await this.oController.addProductCart();
        assert.ok(this.oToastStub.calledWith("add_product_null_selection"), "a toast warns about the empty product selection");
        assert.ok(this.oController._addMessage.calledOnce, "a warning message is added");
        assert.ok(oAddProductsStub.notCalled, "no products are added without a selection");

        const oItem = { getBindingContext: function () { return { getObject: function () { return { ID: "prod-1" }; } }; } };
        const oTable = {
            getSelectedItems: this.sandbox.stub().returns([oItem]),
            removeSelections: this.sandbox.stub()
        };
        this.oViewStub.byId.withArgs("productsWorklist").returns(oTable);
        this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({ ID: "cart-1" });

        await this.oController.addProductCart();

        assert.ok(oAddProductsStub.calledOnce, "CartService.addProducts was invoked once");
        assert.deepEqual(oAddProductsStub.firstCall.args[1], ["prod-1"], "the selected product IDs are added");
        assert.ok(oTable.removeSelections.calledOnce, "the table selection is cleared");
    });

    QUnit.test("onCartsSelectChange stores the selected cart and rebinds the fragment", function (assert) {
        const oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");

        this.oController.onCartsSelectChange({ getParameter: this.sandbox.stub().returns(null) });
        assert.ok(oBindStub.notCalled, "nothing happens without a selected item");
        assert.ok(this.oController.setProp.notCalled, "no cart is stored without a selected item");

        const oCartContext = { sPath: "/Cart('1')" };
        const oEvent = {
            getParameter: this.sandbox.stub().returns({ getBindingContext: function () { return oCartContext; } })
        };
        this.oController.onCartsSelectChange(oEvent);

        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCart", oCartContext), "the selected cart context is stored");
        assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model is refreshed");
        assert.ok(oBindStub.calledWith(this.oController), "the cart fragment data is rebound");
    });

    QUnit.test("onCreateButtonPress validates fields and creates the product", async function (assert) {
        const oCreateStub = this.sandbox.stub(ProductService, "create").returns(Promise.resolve());
        this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "comp-1" });

        this.oController.getProp.withArgs("globalModel", "/product").returns({});
        await this.oController.onCreateButtonPress();
        assert.ok(this.oToastStub.calledWith("add_product_error_fields"), "a toast warns about missing fields");
        assert.ok(oCreateStub.notCalled, "no product is created with missing fields");

        this.oController.getProp.withArgs("globalModel", "/product").returns({ name: "Laptop", description: "Nice", price: 10, stock_min: 1, stock: 5 });
        await this.oController.onCreateButtonPress();

        assert.ok(oCreateStub.calledOnce, "ProductService.create was invoked once");
        assert.deepEqual(oCreateStub.firstCall.args[1], { name: "Laptop", description: "Nice", company_ID: "comp-1", price: 10, stock_min: 1, stock: 5 }, "the product payload includes the selected company");
        assert.ok(this.oViewStub.setBusy.calledWith(true), "the view was set busy");
        assert.ok(this.oViewStub.setBusy.calledWith(false), "the view busy state was cleared");
    });

    QUnit.test("onCompanyCancelPress clears the company selection", function (assert) {
        this.oController.onCompanyCancelPress();

        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCompany"), "the selected company property is reset");
        assert.deepEqual(this.oController.setProp.firstCall.args[2], {}, "the selected company is reset to an empty object");
        assert.ok(this.oViewStub.unbindElement.calledWith("/Company"), "the view is unbound from /Company");
        assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model is refreshed");
    });

    QUnit.test("onCompanyChange loads the company, resets cart state and reloads products", async function (assert) {
        const oCompany = { ID: "comp-1", name: "ACME" };
        const oLoadStub = this.sandbox.stub(ProductService, "loadByCompany");
        const oAssignStub = this.sandbox.stub(CartService, "assignOnCompanyLoad");
        const oSetValueState = this.sandbox.stub();
        this.oController._getEntityContexts = this.sandbox.stub().returns(Promise.resolve(oCompany));
        const oEvent = {
            getSource: function () {
                return { setValueState: oSetValueState, getSelectedKey: function () { return "comp-1"; } };
            }
        };

        await this.oController.onCompanyChange(oEvent);

        assert.ok(this.oViewStub.setBusy.calledWith(true), "the view was set busy");
        assert.ok(oSetValueState.calledWith("None"), "the value state is reset");
        assert.ok(this.oController._getEntityContexts.calledWith("/Company", "comp-1"), "the company context is loaded by key");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCompany", oCompany), "the selected company is stored");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 0), "the cart items quantity is reset");
        assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model is refreshed");
        assert.ok(oLoadStub.calledWith(this.oController), "products are reloaded for the company");
        assert.ok(oAssignStub.calledWith(this.oController), "carts are reassigned for the company");
    });

    QUnit.test("onProductCartQuantityChangePress updates the quantity and refreshes the footer", function (assert) {
        const oContext = { setProperty: this.sandbox.stub() };
        const oRefreshStub = this.sandbox.stub();
        this.sandbox.stub(Fragment, "byId").returns({
            getBindingContext: function () { return { refresh: oRefreshStub }; }
        });
        const oEvent = {
            getParameter: this.sandbox.stub().returns(3),
            getSource: function () { return { getBindingContext: function () { return oContext; } }; }
        };

        this.oController.onProductCartQuantityChangePress(oEvent);

        assert.ok(oContext.setProperty.calledWith("quantity", 3), "the quantity property is updated");
        assert.ok(oRefreshStub.calledOnce, "the footer binding context is refreshed");

        const oInvalidEvent = {
            getParameter: this.sandbox.stub().returns(0),
            getSource: function () { return { getBindingContext: function () { return oContext; } }; }
        };
        this.oController.onProductCartQuantityChangePress(oInvalidEvent);
        assert.ok(oContext.setProperty.calledOnce, "quantities below 1 are ignored");
    });

    QUnit.test("onSearch filters the products table by name and clears the filter on empty query", function (assert) {
        const oFilterStub = this.sandbox.stub();
        this.oViewStub.byId.withArgs("productsWorklist").returns({
            getBinding: this.sandbox.stub().returns({ filter: oFilterStub })
        });

        this.oController.onSearch({ getParameter: this.sandbox.stub().returns("lap") });
        assert.ok(oFilterStub.calledOnce, "the binding is filtered once");
        assert.strictEqual(oFilterStub.firstCall.args[0].length, 1, "exactly one filter is applied");
        assert.ok(oFilterStub.firstCall.args[0][0] instanceof Filter, "a sap.ui.model.Filter instance is used");

        this.oController.onSearch({ getParameter: this.sandbox.stub().returns("") });
        assert.deepEqual(oFilterStub.secondCall.args[0], [], "an empty query clears the filter");
    });

    QUnit.test("openAddProductDialog delegates to the dialog handler", function (assert) {
        this.oController.openAddProductDialog();
        assert.ok(this.oDialogHandler._openAddProductDialog.calledOnce, "_openAddProductDialog was invoked once");
    });

    QUnit.test("closeAddProductDialog delegates to the dialog handler", function (assert) {
        this.oController.closeAddProductDialog();
        assert.ok(this.oDialogHandler._closeAddProductDialog.calledOnce, "_closeAddProductDialog was invoked once");
    });

    QUnit.test("openEditProductDialog delegates to the dialog handler", function (assert) {
        this.oController.openEditProductDialog();
        assert.ok(this.oDialogHandler._openEditProductDialog.calledOnce, "_openEditProductDialog was invoked once");
    });

    QUnit.test("closeEditProductDialog delegates to the dialog handler", function (assert) {
        this.oController.closeEditProductDialog();
        assert.ok(this.oDialogHandler._closeEditProductDialog.calledOnce, "_closeEditProductDialog was invoked once");
    });

    QUnit.test("openCartDialog only opens the dialog when the company selection is valid", async function (assert) {
        this.oController._validateCompanieselection = this.sandbox.stub().returns(false);
        await this.oController.openCartDialog();
        assert.ok(this.oDialogHandler._openCartDialog.notCalled, "the dialog is not opened for an invalid company selection");

        this.oController._validateCompanieselection.returns(true);
        await this.oController.openCartDialog();
        assert.ok(this.oDialogHandler._openCartDialog.calledOnce, "the dialog is opened for a valid company selection");
    });

    QUnit.test("closeCartDialog delegates to the dialog handler", function (assert) {
        this.oController.closeCartDialog();
        assert.ok(this.oDialogHandler._closeCartDialog.calledOnce, "_closeCartDialog was invoked once");
    });
});
