import Shop from "cap_try_ts/controller/Shop.controller";
import ProductService from "cap_try_ts/service/ProductService";
import CartService from "cap_try_ts/service/CartService";
import FileService from "cap_try_ts/service/FileService";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import { URLHelper } from "sap/m/library";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";

QUnit.module("cap_try_ts.controller.Shop", {
    beforeEach: function (this: any) {
        this.oSandbox = sinon.sandbox.create();
        this.oController = new Shop("Shop");
    },
    afterEach: function (this: any) {
        if (this.oController && typeof this.oController.destroy === "function") {
            this.oController.destroy();
        }
        this.oSandbox.restore();
    }
});

QUnit.test("onInit calls _onControllerLoad and attaches the Shop route pattern matched handler", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    const oRoute = { attachPatternMatched: oSandbox.spy(), detachPatternMatched: oSandbox.spy() };
    const oRouter = { getRoute: oSandbox.stub().withArgs("Shop").returns(oRoute) };

    const oControllerLoadStub = oSandbox.stub(oAny, "_onControllerLoad");
    oSandbox.stub(oController as any, "getRouter").returns(oRouter as any);

    oController.onInit();

    assert.ok(oControllerLoadStub.calledOnce, "_onControllerLoad was called once");
    assert.ok(oRoute.attachPatternMatched.calledWith(oAny._onObjectMatched, oController), "attachPatternMatched called with handler and context");
});

QUnit.test("onExit detaches the Shop route pattern matched handler", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    const oRoute = { attachPatternMatched: oSandbox.spy(), detachPatternMatched: oSandbox.spy() };
    const oRouter = { getRoute: oSandbox.stub().withArgs("Shop").returns(oRoute) };
    oSandbox.stub(oController as any, "getRouter").returns(oRouter as any);

    oController.onExit();

    assert.ok(oRoute.detachPatternMatched.calledWith(oAny._onObjectMatched, oController), "detachPatternMatched called with handler and context");
});

QUnit.test("onDownloadTemplatePress redirects to the download template URL", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    oSandbox.stub(oController as any, "getModel").returns({ getServiceUrl: () => "/shop/" } as any);
    const oRedirectStub = oSandbox.stub(URLHelper, "redirect");

    oController.onDownloadTemplatePress();

    assert.ok(oRedirectStub.calledOnce, "URLHelper.redirect was called once");
    assert.strictEqual(oRedirectStub.firstCall.args[0], "/shop/downloadExcelTemplate()/$value", "correct URL passed");
    assert.strictEqual(oRedirectStub.firstCall.args[1], true, "opens in a new window");
});

QUnit.test("onUploadTemplatePress delegates to FileService.read with a bound ProductService.createBatch callback", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oReadStub = oSandbox.stub(FileService, "read");
    const oEvent = {} as any;

    oController.onUploadTemplatePress(oEvent);

    assert.ok(oReadStub.calledOnce, "FileService.read called once");
    assert.strictEqual(oReadStub.firstCall.args[0], oController, "controller instance passed");
    assert.strictEqual(oReadStub.firstCall.args[1], oEvent, "event passed through");
    assert.strictEqual(typeof oReadStub.firstCall.args[2], "function", "bound callback passed");
});

QUnit.test("onFinalizePurchasePress shows a message when no cart is selected", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    oSandbox.stub(oController as any, "getProp").returns({});
    oSandbox.stub(oController as any, "getI18nText").returns("select a cart first");
    const oToastStub = oSandbox.stub(MessageToast, "show");
    const oFinalizeStub = oSandbox.stub(CartService, "finalize");

    oController.onFinalizePurchasePress();

    assert.ok(oToastStub.calledWith("select a cart first"), "MessageToast shown for missing selection");
    assert.ok(oFinalizeStub.notCalled, "CartService.finalize not called");
});

QUnit.test("onFinalizePurchasePress finalizes the selected cart", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oSelectedCart = { getObject: () => ({ ID: "cart-1" }) };
    oSandbox.stub(oController as any, "getProp").returns(oSelectedCart);
    const oFinalizeStub = oSandbox.stub(CartService, "finalize");

    oController.onFinalizePurchasePress();

    assert.ok(oFinalizeStub.calledWith(oController, "cart-1"), "CartService.finalize called with controller and cart ID");
});

