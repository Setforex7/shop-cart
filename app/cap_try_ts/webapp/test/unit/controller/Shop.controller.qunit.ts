// @ts-ignore -- the bundled sinon module ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import Shop from "cap_try_ts/controller/Shop.controller";
import ProductService from "cap_try_ts/service/ProductService";
import CartService from "cap_try_ts/service/CartService";
import FileService from "cap_try_ts/service/FileService";
import Fragment from "sap/ui/core/Fragment";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import { URLHelper } from "sap/m/library";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/m/Table";
import ComboBox from "sap/m/ComboBox";

type TestSandbox = {
    stub: (...args: unknown[]) => any;
    spy: (...args: unknown[]) => any;
    restore: () => void;
};

let oSandbox: TestSandbox;
let oController: Shop;
let oView: any;
let oGlobalModel: JSONModel;
let oProductsTable: Table;
let oCompanyComboBox: ComboBox;
let oDialogHandler: Record<string, any>;
let oRouteStub: Record<string, any>;
let oRouterStub: Record<string, any>;
let aAddedMessages: Array<Record<string, unknown>>;

function createContextStub(oData: Record<string, unknown>): any {
    return {
        getObject: function (): Record<string, unknown> { return oData; },
        setProperty: function (sPath: string, vValue: unknown): void { oData[sPath] = vValue; },
        refresh: function (): void { (oData as Record<string, unknown>).refreshed = true; }
    };
}

function createViewStub(): any {
    let bBusy = false;
    return {
        byId: function (sId: string): unknown {
            if (sId === "productsWorklist") { return oProductsTable; }
            if (sId === "companyComboBox") { return oCompanyComboBox; }
            return null;
        },
        setBusy: function (bValue: boolean): unknown { bBusy = bValue; return this; },
        getBusy: function (): boolean { return bBusy; },
        bindElement: function (): void { /* no-op */ },
        unbindElement: function (): void { /* no-op */ },
        getModel: function (): unknown { return oGlobalModel; },
        setModel: function (): void { /* no-op */ },
        addDependent: function (): void { /* no-op */ },
        removeDependent: function (): void { /* no-op */ },
        // Required by onDeleteMultipleCartItemPress (Fragment.byId(getId(), ...));
        // without it the call throws, the async method's promise rejects, and a
        // then()-only chain + assert.async hangs the whole suite.
        getId: function (): string { return "shopView"; },
        destroy: function (): void { /* no-op */ }
    };
}

function setup(): void {
    oSandbox = (sinon as any).sandbox.create() as TestSandbox;
    aAddedMessages = [];

    oGlobalModel = new JSONModel({
        selectedCart: {},
        selectedCompany: {},
        selectedProduct: {},
        product: {},
        cart: [],
        cartItemsQuantity: 0
    });

    oProductsTable = new Table("productsWorklist");
    oCompanyComboBox = new ComboBox("companyComboBox");
    oView = createViewStub();

    oDialogHandler = {
        _openAddProductDialog: (sinon as any).stub(),
        _closeAddProductDialog: (sinon as any).stub(),
        _openEditProductDialog: (sinon as any).stub(),
        _closeEditProductDialog: (sinon as any).stub(),
        _openCartDialog: (sinon as any).stub().returns(Promise.resolve()),
        _closeCartDialog: (sinon as any).stub()
    };

    oRouteStub = {
        attachPatternMatched: (sinon as any).stub(),
        detachPatternMatched: (sinon as any).stub()
    };
    oRouterStub = { getRoute: (sinon as any).stub().returns(oRouteStub) };

    oController = new Shop({} as any);
    (oController as any)._props = {};

    oSandbox.stub(oController, "getView").returns(oView);
    oSandbox.stub(oController, "getRouter").returns(oRouterStub);
    oSandbox.stub(oController, "getDialogHandler").returns(oDialogHandler);
    oSandbox.stub(oController, "getI18nText").returnsArg(0);

    oSandbox.stub(oController, "getModel").returns(oGlobalModel);
    oSandbox.stub(oController, "getProp", function (sModel: string, sPath: string): unknown {
        return oGlobalModel.getProperty(sPath);
    } as any);
    oSandbox.stub(oController, "setProp", function (sModel: string, sPath: string, vValue: unknown): void {
        oGlobalModel.setProperty(sPath, vValue);
    } as any);
    oSandbox.stub(oController, "_addMessage", function (oMessage: Record<string, unknown>): void {
        aAddedMessages.push(oMessage);
    } as any);
    oSandbox.stub(oController, "_onControllerLoad");
    oSandbox.stub(oController, "_getEntityContexts").returns(Promise.resolve({ ID: "C1", name: "ACME" }));
}

