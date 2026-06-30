import Shop from "cap_try_ts/controller/Shop.controller";
import ProductService from "cap_try_ts/service/ProductService";
import CartService from "cap_try_ts/service/CartService";
import FileService from "cap_try_ts/service/FileService";
import Fragment from "sap/ui/core/Fragment";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import { URLHelper } from "sap/m/library";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";

let sandbox: any;
let oController: any;

QUnit.module("Shop.controller", {
    beforeEach: function () {
        sandbox = sinon.sandbox.create();
        oController = new Shop("Shop");
        sandbox.stub(oController, "getI18nText").returns("text");
    },
    afterEach: function () {
        sandbox.restore();
        oController.destroy();
    }
});

QUnit.test("onInit attaches the pattern matched handler", function (assert) {
    const fnAttach = sandbox.stub();
    const oRoute = { attachPatternMatched: fnAttach };
    sandbox.stub(oController, "_onControllerLoad");
    sandbox.stub(oController, "getRouter").returns({ getRoute: sandbox.stub().returns(oRoute) });

    oController.onInit();

    assert.ok(oController._onControllerLoad.calledOnce, "controller load was invoked");
    assert.ok(fnAttach.calledOnce, "pattern matched handler was attached");
});

QUnit.test("onExit detaches the pattern matched handler", function (assert) {
    const fnDetach = sandbox.stub();
    const oRoute = { detachPatternMatched: fnDetach };
    sandbox.stub(oController, "getRouter").returns({ getRoute: sandbox.stub().returns(oRoute) });

    oController.onExit();

    assert.ok(fnDetach.calledOnce, "pattern matched handler was detached");
});

QUnit.test("onDownloadTemplatePress redirects to the template url", function (assert) {
    sandbox.stub(oController, "getModel").returns({ getServiceUrl: sandbox.stub().returns("/shop/") });
    const oRedirect = sandbox.stub(URLHelper, "redirect");

    oController.onDownloadTemplatePress();

    assert.ok(oRedirect.calledOnce, "redirect was called once");
    assert.ok(oRedirect.getCall(0).args[0].indexOf("downloadExcelTemplate()/$value") !== -1, "url contains the template path");
});

QUnit.test("onUploadTemplatePress delegates to FileService.read", function (assert) {
    const oRead = sandbox.stub(FileService, "read");
    const oEvent: any = {};

    oController.onUploadTemplatePress(oEvent);

    assert.ok(oRead.calledOnce, "FileService.read was called");
    assert.strictEqual(oRead.getCall(0).args[0], oController, "controller instance was passed");
});

QUnit.test("onFinalizePurchasePress finalizes the selected cart", function (assert) {
    const oCart = { getObject: sandbox.stub().returns({ ID: "cart1" }), ID: "x" };
    sandbox.stub(oController, "getProp").returns(oCart);
    const oFinalize = sandbox.stub(CartService, "finalize");

    oController.onFinalizePurchasePress();

    assert.ok(oFinalize.calledOnce, "CartService.finalize was called");
    assert.strictEqual(oFinalize.getCall(0).args[1], "cart1", "the cart id was passed");
});

QUnit.test("onAddCartButtonPress creates a cart for the selected company", function (assert) {
    sandbox.stub(oController, "getProp").returns({ ID: "comp1" });
    const oCreate = sandbox.stub(CartService, "create");

    oController.onAddCartButtonPress();

    assert.ok(oCreate.calledOnce, "CartService.create was called");
    assert.strictEqual(oCreate.getCall(0).args[1], "comp1", "the company id was passed");
});

QUnit.test("onEditProductPress stores the product and opens the edit dialog", function (assert) {
    const oCtx = { getObject: sandbox.stub().returns({ name: "P" }) };
    const oSource = { getBindingContext: sandbox.stub().returns(oCtx) };
    const oEvent: any = { getSource: () => oSource };
    const oSetProp = sandbox.stub(oController, "setProp");
    sandbox.stub(oController, "getModel").returns({ refresh: sandbox.stub() });
    const oOpen = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _openEditProductDialog: oOpen });

    oController.onEditProductPress(oEvent);

    assert.ok(oSetProp.calledWith("globalModel", "/selectedProduct"), "selected product was stored");
    assert.ok(oOpen.calledOnce, "edit product dialog was opened");
});

QUnit.test("onEditProduct edits the product and closes the dialog", function (assert) {
    sandbox.stub(oController, "getProp").returns({ name: "P" });
    const oEdit = sandbox.stub(ProductService, "edit");
    const oClose = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _closeEditProductDialog: oClose });

    oController.onEditProduct();

    assert.ok(oEdit.calledOnce, "ProductService.edit was called");
    assert.ok(oClose.calledOnce, "edit product dialog was closed");
});