QUnit.test("onAddCartButtonPress creates a cart for the selected company", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    oSandbox.stub(oController as any, "getProp").returns({ ID: "comp-1" });
    const oCreateStub = oSandbox.stub(CartService, "create");

    oController.onAddCartButtonPress();

    assert.ok(oCreateStub.calledWith(oController, "comp-1"), "CartService.create called with controller and company ID");
});

QUnit.test("onEditProductPress stores the selected product and opens the edit dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oBindingContext = { getObject: () => ({ name: "Product 1" }) };
    const oSource = { getBindingContext: () => oBindingContext };
    const oEvent = { getSource: () => oSource } as any;

    const oSetPropStub = oSandbox.stub(oController as any, "setProp");
    const oRefreshStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getModel").returns({ refresh: oRefreshStub } as any);
    const oOpenEditStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _openEditProductDialog: oOpenEditStub } as any);

    oController.onEditProductPress(oEvent);

    assert.ok(oSetPropStub.calledOnce, "setProp called once");
    assert.strictEqual(oSetPropStub.firstCall.args[0], "globalModel", "correct model name");
    assert.strictEqual(oSetPropStub.firstCall.args[1], "/selectedProduct", "correct path");
    assert.strictEqual((oSetPropStub.firstCall.args[2] as any).name, "Product 1", "product name preserved");
    assert.strictEqual((oSetPropStub.firstCall.args[2] as any).metadata, oBindingContext, "binding context stored as metadata");
    assert.ok(oRefreshStub.calledWith(true), "globalModel refreshed");
    assert.ok(oOpenEditStub.calledOnce, "edit product dialog opened");
});

QUnit.test("onEditProduct edits the selected product and closes the dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oSelectedProduct = { name: "Product 1" };
    oSandbox.stub(oController as any, "getProp").returns(oSelectedProduct);
    const oEditStub = oSandbox.stub(ProductService, "edit");
    const oCloseStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _closeEditProductDialog: oCloseStub } as any);

    oController.onEditProduct();

    assert.ok(oEditStub.calledWith(oController, oSelectedProduct), "ProductService.edit called with the selected product");
    assert.ok(oCloseStub.calledOnce, "edit product dialog closed");
});

QUnit.test("onDeleteProductPress asks for confirmation and deletes the product on confirm", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oBindingContext = { getObject: () => ({ name: "Product 1" }) };
    const oSource = { getBindingContext: () => oBindingContext };
    const oEvent = { getSource: () => oSource } as any;

    const oView = { setBusy: oSandbox.spy() };
    oSandbox.stub(oController as any, "getView").returns(oView as any);
    oSandbox.stub(oController as any, "getI18nText").returns("Delete Product 1?");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(ProductService, "delete").returns(Promise.resolve());

    return oController.onDeleteProductPress(oEvent).then(async () => {
        assert.ok(oConfirmStub.calledOnce, "MessageBox.confirm was called");
        const oOptions = oConfirmStub.firstCall.args[1];
        await oOptions.onClose(MessageBox.Action.YES);
        assert.ok(oView.setBusy.calledWith(true), "view busy set to true");
        assert.ok(oDeleteStub.calledWith(oController, oBindingContext), "ProductService.delete called with the binding context");
        assert.ok(oView.setBusy.calledWith(false), "view busy set to false");
    });
});

QUnit.test("onDeleteMultiplesProductsPress deletes all selected products on confirm", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const aContexts = [{ getObject: () => ({ name: "P1" }) }, { getObject: () => ({ name: "P2" }) }];
    const oProductsTable = { getSelectedContexts: () => aContexts };
    const oView = { setBusy: oSandbox.spy(), byId: oSandbox.stub().withArgs("productsWorklist").returns(oProductsTable) };
    oSandbox.stub(oController as any, "getView").returns(oView as any);
    oSandbox.stub(oController as any, "getI18nText").returns("Delete selected products?");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(ProductService, "delete").returns(Promise.resolve());

    return oController.onDeleteMultiplesProductsPress().then(async () => {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        const oOptions = oConfirmStub.firstCall.args[1];
        await oOptions.onClose(MessageBox.Action.YES);
        assert.ok(oDeleteStub.calledWith(oController, aContexts), "ProductService.delete called with all selected contexts");
        assert.ok(oView.setBusy.calledWith(true) && oView.setBusy.calledWith(false), "view busy toggled");
    });
});