function teardown(): void {
    oSandbox.restore();
    oProductsTable.destroy();
    oCompanyComboBox.destroy();
    oGlobalModel.destroy();
    (oController as any).destroy?.();
}

QUnit.module("Shop.controller - lifecycle", { beforeEach: setup, afterEach: teardown });

QUnit.test("onInit attaches the pattern matched handler for the Shop route", function (assert) {
    oController.onInit();

    assert.ok((oController as any)._onControllerLoad.calledOnce, "controller load ran once");
    assert.ok(oRouterStub.getRoute.calledWith("Shop"), "the Shop route was resolved");
    assert.strictEqual(oRouteStub.attachPatternMatched.callCount, 1, "pattern matched attached once");
});

QUnit.test("onExit detaches the pattern matched handler", function (assert) {
    oController.onExit();

    assert.ok(oRouterStub.getRoute.calledWith("Shop"), "the Shop route was resolved");
    assert.strictEqual(oRouteStub.detachPatternMatched.callCount, 1, "pattern matched detached once");
});

QUnit.module("Shop.controller - excel template", { beforeEach: setup, afterEach: teardown });

QUnit.test("onDownloadTemplatePress redirects to the download service url", function (assert) {
    const oRedirectStub = oSandbox.stub(URLHelper, "redirect");
    (oController as any).getModel.restore();
    oSandbox.stub(oController, "getModel").returns({ getServiceUrl: function (): string { return "/shop/"; } });

    oController.onDownloadTemplatePress();

    assert.ok(oRedirectStub.calledOnce, "redirect was triggered once");
    assert.strictEqual(oRedirectStub.firstCall.args[0], "/shop/downloadExcelTemplate()/$value", "correct url");
    assert.strictEqual(oRedirectStub.firstCall.args[1], true, "opened in a new window");
});

QUnit.test("onUploadTemplatePress delegates the file to FileService.read", function (assert) {
    const oReadStub = oSandbox.stub(FileService, "read");
    const oEvent = {} as any;

    oController.onUploadTemplatePress(oEvent);

    assert.ok(oReadStub.calledOnce, "FileService.read called once");
    assert.strictEqual(oReadStub.firstCall.args[0], oController, "controller handed over");
    assert.strictEqual(oReadStub.firstCall.args[1], oEvent, "event handed over");
    assert.strictEqual(typeof oReadStub.firstCall.args[2], "function", "a batch callback is supplied");
});

QUnit.module("Shop.controller - cart", { beforeEach: setup, afterEach: teardown });

QUnit.test("onFinalizePurchasePress warns when no cart is selected", function (assert) {
    const oToastStub = oSandbox.stub(MessageToast, "show");
    const oFinalizeStub = oSandbox.stub(CartService, "finalize");

    oController.onFinalizePurchasePress();

    assert.ok(oToastStub.calledOnce, "a toast was shown");
    assert.strictEqual(oToastStub.firstCall.args[0], "finalize_cart_selection_missing", "correct text key");
    assert.strictEqual(oFinalizeStub.callCount, 0, "finalize was not called");
});

QUnit.test("onFinalizePurchasePress finalizes the selected cart", function (assert) {
    oSandbox.stub(MessageToast, "show");
    const oFinalizeStub = oSandbox.stub(CartService, "finalize");
    oGlobalModel.setProperty("/selectedCart", createContextStub({ ID: "CART-1" }));

    oController.onFinalizePurchasePress();

    assert.ok(oFinalizeStub.calledOnce, "finalize was called once");
    assert.strictEqual(oFinalizeStub.firstCall.args[1], "CART-1", "cart id forwarded");
});

QUnit.test("onAddCartButtonPress creates a cart for the selected company", function (assert) {
    const oCreateStub = oSandbox.stub(CartService, "create");
    oGlobalModel.setProperty("/selectedCompany", { ID: "C1" });

    oController.onAddCartButtonPress();

    assert.ok(oCreateStub.calledOnce, "create was called once");
    assert.strictEqual(oCreateStub.firstCall.args[1], "C1", "company id forwarded");
});

