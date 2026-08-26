// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import Fragment from "sap/ui/core/Fragment";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import CartService from "cap_try_ts/service/CartService";
import type BaseController from "cap_try_ts/controller/BaseController";
import type Context from "sap/ui/model/odata/v4/Context";

function createFakeContext(oSandbox: any, oData: any, sPath?: string): any {
    return {
        getObject: oSandbox.stub().returns(oData),
        getPath: oSandbox.stub().returns(sPath),
        delete: oSandbox.stub().returns(Promise.resolve())
    };
}

QUnit.module("service/CartService", {
    beforeEach: function (this: any) {
        this.oSandbox = sinon.sandbox.create();
        this.sViewId = "__view0";

        this.oJSONModel = {
            refresh: this.oSandbox.stub()
        };

        this.oView = {
            setBusy: this.oSandbox.stub(),
            getId: this.oSandbox.stub().returns(this.sViewId)
        };

        this.oDataModel = {
            bindContext: this.oSandbox.stub(),
            bindList: this.oSandbox.stub()
        };

        this.oComponent = {
            getModel: this.oSandbox.stub().returns(this.oDataModel)
        };

        this.oController = {
            getOwnerComponent: this.oSandbox.stub().returns(this.oComponent),
            getView: this.oSandbox.stub().returns(this.oView),
            getModel: this.oSandbox.stub().returns(this.oJSONModel),
            getProp: this.oSandbox.stub(),
            setProp: this.oSandbox.stub(),
            _addMessage: this.oSandbox.stub(),
            getI18nText: this.oSandbox.stub().returnsArg(0),
            _getEntitySetContexts: this.oSandbox.stub()
        };

        this.oMessageBoxSuccess = this.oSandbox.stub(MessageBox, "success");
        this.oMessageBoxError = this.oSandbox.stub(MessageBox, "error");
        this.oMessageToastShow = this.oSandbox.stub(MessageToast, "show");
    },

    afterEach: function (this: any) {
        this.oSandbox.restore();
    }
});

QUnit.test("finalize: invokes the finalizeCart action and reports success", function (this: any, assert) {
    const oInvoke = this.oSandbox.stub().returns(Promise.resolve());
    this.oDataModel.bindContext.returns({ invoke: oInvoke });

    const oAssignStub = this.oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
    const oBindStub = this.oSandbox.stub(CartService, "bindDataToFragment");

    return CartService.finalize(this.oController as unknown as BaseController, "123").then(() => {
        assert.ok(this.oDataModel.bindContext.calledWith("/Cart(123)/ShopCartService.finalizeCart(...)"), "bound context on correct action path");
        assert.ok(oInvoke.called, "action was invoked");
        assert.ok(oAssignStub.calledWith(this.oController), "assignOnCompanyLoad was called");
        assert.ok(oBindStub.calledWith(this.oController), "bindDataToFragment was called");
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Success", "success message added");
        assert.ok(this.oMessageBoxSuccess.called, "MessageBox.success shown");
        assert.deepEqual(this.oView.setBusy.args, [[true], [false]], "view busy toggled true then false");
    });
});

QUnit.test("finalize: reports an error message when the action fails", function (this: any, assert) {
    const oInvoke = this.oSandbox.stub().returns(Promise.reject(new Error("fail")));
    this.oDataModel.bindContext.returns({ invoke: oInvoke });

    return CartService.finalize(this.oController as unknown as BaseController, "123").then(() => {
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
        assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
    });
});