QUnit.test("onDeleteCartItemPress asks for confirmation and deletes the cart item on confirm", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oBindingContext = { getObject: () => ({ name: "Item 1" }) };
    const oSource = { getBindingContext: () => oBindingContext };
    const oEvent = { getSource: () => oSource } as any;

    oSandbox.stub(oController as any, "getI18nText").returns("Delete Item 1?");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteItemStub = oSandbox.stub(CartService, "deleteItem").returns(Promise.resolve());

    return oController.onDeleteCartItemPress(oEvent).then(async () => {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        const oOptions = oConfirmStub.firstCall.args[1];
        await oOptions.onClose(MessageBox.Action.YES);
        assert.ok(oDeleteItemStub.calledWith(oController, oBindingContext), "CartService.deleteItem called with the binding context");
    });
});

QUnit.test("onDeleteMultipleCartItemPress deletes all selected cart items on confirm", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oContext0 = { getObject: () => ({ name: "Item 0" }) };
    const oContext1 = { getObject: () => ({ name: "Item 1" }) };
    const oCartTable = {
        getSelectedIndices: () => [0, 1],
        getContextByIndex: (i: number) => (i === 0 ? oContext0 : oContext1)
    };
    const oView = { getId: () => "view-1" };
    oSandbox.stub(oController as any, "getView").returns(oView as any);
    oSandbox.stub(Fragment, "byId").withArgs("view-1", "cartTable").returns(oCartTable as any);
    oSandbox.stub(oController as any, "getI18nText").returns("Delete selected items?");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteItemStub = oSandbox.stub(CartService, "deleteItem").returns(Promise.resolve());

    return oController.onDeleteMultipleCartItemPress().then(async () => {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        const oOptions = oConfirmStub.firstCall.args[1];
        await oOptions.onClose(MessageBox.Action.YES);
        assert.ok(oDeleteItemStub.calledWith(oController, [oContext0, oContext1]), "CartService.deleteItem called with all selected contexts");
    });
});

QUnit.test("onDeleteSelectedCartPress deletes the selected cart on confirm", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oSelectedCart = { name: "Cart 1", ID: "cart-1" };
    oSandbox.stub(oController as any, "getProp").returns(oSelectedCart);
    oSandbox.stub(oController as any, "getI18nText").returns("Delete Cart 1?");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(CartService, "delete").returns(Promise.resolve());

    return oController.onDeleteSelectedCartPress().then(async () => {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        const oOptions = oConfirmStub.firstCall.args[1];
        await oOptions.onClose(MessageBox.Action.YES);
        assert.ok(oDeleteStub.calledWith(oController, oSelectedCart), "CartService.delete called with the selected cart");
    });
});

QUnit.test("addProductCart adds selected products to an existing cart", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    const oSelectedCart = { ID: "cart-1" };
    const oGetPropStub = oSandbox.stub(oController as any, "getProp");
    oGetPropStub.withArgs("globalModel", "/selectedCart").returns(oSelectedCart);
    oGetPropStub.withArgs("globalModel", "/selectedCompany").returns({ ID: "comp-1" });

    const aSelectedProducts = [
        { getBindingContext: () => ({ getObject: () => ({ ID: "p1" }) }) },
        { getBindingContext: () => ({ getObject: () => ({ ID: "p2" }) }) }
    ];
    const oRemoveSelectionsStub = oSandbox.spy();
    const oTable = { getSelectedItems: () => aSelectedProducts, removeSelections: oRemoveSelectionsStub };
    oSandbox.stub(oController as any, "getView").returns({ byId: oSandbox.stub().withArgs("productsWorklist").returns(oTable) } as any);

    oSandbox.stub(oAny, "_validateCompanieselection").returns(true);
    const oAddProductsStub = oSandbox.stub(CartService, "addProducts").returns(Promise.resolve());

    return oController.addProductCart().then(() => {
        assert.ok(oAddProductsStub.calledWith(oController, ["p1", "p2"]), "CartService.addProducts called with selected product IDs");
        assert.ok(oRemoveSelectionsStub.calledOnce, "table selections cleared");
    });
});