QUnit.test("onCartsSelectChange stores the selected cart and rebinds the fragment", function (assert) {
    const oBindStub = oSandbox.stub(CartService, "bindDataToFragment");
    const oContext = createContextStub({ ID: "CART-9" });
    const oSelectedItem = { getBindingContext: function (): unknown { return oContext; } };
    const oEvent = { getParameter: function (): unknown { return oSelectedItem; } } as any;

    oController.onCartsSelectChange(oEvent);

    assert.strictEqual(oGlobalModel.getProperty("/selectedCart"), oContext, "selected cart stored");
    assert.ok(oBindStub.calledOnce, "fragment rebound once");
});

QUnit.test("onCartsSelectChange ignores an empty selection", function (assert) {
    const oBindStub = oSandbox.stub(CartService, "bindDataToFragment");
    const oEvent = { getParameter: function (): unknown { return null; } } as any;

    oController.onCartsSelectChange(oEvent);

    assert.strictEqual(oBindStub.callCount, 0, "nothing was rebound");
    assert.deepEqual(oGlobalModel.getProperty("/selectedCart"), {}, "selection untouched");
});

QUnit.test("onDeleteSelectedCartPress warns when no cart is selected", function (assert) {
    const oToastStub = oSandbox.stub(MessageToast, "show");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");

    const oDone = assert.async();
    void oController.onDeleteSelectedCartPress().then(function () {
        assert.ok(oToastStub.calledOnce, "a toast was shown");
        assert.strictEqual(oConfirmStub.callCount, 0, "no confirmation dialog");
        oDone();
    });
});

QUnit.test("onDeleteSelectedCartPress deletes the cart after confirmation", function (assert) {
    oSandbox.stub(MessageToast, "show");
    const oDeleteStub = oSandbox.stub(CartService, "delete").returns(Promise.resolve());
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oCart = { ID: "CART-2", name: "My cart" };
    oGlobalModel.setProperty("/selectedCart", oCart);

    const oDone = assert.async();
    void oController.onDeleteSelectedCartPress().then(function () {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);
        assert.ok(oDeleteStub.calledOnce, "cart deleted on YES");
        assert.strictEqual(oDeleteStub.firstCall.args[1], oCart, "selected cart forwarded");
        oDone();
    });
});

QUnit.test("onDeleteCartItemPress asks for confirmation and deletes the item", function (assert) {
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteItemStub = oSandbox.stub(CartService, "deleteItem").returns(Promise.resolve());
    const oContext = createContextStub({ name: "Screw" });
    const oEvent = { getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; } } as any;

    const oDone = assert.async();
    void oController.onDeleteCartItemPress(oEvent).then(function () {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);
        assert.ok(oDeleteItemStub.calledOnce, "item deleted on YES");
        assert.strictEqual(oDeleteItemStub.firstCall.args[1], oContext, "item context forwarded");
        oDone();
    });
});

QUnit.test("onDeleteMultipleCartItemPress returns early when the cart table is missing", function (assert) {
    const oByIdStub = oSandbox.stub(Fragment, "byId").returns(null);
    const oToastStub = oSandbox.stub(MessageToast, "show");

    const oDone = assert.async();
    void oController.onDeleteMultipleCartItemPress().then(function () {
        assert.ok(oByIdStub.calledOnce, "fragment lookup attempted");
        assert.strictEqual(oToastStub.callCount, 0, "no toast shown");
        oDone();
    });
});

QUnit.test("onDeleteMultipleCartItemPress deletes every selected index", function (assert) {
    const oContextA = createContextStub({ name: "A" });
    const oContextB = createContextStub({ name: "B" });
    oSandbox.stub(Fragment, "byId").returns({
        getSelectedIndices: function (): number[] { return [0, 1]; },
        getContextByIndex: function (iIndex: number): unknown { return iIndex === 0 ? oContextA : oContextB; }
    });
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteItemStub = oSandbox.stub(CartService, "deleteItem").returns(Promise.resolve());

    const oDone = assert.async();
    void oController.onDeleteMultipleCartItemPress().then(function () {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);
        assert.deepEqual(oDeleteItemStub.firstCall.args[1], [oContextA, oContextB], "both contexts forwarded");
        oDone();
    });
});

QUnit.test("onProductCartQuantityChangePress writes the new quantity", function (assert) {
    oSandbox.stub(Fragment, "byId").returns(null);
    const oData: Record<string, unknown> = { quantity: 1 };
    const oContext = createContextStub(oData);
    const oEvent = {
        getParameter: function (): unknown { return 5; },
        getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; }
    } as any;

    oController.onProductCartQuantityChangePress(oEvent);

    assert.strictEqual(oData.quantity, 5, "quantity updated on the context");
});