QUnit.test("onDeleteProductPress asks for delete confirmation", async function (assert) {
    const oCtx = { getObject: sandbox.stub().returns({ name: "P" }) };
    const oSource = { getBindingContext: sandbox.stub().returns(oCtx) };
    const oEvent: any = { getSource: () => oSource };
    sandbox.stub(oController, "getView").returns({ setBusy: sandbox.stub() });
    const oConfirm = sandbox.stub(MessageBox, "confirm");

    await oController.onDeleteProductPress(oEvent);

    assert.ok(oConfirm.calledOnce, "confirmation was requested");
});

QUnit.test("onDeleteMultiplesProductsPress warns when nothing is selected", async function (assert) {
    const oTable = { getSelectedContexts: sandbox.stub().returns([]) };
    sandbox.stub(oController, "getView").returns({ setBusy: sandbox.stub(), byId: sandbox.stub().returns(oTable) });
    const oToast = sandbox.stub(MessageToast, "show");

    await oController.onDeleteMultiplesProductsPress();

    assert.ok(oToast.calledOnce, "a toast was shown for the empty selection");
});

QUnit.test("onDeleteCartItemPress asks for delete confirmation", async function (assert) {
    const oCtx = { getObject: sandbox.stub().returns({ name: "Item" }) };
    const oSource = { getBindingContext: sandbox.stub().returns(oCtx) };
    const oEvent: any = { getSource: () => oSource };
    const oConfirm = sandbox.stub(MessageBox, "confirm");

    await oController.onDeleteCartItemPress(oEvent);

    assert.ok(oConfirm.calledOnce, "confirmation was requested");
});

QUnit.test("onDeleteMultipleCartItemPress warns when nothing is selected", async function (assert) {
    sandbox.stub(oController, "getView").returns({ getId: sandbox.stub().returns("view") });
    const oCartTable = { getSelectedIndices: sandbox.stub().returns([]) };
    sandbox.stub(Fragment, "byId").returns(oCartTable);
    const oToast = sandbox.stub(MessageToast, "show");

    await oController.onDeleteMultipleCartItemPress();

    assert.ok(oToast.calledOnce, "a toast was shown for the empty selection");
});

QUnit.test("onDeleteSelectedCartPress warns when no cart is selected", async function (assert) {
    sandbox.stub(oController, "getProp").returns({});
    const oToast = sandbox.stub(MessageToast, "show");

    await oController.onDeleteSelectedCartPress();

    assert.ok(oToast.calledOnce, "a toast was shown when no cart is selected");
});

QUnit.test("addProductCart warns when no products are selected", async function (assert) {
    const oTable = { getSelectedItems: sandbox.stub().returns([]) };
    sandbox.stub(oController, "getView").returns({ byId: sandbox.stub().returns(oTable) });
    const oGetProp = sandbox.stub(oController, "getProp");
    oGetProp.withArgs("globalModel", "/selectedCart").returns({});
    oGetProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "c1" });
    const oAddMessage = sandbox.stub(oController, "_addMessage");
    const oToast = sandbox.stub(MessageToast, "show");

    await oController.addProductCart();

    assert.ok(oToast.calledOnce, "a toast was shown");
    assert.ok(oAddMessage.calledOnce, "a warning message was added");
});

QUnit.test("onCartsSelectChange stores the selected cart and binds data", function (assert) {
    const oCtx = { id: "ctx" };
    const oSelectedItem = { getBindingContext: sandbox.stub().returns(oCtx) };
    const oEvent: any = { getParameter: sandbox.stub().returns(oSelectedItem) };
    const oSetProp = sandbox.stub(oController, "setProp");
    sandbox.stub(oController, "getModel").returns({ refresh: sandbox.stub() });
    const oBind = sandbox.stub(CartService, "bindDataToFragment");

    oController.onCartsSelectChange(oEvent);

    assert.ok(oSetProp.calledWith("globalModel", "/selectedCart", oCtx), "the selected cart was stored");
    assert.ok(oBind.calledOnce, "data was bound to the fragment");
});

QUnit.test("onCreateButtonPress creates a product with the form data", async function (assert) {
    const oGetProp = sandbox.stub(oController, "getProp");
    oGetProp.withArgs("globalModel", "/product").returns({ name: "P", description: "D", price: 5, stock_min: 1, stock: 10 });
    oGetProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "c1" });
    sandbox.stub(oController, "getView").returns({ setBusy: sandbox.stub() });
    const oCreate = sandbox.stub(ProductService, "create").returns(Promise.resolve());

    await oController.onCreateButtonPress();

    assert.ok(oCreate.calledOnce, "ProductService.create was called");
    assert.strictEqual(oCreate.getCall(0).args[1].company_ID, "c1", "the company id was included");
});