QUnit.test("create: creates a new cart and refreshes the UI on success", function (this: any, assert) {
    this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ currency_code: "EUR" });

    const oCreateCart = { created: this.oSandbox.stub().returns(Promise.resolve()) };
    const oCartList = { create: this.oSandbox.stub().returns(oCreateCart) };
    this.oDataModel.bindList.returns(oCartList);

    const oBindStub = this.oSandbox.stub(CartService, "bindDataToFragment");

    return CartService.create(this.oController as unknown as BaseController, "comp1").then(() => {
        assert.ok(this.oDataModel.bindList.calledWith("/Cart"), "cart list bound on /Cart");
        assert.ok(oCartList.create.calledWith({ company_ID: "comp1", currency_code: "EUR" }), "new cart created with company and currency");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCart", oCreateCart), "selected cart updated");
        assert.ok(this.oJSONModel.refresh.calledWith(true), "globalModel refreshed");
        assert.ok(oBindStub.called, "bindDataToFragment called");
        assert.ok(this.oMessageToastShow.called, "success toast shown");
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Success", "success message added");
    });
});

QUnit.test("create: reports an error when creation fails", function (this: any, assert) {
    this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ currency_code: "EUR" });

    const oCreateCart = { created: this.oSandbox.stub().returns(Promise.reject(new Error("fail"))) };
    const oCartList = { create: this.oSandbox.stub().returns(oCreateCart) };
    this.oDataModel.bindList.returns(oCartList);

    return CartService.create(this.oController as unknown as BaseController, "comp1").then(() => {
        assert.ok(this.oMessageToastShow.called, "error toast shown");
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
    });
});

QUnit.test("delete: deletes the cart, notifies and refreshes the assigned cart", function (this: any, assert) {
    const oCart = createFakeContext(this.oSandbox, { name: "Cart A" });
    const oAssignStub = this.oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
    const oBindStub = this.oSandbox.stub(CartService, "bindDataToFragment");

    return CartService.delete(this.oController as unknown as BaseController, oCart as unknown as Context).then(() => {
        assert.ok(oCart.delete.called, "cart deletion requested");
        assert.equal(this.oMessageToastShow.firstCall.args[0], "delete_current_cart_success", "toast shown with correct i18n key");
        assert.ok(oAssignStub.calledWith(this.oController), "assignOnCompanyLoad called");
        assert.ok(oBindStub.calledWith(this.oController), "bindDataToFragment called");
    });
});

QUnit.test("delete: shows an error message when deletion fails", function (this: any, assert) {
    const oCart = createFakeContext(this.oSandbox, { name: "Cart A" });
    oCart.delete.returns(Promise.reject(new Error("fail")));

    return CartService.delete(this.oController as unknown as BaseController, oCart as unknown as Context).then(() => {
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown on failure");
    });
});

QUnit.test("addProducts: adds products to the selected cart and updates quantity", function (this: any, assert) {
    const oSelectedCart = createFakeContext(this.oSandbox, { ID: "cart1" });
    this.oController.getProp.withArgs("globalModel", "/selectedCart").returns(oSelectedCart);

    const oInvoke = this.oSandbox.stub().returns(Promise.resolve());
    const oSetParameter = this.oSandbox.stub();
    const oGetBoundContext = this.oSandbox.stub().returns({
        getObject: this.oSandbox.stub().returns({ items: [{}, {}] })
    });
    this.oDataModel.bindContext.returns({ invoke: oInvoke, setParameter: oSetParameter, getBoundContext: oGetBoundContext });

    return CartService.addProducts(this.oController as unknown as BaseController, ["p1", "p2"]).then(() => {
        assert.ok(this.oDataModel.bindContext.calledWith("/Cart(cart1)/ShopCartService.addProductsToCart(...)"), "action bound to correct cart");
        assert.ok(oSetParameter.calledWith("product_IDs", ["p1", "p2"]), "product IDs set as parameter");
        assert.ok(oInvoke.called, "action invoked");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 2), "cart items quantity updated");
        assert.ok(this.oJSONModel.refresh.calledWith(true), "globalModel refreshed");
        assert.ok(this.oMessageToastShow.called, "success toast shown");
    });
});

QUnit.test("addProducts: reports an error when the action fails", function (this: any, assert) {
    const oSelectedCart = createFakeContext(this.oSandbox, { ID: "cart1" });
    this.oController.getProp.withArgs("globalModel", "/selectedCart").returns(oSelectedCart);

    const oInvoke = this.oSandbox.stub().returns(Promise.reject(new Error("fail")));
    this.oDataModel.bindContext.returns({ invoke: oInvoke, setParameter: this.oSandbox.stub() });

    return CartService.addProducts(this.oController as unknown as BaseController, ["p1"]).then(() => {
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
        assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
    });
});