QUnit.test("onProductCartQuantityChangePress ignores quantities below one", function (assert) {
    oSandbox.stub(Fragment, "byId").returns(null);
    const oData: Record<string, unknown> = { quantity: 3 };
    const oContext = createContextStub(oData);
    const oEvent = {
        getParameter: function (): unknown { return 0; },
        getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; }
    } as any;

    oController.onProductCartQuantityChangePress(oEvent);

    assert.strictEqual(oData.quantity, 3, "quantity left untouched");
});

QUnit.module("Shop.controller - products", { beforeEach: setup, afterEach: teardown });

QUnit.test("onEditProductPress stores the product and opens the edit dialog", function (assert) {
    const oProduct: Record<string, unknown> = { ID: "P1", name: "Bolt" };
    const oContext = createContextStub(oProduct);
    const oEvent = { getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; } } as any;

    oController.onEditProductPress(oEvent);

    const oStored = oGlobalModel.getProperty("/selectedProduct") as Record<string, unknown>;
    assert.strictEqual(oStored.ID, "P1", "the product was stored");
    assert.strictEqual(oStored.metadata, oContext, "binding context kept as metadata");
    assert.ok(oDialogHandler._openEditProductDialog.calledOnce, "edit dialog opened");
});

QUnit.test("onEditProduct saves the product and closes the dialog", function (assert) {
    const oEditStub = oSandbox.stub(ProductService, "edit");
    const oProduct = { ID: "P2" };
    oGlobalModel.setProperty("/selectedProduct", oProduct);

    oController.onEditProduct();

    assert.ok(oEditStub.calledOnce, "edit called once");
    assert.strictEqual(oEditStub.firstCall.args[1], oProduct, "product forwarded");
    assert.ok(oDialogHandler._closeEditProductDialog.calledOnce, "dialog closed");
});

QUnit.test("onDeleteProductPress deletes after confirmation and toggles busy state", function (assert) {
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(ProductService, "delete").returns(Promise.resolve());
    const oContext = createContextStub({ name: "Hammer" });
    const oEvent = { getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; } } as any;

    const oDone = assert.async();
    void oController.onDeleteProductPress(oEvent).then(function () {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        void oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);
        assert.ok(oDeleteStub.calledOnce, "product deleted on YES");
        assert.strictEqual(oDeleteStub.firstCall.args[1], oContext, "product context forwarded");
        oDone();
    });
});

QUnit.test("onDeleteProductPress does nothing when the dialog is cancelled", function (assert) {
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(ProductService, "delete").returns(Promise.resolve());
    const oContext = createContextStub({ name: "Hammer" });
    const oEvent = { getSource: function (): unknown { return { getBindingContext: function (): unknown { return oContext; } }; } } as any;

    const oDone = assert.async();
    void oController.onDeleteProductPress(oEvent).then(function () {
        void oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.CANCEL);
        assert.strictEqual(oDeleteStub.callCount, 0, "nothing deleted on CANCEL");
        oDone();
    });
});

QUnit.test("onDeleteMultiplesProductsPress warns on an empty selection", function (assert) {
    const oToastStub = oSandbox.stub(MessageToast, "show");
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    oSandbox.stub(oProductsTable, "getSelectedContexts").returns([]);
    oSandbox.stub(oView, "byId").returns(oProductsTable);

    const oDone = assert.async();
    void oController.onDeleteMultiplesProductsPress().then(function () {
        assert.strictEqual(oToastStub.firstCall.args[0], "delete_product_null_selection", "correct text key");
        assert.strictEqual(oConfirmStub.callCount, 0, "no confirmation dialog");
        oDone();
    });
});

QUnit.test("onDeleteMultiplesProductsPress deletes all selected contexts", function (assert) {
    const oContextA = createContextStub({ name: "A" });
    const oContextB = createContextStub({ name: "B" });
    oSandbox.stub(oProductsTable, "getSelectedContexts").returns([oContextA, oContextB]);
    oSandbox.stub(oView, "byId").returns(oProductsTable);
    const oConfirmStub = oSandbox.stub(MessageBox, "confirm");
    const oDeleteStub = oSandbox.stub(ProductService, "delete").returns(Promise.resolve());

    const oDone = assert.async();
    void oController.onDeleteMultiplesProductsPress().then(function () {
        assert.ok(oConfirmStub.calledOnce, "confirmation requested");
        void oConfirmStub.firstCall.args[1].onClose(MessageBox.Action.YES);
        assert.deepEqual(oDeleteStub.firstCall.args[1], [oContextA, oContextB], "both contexts forwarded");
        oDone();
    });
});

