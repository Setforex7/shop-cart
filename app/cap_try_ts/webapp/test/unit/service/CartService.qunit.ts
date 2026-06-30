import CartService from "cap_try_ts/service/CartService";
// @ts-ignore -- sap/ui/thirdparty/sinon ships no type declarations; imported as a value only
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Fragment from "sap/ui/core/Fragment";

let oSandbox: any;
let oController: any;
let props: any;
let oView: any;
let oJsonModel: any;
let oDataModel: any;
let oContextBinding: any;
let oReturnedContext: any;
let oCartList: any;
let oCreatedContext: any;

QUnit.module("cap_try_ts.service.CartService", {
    beforeEach: function () {
        oSandbox = (sinon as any).sandbox.create();
        oSandbox.stub(MessageBox, "success");
        oSandbox.stub(MessageBox, "error");
        oSandbox.stub(MessageToast, "show");
        oSandbox.stub(Fragment, "byId").returns(null);

        oJsonModel = { refresh: (sinon as any).stub() };
        oView = { setBusy: (sinon as any).stub(), getId: (sinon as any).stub().returns("viewId") };

        oReturnedContext = { getObject: (sinon as any).stub().returns({ items: [{}, {}] }) };
        oContextBinding = {
            invoke: (sinon as any).stub().returns(Promise.resolve()),
            setParameter: (sinon as any).stub(),
            getBoundContext: (sinon as any).stub().returns(oReturnedContext)
        };
        oCreatedContext = { created: (sinon as any).stub().returns(Promise.resolve()) };
        oCartList = { create: (sinon as any).stub().returns(oCreatedContext) };
        oDataModel = {
            bindContext: (sinon as any).stub().returns(oContextBinding),
            bindList: (sinon as any).stub().returns(oCartList)
        };

        props = {
            "/selectedCompany": { ID: "C1", currency_code: "EUR" },
            "/selectedCompany/ID": "C1",
            "/selectedCart": {
                getObject: (sinon as any).stub().returns({ ID: "CART1", items: [{}, {}] }),
                getPath: (sinon as any).stub().returns("/Cart('CART1')")
            },
            "/cartItemsQuantity": 0
        };

        oController = {
            getView: (sinon as any).stub().returns(oView),
            getOwnerComponent: (sinon as any).stub().returns({ getModel: (sinon as any).stub().returns(oDataModel) }),
            getModel: (sinon as any).stub().returns(oJsonModel),
            getI18nText: (sinon as any).stub().returnsArg(0),
            getProp: function (sModel: string, sPath: string) { return props[sPath]; },
            setProp: function (sModel: string, sPath: string, vValue: any) { props[sPath] = vValue; },
            _addMessage: (sinon as any).stub(),
            _getEntitySetContexts: (sinon as any).stub().returns(Promise.resolve([]))
        };
    },
    afterEach: function () {
        oSandbox.restore();
    }
});

QUnit.test("finalize invokes the finalizeCart action and reports success", async function (assert) {
    await (CartService as any).finalize(oController as any, "CART1");

    assert.ok(oDataModel.bindContext.calledOnce, "a context binding for the action was created");
    assert.ok(oContextBinding.invoke.calledOnce, "the bound action was invoked");
    assert.ok(oView.setBusy.calledWith(true), "the view was set busy while running");
    assert.ok(oView.setBusy.calledWith(false), "the view busy state was cleared");
    assert.ok((MessageBox.success as any).calledOnce, "a success message box was shown");
    assert.ok(oController._addMessage.calledOnce, "a success message was added");
});

QUnit.test("create creates a new cart and reports success", async function (assert) {
    await (CartService as any).create(oController as any, "C1");

    assert.ok(oDataModel.bindList.calledWith("/Cart"), "a list binding on /Cart was created");
    assert.ok(oCartList.create.calledOnce, "a cart entity was created");
    assert.strictEqual(props["/selectedCart"], oCreatedContext, "the new cart became the selected cart");
    assert.ok((MessageToast.show as any).calledWith("create_cart_success"), "a success toast was shown");
    assert.ok(oController._addMessage.calledOnce, "a success message was added");
});

QUnit.test("delete removes the given cart and reloads", async function (assert) {
    const oCart = {
        getObject: (sinon as any).stub().returns({ name: "My Cart" }),
        delete: (sinon as any).stub().returns(Promise.resolve())
    };

    await (CartService as any).delete(oController as any, oCart as any);

    assert.ok(oCart.delete.calledOnce, "the cart context was deleted");
    assert.ok((MessageToast.show as any).calledOnce, "a deletion toast was shown");
    assert.ok(oController._getEntitySetContexts.calledOnce, "the carts were reloaded");
});

QUnit.test("addProducts invokes the addProductsToCart action and updates the quantity", async function (assert) {
    await (CartService as any).addProducts(oController as any, ["P1", "P2"]);

    assert.ok(oContextBinding.setParameter.calledWith("product_IDs", ["P1", "P2"]), "the product ids were passed");
    assert.ok(oContextBinding.invoke.calledOnce, "the bound action was invoked");
    assert.strictEqual(props["/cartItemsQuantity"], 2, "the cart item quantity was updated");
    assert.ok((MessageToast.show as any).calledOnce, "a success toast was shown");
});

QUnit.test("deleteItem deletes a single cart item context", async function (assert) {
    const oItem = {
        getObject: (sinon as any).stub().returns({ name: "Product A" }),
        delete: (sinon as any).stub().returns(Promise.resolve())
    };

    await (CartService as any).deleteItem(oController as any, oItem as any);

    assert.ok(oItem.delete.calledWith("$auto"), "the item was deleted with the $auto group");
    assert.ok((MessageToast.show as any).calledOnce, "a deletion toast was shown");
});

QUnit.test("assignOnCompanyLoad selects the active cart and stores its item count", async function (assert) {
    const oCart = { getObject: (sinon as any).stub().returns({ items: [{}, {}, {}] }) };
    oController._getEntitySetContexts = (sinon as any).stub().returns(Promise.resolve([oCart]));

    await (CartService as any).assignOnCompanyLoad(oController as any);

    assert.strictEqual(props["/selectedCart"], oCart, "the active cart was selected");
    assert.strictEqual(props["/cartItemsQuantity"], 3, "the cart item quantity was stored");
});

QUnit.test("bindDataToFragment binds the selected cart to the fragment controls", function (assert) {
    const oCartSelectBinding = { filter: (sinon as any).stub(), refresh: (sinon as any).stub() };
    const oCartSelect = { getBinding: (sinon as any).stub().returns(oCartSelectBinding), setSelectedKey: (sinon as any).stub() };
    const oCartTable = { bindRows: (sinon as any).stub(), unbindRows: (sinon as any).stub(), setBusy: (sinon as any).stub() };
    const oCartTableFooter = { bindElement: (sinon as any).stub(), unbindElement: (sinon as any).stub() };

    (Fragment.byId as any).withArgs("viewId", "cartTable").returns(oCartTable);
    (Fragment.byId as any).withArgs("viewId", "cartTableFooter").returns(oCartTableFooter);
    (Fragment.byId as any).withArgs("viewId", "cartsSelect").returns(oCartSelect);

    (CartService as any).bindDataToFragment(oController as any);

    assert.ok(oCartSelect.setSelectedKey.calledWith("CART1"), "the select reflects the active cart");
    assert.ok(oCartTable.bindRows.calledOnce, "the cart table rows were bound");
    assert.ok(oCartTableFooter.bindElement.calledOnce, "the footer element was bound");
    assert.ok(oCartSelectBinding.refresh.calledOnce, "the select binding was refreshed");
});