QUnit.test("onCartsSelectChange stores the selected cart context and rebinds the cart fragment", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oBindingContext = {};
    const oSelectedItem = { getBindingContext: () => oBindingContext };
    const oEvent = { getParameter: (s: string) => (s === "selectedItem" ? oSelectedItem : undefined) } as any;

    const oSetPropStub = oSandbox.stub(oController as any, "setProp");
    const oRefreshStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getModel").returns({ refresh: oRefreshStub } as any);
    const oBindStub = oSandbox.stub(CartService, "bindDataToFragment");

    oController.onCartsSelectChange(oEvent);

    assert.ok(oSetPropStub.calledWith("globalModel", "/selectedCart", oBindingContext), "selected cart stored");
    assert.ok(oRefreshStub.calledWith(true), "globalModel refreshed");
    assert.ok(oBindStub.calledWith(oController), "CartService.bindDataToFragment called");
});

QUnit.test("onCreateButtonPress creates a product when all fields are filled", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oGetPropStub = oSandbox.stub(oController as any, "getProp");
    oGetPropStub.withArgs("globalModel", "/product").returns({ name: "N", description: "D", price: 10, stock_min: 1, stock: 5 });
    oGetPropStub.withArgs("globalModel", "/selectedCompany").returns({ ID: "comp-1" });

    const oView = { setBusy: oSandbox.spy() };
    oSandbox.stub(oController as any, "getView").returns(oView as any);
    const oCreateStub = oSandbox.stub(ProductService, "create").returns(Promise.resolve());

    return oController.onCreateButtonPress().then(() => {
        assert.ok(oCreateStub.calledWith(oController, { name: "N", description: "D", company_ID: "comp-1", price: 10, stock_min: 1, stock: 5 }), "ProductService.create called with the assembled payload");
        assert.ok(oView.setBusy.calledWith(true), "view busy set to true");
        assert.ok(oView.setBusy.calledWith(false), "view busy set to false");
    });
});

QUnit.test("onCompanyCancelPress clears the selected company and unbinds the Company element", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oSetPropStub = oSandbox.stub(oController as any, "setProp");
    const oUnbindStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getView").returns({ unbindElement: oUnbindStub } as any);
    const oRefreshStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getModel").returns({ refresh: oRefreshStub } as any);

    oController.onCompanyCancelPress();

    assert.ok(oSetPropStub.calledWith("globalModel", "/selectedCompany", {}), "selected company cleared");
    assert.ok(oUnbindStub.calledWith("/Company"), "Company element unbound");
    assert.ok(oRefreshStub.calledWith(true), "globalModel refreshed");
});

QUnit.test("onCompanyChange loads the selected company and resets cart state", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    const oView = { setBusy: oSandbox.spy() };
    oSandbox.stub(oController as any, "getView").returns(oView as any);

    const oSetValueStateStub = oSandbox.spy();
    const oSource = { setValueState: oSetValueStateStub, getSelectedKey: () => "comp-1" };
    const oEvent = { getSource: () => oSource } as any;

    const oCompanyContext = { ID: "comp-1", name: "Company 1" };
    const oGetEntityContextsStub = oSandbox.stub(oAny, "_getEntityContexts").returns(Promise.resolve(oCompanyContext));
    const oSetPropStub = oSandbox.stub(oController as any, "setProp");
    const oRefreshStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getModel").returns({ refresh: oRefreshStub } as any);
    const oLoadByCompanyStub = oSandbox.stub(ProductService, "loadByCompany");
    const oAssignOnCompanyLoadStub = oSandbox.stub(CartService, "assignOnCompanyLoad");

    return oController.onCompanyChange(oEvent).then(() => {
        assert.ok(oView.setBusy.calledWith(true), "view set busy");
        assert.ok(oSetValueStateStub.calledWith("None"), "value state reset");
        assert.ok(oGetEntityContextsStub.calledWith("/Company", "comp-1"), "company entity context requested");
        assert.ok(oSetPropStub.calledWith("globalModel", "/selectedCompany", oCompanyContext), "selected company stored");
        assert.ok(oSetPropStub.calledWith("globalModel", "/selectedCart", {}), "selected cart reset");
        assert.ok(oSetPropStub.calledWith("globalModel", "/cartItemsQuantity", 0), "cart items quantity reset");
        assert.ok(oSetPropStub.calledWith("globalModel", "/cart", []), "cart reset");
        assert.ok(oRefreshStub.calledWith(true), "globalModel refreshed");
        assert.ok(oLoadByCompanyStub.calledWith(oController), "products reloaded for the company");
        assert.ok(oAssignOnCompanyLoadStub.calledWith(oController), "cart assigned on company load");
    });
});