QUnit.test("deleteItem: returns immediately when no items are given", function (this: any, assert) {
    return CartService.deleteItem(this.oController as unknown as BaseController, undefined as unknown as Context).then(() => {
        assert.notOk(this.oMessageToastShow.called, "no toast shown");
        assert.notOk(this.oMessageBoxError.called, "no error shown");
    });
});

QUnit.test("deleteItem: deletes a single item and rebinds the fragment", function (this: any, assert) {
    const oItem = createFakeContext(this.oSandbox, { name: "Product A" });
    const oBindStub = this.oSandbox.stub(CartService, "bindDataToFragment");

    return CartService.deleteItem(this.oController as unknown as BaseController, oItem as unknown as Context).then(() => {
        assert.ok(oItem.delete.calledWith("$auto"), "item deleted with $auto group");
        assert.ok(this.oMessageToastShow.called, "toast shown for deleted item");
        assert.ok(oBindStub.called, "bindDataToFragment called");
    });
});

QUnit.test("deleteItem: deletes multiple items in sequence", function (this: any, assert) {
    const oItem1 = createFakeContext(this.oSandbox, { name: "Product A" });
    const oItem2 = createFakeContext(this.oSandbox, { name: "Product B" });
    const oBindStub = this.oSandbox.stub(CartService, "bindDataToFragment");

    return CartService.deleteItem(this.oController as unknown as BaseController, [oItem1, oItem2] as unknown as Context[]).then(() => {
        assert.ok(oItem1.delete.calledWith("$auto"), "first item deleted");
        assert.ok(oItem2.delete.calledWith("$auto"), "second item deleted");
        assert.equal(this.oMessageToastShow.callCount, 2, "toast shown for each deleted item");
        assert.ok(oBindStub.called, "bindDataToFragment called once after all deletions");
    });
});

QUnit.test("deleteItem: shows an error and resets busy state on failure", function (this: any, assert) {
    const oItem = createFakeContext(this.oSandbox, { name: "Product A" });
    oItem.delete.returns(Promise.reject(new Error("fail")));

    return CartService.deleteItem(this.oController as unknown as BaseController, oItem as unknown as Context).then(() => {
        assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
    });
});

QUnit.test("assignOnCompanyLoad: clears selected cart when none are active", function (this: any, assert) {
    this.oController._getEntitySetContexts.returns(Promise.resolve([]));
    this.oController.getProp.withArgs("globalModel", "/selectedCompany/ID").returns("comp1");

    return CartService.assignOnCompanyLoad(this.oController as unknown as BaseController).then(() => {
        assert.equal(this.oController._getEntitySetContexts.firstCall.args[0], "/Cart", "entity set requested on /Cart");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCart", {}), "selected cart cleared");
    });
});

QUnit.test("assignOnCompanyLoad: assigns the first active cart and its item count", function (this: any, assert) {
    const oCart = createFakeContext(this.oSandbox, { items: [{}, {}, {}] });
    this.oController._getEntitySetContexts.returns(Promise.resolve([oCart]));
    this.oController.getProp.withArgs("globalModel", "/selectedCompany/ID").returns("comp1");

    return CartService.assignOnCompanyLoad(this.oController as unknown as BaseController).then(() => {
        assert.ok(this.oController.setProp.calledWith("globalModel", "/selectedCart", oCart), "selected cart assigned");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 3), "item quantity assigned");
        assert.ok(this.oJSONModel.refresh.calledWith(true), "globalModel refreshed");
    });
});