QUnit.test("onCompanyCancelPress clears the selected company", function (assert) {
    const oSetProp = sandbox.stub(oController, "setProp");
    const oUnbind = sandbox.stub();
    sandbox.stub(oController, "getView").returns({ unbindElement: oUnbind });
    sandbox.stub(oController, "getModel").returns({ refresh: sandbox.stub() });

    oController.onCompanyCancelPress();

    assert.ok(oSetProp.calledWith("globalModel", "/selectedCompany", {}), "the selected company was cleared");
    assert.ok(oUnbind.calledOnce, "the element binding was removed");
});

QUnit.test("onCompanyChange loads the company data", async function (assert) {
    const oSource = { setValueState: sandbox.stub(), getSelectedKey: sandbox.stub().returns("k1") };
    const oEvent: any = { getSource: () => oSource };
    sandbox.stub(oController, "getView").returns({ setBusy: sandbox.stub() });
    sandbox.stub(oController, "_getEntityContexts").returns(Promise.resolve({ ID: "c1" }));
    const oSetProp = sandbox.stub(oController, "setProp");
    sandbox.stub(oController, "getModel").returns({ refresh: sandbox.stub() });
    const oLoad = sandbox.stub(ProductService, "loadByCompany");
    const oAssign = sandbox.stub(CartService, "assignOnCompanyLoad");

    await oController.onCompanyChange(oEvent);

    assert.ok(oLoad.calledOnce, "products were loaded by company");
    assert.ok(oAssign.calledOnce, "the cart was assigned on company load");
    assert.ok(oSetProp.calledWith("globalModel", "/selectedCompany", { ID: "c1" }), "the company was stored");
});

QUnit.test("onProductCartQuantityChangePress updates the quantity on the context", function (assert) {
    const oSetProperty = sandbox.stub();
    const oCtx = { setProperty: oSetProperty };
    const oSource = { getBindingContext: sandbox.stub().returns(oCtx) };
    const oEvent: any = { getParameter: sandbox.stub().returns(3), getSource: () => oSource };
    sandbox.stub(oController, "getView").returns({ getId: sandbox.stub().returns("view") });
    sandbox.stub(Fragment, "byId").returns(null);

    oController.onProductCartQuantityChangePress(oEvent);

    assert.ok(oSetProperty.calledWith("quantity", 3), "the quantity was updated");
});

QUnit.test("onSearch filters the product list by query", function (assert) {
    const oFilter = sandbox.stub();
    const oBinding = { filter: oFilter };
    const oTable = { getBinding: sandbox.stub().returns(oBinding) };
    sandbox.stub(oController, "getView").returns({ byId: sandbox.stub().returns(oTable) });
    const oEvent: any = { getParameter: sandbox.stub().returns("phone") };

    oController.onSearch(oEvent);

    assert.ok(oFilter.calledOnce, "the binding was filtered");
    assert.strictEqual(oFilter.getCall(0).args[0].length, 1, "one filter was applied");
});

QUnit.test("openAddProductDialog opens the add product dialog", function (assert) {
    const oOpen = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _openAddProductDialog: oOpen });

    oController.openAddProductDialog();

    assert.ok(oOpen.calledOnce, "add product dialog was opened");
});

QUnit.test("closeAddProductDialog closes the add product dialog", function (assert) {
    const oClose = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _closeAddProductDialog: oClose });

    oController.closeAddProductDialog();

    assert.ok(oClose.calledOnce, "add product dialog was closed");
});

QUnit.test("openEditProductDialog opens the edit product dialog", function (assert) {
    const oOpen = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _openEditProductDialog: oOpen });

    oController.openEditProductDialog();

    assert.ok(oOpen.calledOnce, "edit product dialog was opened");
});

QUnit.test("closeEditProductDialog closes the edit product dialog", function (assert) {
    const oClose = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _closeEditProductDialog: oClose });

    oController.closeEditProductDialog();

    assert.ok(oClose.calledOnce, "edit product dialog was closed");
});

QUnit.test("openCartDialog opens the cart dialog when the company is valid", async function (assert) {
    sandbox.stub(oController, "_validateCompanieselection").returns(true);
    const oOpen = sandbox.stub().returns(Promise.resolve());
    sandbox.stub(oController, "getDialogHandler").returns({ _openCartDialog: oOpen });

    await oController.openCartDialog();

    assert.ok(oOpen.calledOnce, "cart dialog was opened");
});

QUnit.test("closeCartDialog closes the cart dialog", function (assert) {
    const oClose = sandbox.stub();
    sandbox.stub(oController, "getDialogHandler").returns({ _closeCartDialog: oClose });

    oController.closeCartDialog();

    assert.ok(oClose.calledOnce, "cart dialog was closed");
});