QUnit.test("onProductCartQuantityChangePress updates the quantity and refreshes the footer context", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oSetPropertyStub = oSandbox.spy();
    const oContext = { setProperty: oSetPropertyStub };
    const oSource = { getBindingContext: () => oContext };
    const oEvent = { getParameter: (s: string) => (s === "value" ? 3 : undefined), getSource: () => oSource } as any;

    oSandbox.stub(oController as any, "getView").returns({ getId: () => "view-1" } as any);
    const oFooterRefreshStub = oSandbox.spy();
    const oFooterContext = { refresh: oFooterRefreshStub };
    const oFooterControl = { getBindingContext: () => oFooterContext };
    oSandbox.stub(Fragment, "byId").withArgs("view-1", "cartTableFooter").returns(oFooterControl as any);

    oController.onProductCartQuantityChangePress(oEvent);

    assert.ok(oSetPropertyStub.calledWith("quantity", 3), "quantity property updated on the item context");
    assert.ok(oFooterRefreshStub.calledOnce, "footer context refreshed");
});

QUnit.test("onSearch filters the products table by the search query", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oFilterStub = oSandbox.spy();
    const oBinding = { filter: oFilterStub };
    const oProductsTable = { getBinding: oSandbox.stub().withArgs("items").returns(oBinding) };
    oSandbox.stub(oController as any, "getView").returns({ byId: oSandbox.stub().withArgs("productsWorklist").returns(oProductsTable) } as any);

    const oEvent = { getParameter: (s: string) => (s === "newValue" ? "abc" : undefined) } as any;

    oController.onSearch(oEvent);

    assert.ok(oFilterStub.calledOnce, "binding filter applied");
    const aFilters = oFilterStub.firstCall.args[0];
    assert.strictEqual(aFilters.length, 1, "one filter applied");
    assert.ok(aFilters[0] instanceof Filter, "a Filter instance was created");
});

QUnit.test("openAddProductDialog opens the add product dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oOpenStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _openAddProductDialog: oOpenStub } as any);

    oController.openAddProductDialog();

    assert.ok(oOpenStub.calledOnce, "add product dialog opened");
});

QUnit.test("closeAddProductDialog closes the add product dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oCloseStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _closeAddProductDialog: oCloseStub } as any);

    oController.closeAddProductDialog();

    assert.ok(oCloseStub.calledOnce, "add product dialog closed");
});

QUnit.test("openEditProductDialog opens the edit product dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oOpenStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _openEditProductDialog: oOpenStub } as any);

    oController.openEditProductDialog();

    assert.ok(oOpenStub.calledOnce, "edit product dialog opened");
});

QUnit.test("closeEditProductDialog closes the edit product dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oCloseStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _closeEditProductDialog: oCloseStub } as any);

    oController.closeEditProductDialog();

    assert.ok(oCloseStub.calledOnce, "edit product dialog closed");
});

QUnit.test("openCartDialog opens the cart dialog when the company selection is valid", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    oSandbox.stub(oAny, "_validateCompanieselection").returns(true);
    const oOpenCartDialogStub = oSandbox.stub().returns(Promise.resolve());
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _openCartDialog: oOpenCartDialogStub } as any);

    return oController.openCartDialog().then(() => {
        assert.ok(oOpenCartDialogStub.calledOnce, "cart dialog opened");
    });
});

QUnit.test("openCartDialog does not open the cart dialog when the company selection is invalid", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;
    const oAny = oController as any;

    oSandbox.stub(oAny, "_validateCompanieselection").returns(false);
    const oOpenCartDialogStub = oSandbox.stub().returns(Promise.resolve());
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _openCartDialog: oOpenCartDialogStub } as any);

    const vResult = oController.openCartDialog();

    assert.ok(oOpenCartDialogStub.notCalled, "cart dialog not opened when validation fails");
    assert.strictEqual(vResult, undefined, "method returns undefined when validation fails");
});

QUnit.test("closeCartDialog closes the cart dialog", function (this: any, assert: any) {
    const oController = this.oController;
    const oSandbox = this.oSandbox;

    const oCloseStub = oSandbox.spy();
    oSandbox.stub(oController as any, "getDialogHandler").returns({ _closeCartDialog: oCloseStub } as any);

    oController.closeCartDialog();

    assert.ok(oCloseStub.calledOnce, "cart dialog closed");
});