QUnit.test("onCreateButtonPress validates the mandatory fields", function (assert) {
    const oToastStub = oSandbox.stub(MessageToast, "show");
    const oCreateStub = oSandbox.stub(ProductService, "create").returns(Promise.resolve());
    oGlobalModel.setProperty("/product", { name: "Bolt" });

    const oDone = assert.async();
    void oController.onCreateButtonPress().then(function () {
        assert.strictEqual(oToastStub.firstCall.args[0], "add_product_error_fields", "correct text key");
        assert.strictEqual(oCreateStub.callCount, 0, "nothing created");
        oDone();
    });
});

QUnit.test("onCreateButtonPress creates a complete product for the selected company", function (assert) {
    oSandbox.stub(MessageToast, "show");
    const oCreateStub = oSandbox.stub(ProductService, "create").returns(Promise.resolve());
    oGlobalModel.setProperty("/product", { name: "Bolt", description: "A bolt", price: 5, stock_min: 1, stock: 10 });
    oGlobalModel.setProperty("/selectedCompany", { ID: "C1" });

    const oDone = assert.async();
    void oController.onCreateButtonPress().then(function () {
        assert.ok(oCreateStub.calledOnce, "create called once");
        assert.deepEqual(oCreateStub.firstCall.args[1], {
            name: "Bolt", description: "A bolt", company_ID: "C1", price: 5, stock_min: 1, stock: 10
        }, "payload assembled");
        assert.strictEqual(oView.getBusy(), false, "busy state released");
        oDone();
    });
});

QUnit.test("addProductCart warns and records a message when nothing is selected", function (assert) {
    const oToastStub = oSandbox.stub(MessageToast, "show");
    oSandbox.stub(oProductsTable, "getSelectedItems").returns([]);
    oSandbox.stub(oView, "byId").returns(oProductsTable);

    const oDone = assert.async();
    void oController.addProductCart().then(function () {
        assert.strictEqual(oToastStub.firstCall.args[0], "add_product_null_selection", "correct text key");
        assert.strictEqual(aAddedMessages.length, 1, "a warning message was recorded");
        assert.strictEqual(aAddedMessages[0].type, "Warning", "message typed as warning");
        oDone();
    });
});

QUnit.test("addProductCart adds products to an existing cart", function (assert) {
    const oAddStub = oSandbox.stub(CartService, "addProducts").returns(Promise.resolve());
    const oRemoveStub = oSandbox.stub(oProductsTable, "removeSelections");
    oSandbox.stub(oProductsTable, "getSelectedItems").returns([
        { getBindingContext: function (): unknown { return createContextStub({ ID: "P1" }); } },
        { getBindingContext: function (): unknown { return createContextStub({ ID: "P2" }); } }
    ]);
    oSandbox.stub(oView, "byId", function (sId: string): unknown {
        return sId === "productsWorklist" ? oProductsTable : oCompanyComboBox;
    } as any);
    oGlobalModel.setProperty("/selectedCompany", { ID: "C1", name: "ACME" });
    oGlobalModel.setProperty("/selectedCart", { ID: "CART-1" });

    const oDone = assert.async();
    void oController.addProductCart().then(function () {
        assert.ok(oAddStub.calledOnce, "products added once");
        assert.deepEqual(oAddStub.firstCall.args[1], ["P1", "P2"], "product ids forwarded");
        assert.ok(oRemoveStub.calledOnce, "table selection cleared");
        oDone();
    });
});

QUnit.test("addProductCart stops when no company is selected", function (assert) {
    oSandbox.stub(MessageToast, "show");
    const oAddStub = oSandbox.stub(CartService, "addProducts").returns(Promise.resolve());
    oSandbox.stub(oProductsTable, "getSelectedItems").returns([
        { getBindingContext: function (): unknown { return createContextStub({ ID: "P1" }); } }
    ]);
    oSandbox.stub(oView, "byId", function (sId: string): unknown {
        return sId === "productsWorklist" ? oProductsTable : oCompanyComboBox;
    } as any);

    const oDone = assert.async();
    void oController.addProductCart().then(function () {
        assert.strictEqual(oAddStub.callCount, 0, "nothing added without a company");
        assert.strictEqual(oCompanyComboBox.getValueState(), "Error", "combo box flagged");
        oDone();
    });
});