QUnit.test("bindDataToFragment: does nothing when a fragment control is missing", function (this: any, assert) {
    const oByIdStub = this.oSandbox.stub(Fragment, "byId");
    oByIdStub.withArgs(this.sViewId, "cartTable").returns(undefined);
    oByIdStub.withArgs(this.sViewId, "cartTableFooter").returns({});
    oByIdStub.withArgs(this.sViewId, "cartsSelect").returns({});

    this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({});

    CartService.bindDataToFragment(this.oController as unknown as BaseController);

    assert.notOk(this.oController.setProp.called, "no state changes attempted when fragment controls are unavailable");
});

QUnit.test("bindDataToFragment: clears the table and select when no cart is selected", function (this: any, assert) {
    const oCartTable = { unbindRows: this.oSandbox.stub(), bindRows: this.oSandbox.stub(), setBusy: this.oSandbox.stub() };
    const oCartTableFooter = { unbindElement: this.oSandbox.stub(), bindElement: this.oSandbox.stub() };
    const oCartSelectBinding = { filter: this.oSandbox.stub(), refresh: this.oSandbox.stub() };
    const oCartSelect = { getBinding: this.oSandbox.stub().returns(oCartSelectBinding), setSelectedKey: this.oSandbox.stub() };

    const oByIdStub = this.oSandbox.stub(Fragment, "byId");
    oByIdStub.withArgs(this.sViewId, "cartTable").returns(oCartTable);
    oByIdStub.withArgs(this.sViewId, "cartTableFooter").returns(oCartTableFooter);
    oByIdStub.withArgs(this.sViewId, "cartsSelect").returns(oCartSelect);

    this.oController.getProp.withArgs("globalModel", "/selectedCart").returns({});
    this.oController.getProp.withArgs("globalModel", "/selectedCompany/ID").returns("comp1");

    CartService.bindDataToFragment(this.oController as unknown as BaseController);

    assert.ok(oCartSelectBinding.filter.called, "select list re-filtered");
    assert.ok(oCartSelectBinding.refresh.called, "select list refreshed");
    assert.ok(this.oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 0), "item quantity reset to zero");
    assert.ok(oCartSelect.setSelectedKey.calledWith(""), "select cleared");
    assert.ok(oCartTableFooter.unbindElement.called, "footer unbound");
    assert.ok(oCartTable.unbindRows.called, "table rows unbound");
});

QUnit.test("bindDataToFragment: binds the table and footer to the selected cart", function (this: any, assert) {
    const oCartTable = { unbindRows: this.oSandbox.stub(), bindRows: this.oSandbox.stub(), setBusy: this.oSandbox.stub() };
    const oCartTableFooter = { unbindElement: this.oSandbox.stub(), bindElement: this.oSandbox.stub() };
    const oCartSelectBinding = { filter: this.oSandbox.stub(), refresh: this.oSandbox.stub() };
    const oCartSelect = { getBinding: this.oSandbox.stub().returns(oCartSelectBinding), setSelectedKey: this.oSandbox.stub() };

    const oByIdStub = this.oSandbox.stub(Fragment, "byId");
    oByIdStub.withArgs(this.sViewId, "cartTable").returns(oCartTable);
    oByIdStub.withArgs(this.sViewId, "cartTableFooter").returns(oCartTableFooter);
    oByIdStub.withArgs(this.sViewId, "cartsSelect").returns(oCartSelect);

    const oSelectedCart = createFakeContext(this.oSandbox, { ID: "cart9" }, "/Cart('cart9')");
    this.oController.getProp.withArgs("globalModel", "/selectedCart").returns(oSelectedCart);
    this.oController.getProp.withArgs("globalModel", "/selectedCompany/ID").returns("comp1");

    CartService.bindDataToFragment(this.oController as unknown as BaseController);

    assert.ok(oCartSelect.setSelectedKey.calledWith("cart9"), "select key set to cart ID");
    assert.ok(oCartTable.bindRows.calledOnce, "table rows bound");
    assert.equal(oCartTable.bindRows.firstCall.args[0].path, "/Cart('cart9')/items", "table bound to cart items path");
    assert.ok(oCartTableFooter.bindElement.calledWith({ path: "/Cart('cart9')" }), "footer bound to cart element");
});