QUnit.test("onSearch filters and clears the products binding", function (assert) {
    const aCalls: unknown[][] = [];
    const oBinding = { filter: function (aFilters: unknown[]): void { aCalls.push(aFilters); } };
    oSandbox.stub(oProductsTable, "getBinding").returns(oBinding);
    oSandbox.stub(oView, "byId").returns(oProductsTable);

    oController.onSearch({ getParameter: function (): unknown { return "bolt"; } } as any);
    oController.onSearch({ getParameter: function (): unknown { return ""; } } as any);

    assert.strictEqual(aCalls.length, 2, "the binding was filtered twice");
    assert.strictEqual((aCalls[0] as unknown[]).length, 1, "one filter applied for a query");
    assert.deepEqual(aCalls[1], [], "filters cleared for an empty query");
});

QUnit.module("Shop.controller - company", { beforeEach: setup, afterEach: teardown });

QUnit.test("onCompanyCancelPress clears the selected company and unbinds the view", function (assert) {
    const oUnbindStub = oSandbox.stub(oView, "unbindElement");
    oGlobalModel.setProperty("/selectedCompany", { ID: "C1" });

    oController.onCompanyCancelPress();

    assert.deepEqual(oGlobalModel.getProperty("/selectedCompany"), {}, "selection cleared");
    assert.ok(oUnbindStub.calledWith("/Company"), "the Company element binding was removed");
});

QUnit.test("onCompanyChange loads the company and resets the cart state", function (assert) {
    const oLoadStub = oSandbox.stub(ProductService, "loadByCompany");
    const oAssignStub = oSandbox.stub(CartService, "assignOnCompanyLoad");
    oCompanyComboBox.setValueState("Error");
    const oEvent = { getSource: function (): unknown { return oCompanyComboBox; } } as any;

    const oDone = assert.async();
    void oController.onCompanyChange(oEvent).then(function () {
        assert.deepEqual(oGlobalModel.getProperty("/selectedCompany"), { ID: "C1", name: "ACME" }, "company stored");
        assert.deepEqual(oGlobalModel.getProperty("/selectedCart"), {}, "cart reset");
        assert.strictEqual(oGlobalModel.getProperty("/cartItemsQuantity"), 0, "quantity reset");
        assert.strictEqual(oCompanyComboBox.getValueState(), "None", "value state cleared");
        assert.ok(oLoadStub.calledOnce && oAssignStub.calledOnce, "products and cart reloaded");
        oDone();
    });
});

QUnit.module("Shop.controller - dialogs", { beforeEach: setup, afterEach: teardown });

QUnit.test("openAddProductDialog delegates to the dialog handler", function (assert) {
    oController.openAddProductDialog();
    assert.ok(oDialogHandler._openAddProductDialog.calledOnce, "add product dialog opened");
});

QUnit.test("closeAddProductDialog delegates to the dialog handler", function (assert) {
    oController.closeAddProductDialog();
    assert.ok(oDialogHandler._closeAddProductDialog.calledOnce, "add product dialog closed");
});

QUnit.test("openEditProductDialog delegates to the dialog handler", function (assert) {
    oController.openEditProductDialog();
    assert.ok(oDialogHandler._openEditProductDialog.calledOnce, "edit product dialog opened");
});

QUnit.test("closeEditProductDialog delegates to the dialog handler", function (assert) {
    oController.closeEditProductDialog();
    assert.ok(oDialogHandler._closeEditProductDialog.calledOnce, "edit product dialog closed");
});

QUnit.test("closeCartDialog delegates to the dialog handler", function (assert) {
    oController.closeCartDialog();
    assert.ok(oDialogHandler._closeCartDialog.calledOnce, "cart dialog closed");
});

QUnit.test("openCartDialog opens only when a company is selected", function (assert) {
    oSandbox.stub(MessageToast, "show");
    oSandbox.stub(oView, "byId").returns(oCompanyComboBox);

    const oDone = assert.async();
    void oController.openCartDialog().then(function () {
        assert.strictEqual(oDialogHandler._openCartDialog.callCount, 0, "no dialog without a company");

        oGlobalModel.setProperty("/selectedCompany", { ID: "C1", name: "ACME" });
        return oController.openCartDialog();
    }).then(function () {
        assert.ok(oDialogHandler._openCartDialog.calledOnce, "dialog opened once a company is selected");
        oDone();
    });
});

QUnit.module("Shop.controller - formatter", { beforeEach: setup, afterEach: teardown });

QUnit.test("the controller exposes the formatter to the views", function (assert) {
    assert.ok(oController.formatter, "formatter is exposed on the controller");
    assert.strictEqual(typeof oController.formatter, "object", "formatter is an object of helpers");
});
