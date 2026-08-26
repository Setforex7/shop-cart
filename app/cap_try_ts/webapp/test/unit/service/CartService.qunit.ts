// @ts-ignore -- UI5 bundles sinon 1.17 without TypeScript declarations
import sinonModule from "sap/ui/thirdparty/sinon";
import CartService from "cap_try_ts/service/CartService";
import Fragment from "sap/ui/core/Fragment";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";

interface SinonCall {
	args: unknown[];
	calledWith(...args: unknown[]): boolean;
}

interface SinonStub {
	(...args: unknown[]): unknown;
	returns(vValue: unknown): SinonStub;
	returnsArg(iIndex: number): SinonStub;
	withArgs(...args: unknown[]): SinonStub;
	called: boolean;
	notCalled: boolean;
	calledOnce: boolean;
	callCount: number;
	calledWith(...args: unknown[]): boolean;
	firstCall: SinonCall;
	lastCall: SinonCall;
}

interface SinonSandbox {
	stub(oObject?: object, sMethod?: string): SinonStub;
	restore(): void;
}

interface SinonApi {
	stub(oObject?: object, sMethod?: string): SinonStub;
	sandbox: { create(): SinonSandbox };
}

const sinon: SinonApi = sinonModule as SinonApi;

interface StubbedController {
	getOwnerComponent: SinonStub;
	getView: SinonStub;
	getModel: SinonStub;
	getI18nText: SinonStub;
	getProp: SinonStub;
	setProp: SinonStub;
	_addMessage: SinonStub;
	_getEntitySetContexts: SinonStub;
}

let oSandbox: SinonSandbox;
let oGlobalModel: JSONModel;
let oController: StubbedController;
let oGlobalData: Record<string, unknown>;
let oViewStub: { setBusy: SinonStub; getId: SinonStub };
let oDataModelStub: { bindContext: SinonStub; bindList: SinonStub };

function createContext(oObject: Record<string, unknown>, sPath?: string): Record<string, SinonStub> {
	return {
		getObject: sinon.stub().returns(oObject),
		getPath: sinon.stub().returns(sPath || "/Cart('c1')"),
		delete: sinon.stub().returns(Promise.resolve()),
		created: sinon.stub().returns(Promise.resolve())
	};
}

QUnit.module("service/CartService", {
	beforeEach: function (): void {
		oSandbox = sinon.sandbox.create();

		oGlobalData = {
			selectedCompany: { ID: "comp-1", currency_code: "EUR" },
			selectedCart: createContext({ ID: "cart-1", name: "Cart 1", items: [{}, {}] }),
			cartItemsQuantity: 2
		};

		oGlobalModel = new JSONModel(oGlobalData);
		oSandbox.stub(oGlobalModel, "refresh");

		oViewStub = {
			setBusy: sinon.stub(),
			getId: sinon.stub().returns("viewId")
		};

		oDataModelStub = {
			bindContext: sinon.stub(),
			bindList: sinon.stub()
		};

		oController = {
			getOwnerComponent: sinon.stub().returns({
				getModel: sinon.stub().returns(oDataModelStub)
			}),
			getView: sinon.stub().returns(oViewStub),
			getModel: sinon.stub().returns(oGlobalModel),
			getI18nText: sinon.stub().returnsArg(0),
			getProp: sinon.stub(),
			setProp: sinon.stub(),
			_addMessage: sinon.stub(),
			_getEntitySetContexts: sinon.stub().returns(Promise.resolve([]))
		};

		oController.getProp.withArgs("globalModel", "/selectedCompany").returns(oGlobalData.selectedCompany);
		oController.getProp.withArgs("globalModel", "/selectedCompany/ID").returns("comp-1");
		oController.getProp.withArgs("globalModel", "/selectedCart").returns(oGlobalData.selectedCart);

		oSandbox.stub(MessageBox, "success");
		oSandbox.stub(MessageBox, "error");
		oSandbox.stub(MessageToast, "show");
		oSandbox.stub(Fragment, "byId").returns(undefined);
	},
	afterEach: function (): void {
		oSandbox.restore();
		oGlobalModel.destroy();
	}
});

QUnit.test("finalize invokes the bound action and reports success", async function (assert): Promise<void> {
	const oActionStub = { invoke: sinon.stub().returns(Promise.resolve()) };
	oDataModelStub.bindContext.returns(oActionStub);

	await CartService.finalize(oController as never, "cart-1");

	assert.ok(oDataModelStub.bindContext.calledOnce, "bindContext was called once");
	assert.ok(
		(oDataModelStub.bindContext.firstCall.args[0] as string).indexOf("ShopCartService.finalizeCart(...)") > -1,
		"the finalizeCart action path was bound"
	);
	assert.ok(oActionStub.invoke.calledOnce, "the action was invoked");
	assert.ok((MessageBox.success as unknown as SinonStub).calledOnce, "a success MessageBox was shown");
	assert.strictEqual(oViewStub.setBusy.callCount, 2, "busy state was set and unset");
});

QUnit.test("finalize reports an error when the action rejects", async function (assert): Promise<void> {
	const oActionStub = { invoke: sinon.stub().returns(Promise.reject(new Error("boom"))) };
	oDataModelStub.bindContext.returns(oActionStub);

	await CartService.finalize(oController as never, "cart-1");

	assert.ok((MessageBox.error as unknown as SinonStub).calledOnce, "an error MessageBox was shown");
	assert.ok(oController._addMessage.calledOnce, "an error message was added");
	assert.strictEqual(
		(oController._addMessage.firstCall.args[0] as { type: string }).type,
		"Error",
		"the added message is of type Error"
	);
	assert.ok(oViewStub.setBusy.lastCall.calledWith(false), "busy state was released");
});

QUnit.test("create creates a new cart for the given company", async function (assert): Promise<void> {
	const oCreatedContext = createContext({ ID: "cart-new" });
	const oListStub = { create: sinon.stub().returns(oCreatedContext) };
	oDataModelStub.bindList.returns(oListStub);

	await CartService.create(oController as never, "comp-1");

	assert.ok(oDataModelStub.bindList.calledWith("/Cart"), "the Cart entity set was bound");
	assert.deepEqual(
		oListStub.create.firstCall.args[0],
		{ company_ID: "comp-1", currency_code: "EUR" },
		"the new cart payload carries company and currency"
	);
	assert.ok(
		oController.setProp.calledWith("globalModel", "/selectedCart", oCreatedContext),
		"the created cart became the selected cart"
	);
	assert.ok((MessageToast.show as unknown as SinonStub).calledOnce, "a success toast was shown");
});

QUnit.test("create reports an error when creation fails", async function (assert): Promise<void> {
	const oCreatedContext = { created: sinon.stub().returns(Promise.reject(new Error("boom"))) };
	oDataModelStub.bindList.returns({ create: sinon.stub().returns(oCreatedContext) });

	await CartService.create(oController as never, "comp-1");

	assert.ok((MessageToast.show as unknown as SinonStub).calledWith("create_cart_error"), "the error toast was shown");
	assert.strictEqual(
		(oController._addMessage.firstCall.args[0] as { type: string }).type,
		"Error",
		"an error message was added"
	);
});

QUnit.test("delete removes the cart and refreshes the selection", async function (assert): Promise<void> {
	const oCart = createContext({ ID: "cart-1", name: "My Cart" });

	await CartService.delete(oController as never, oCart as never);

	assert.ok(oCart.delete.calledOnce, "the cart context was deleted");
	assert.ok((MessageToast.show as unknown as SinonStub).calledOnce, "a success toast was shown");
	assert.ok(oController._getEntitySetContexts.calledOnce, "carts were reloaded afterwards");
});

QUnit.test("delete reports an error when deletion fails", async function (assert): Promise<void> {
	const oCart = createContext({ ID: "cart-1", name: "My Cart" });
	oCart.delete.returns(Promise.reject(new Error("boom")));

	await CartService.delete(oController as never, oCart as never);

	assert.ok((MessageBox.error as unknown as SinonStub).calledOnce, "an error MessageBox was shown");
	assert.ok((MessageToast.show as unknown as SinonStub).notCalled, "no success toast was shown");
});

QUnit.test("addProducts invokes the action and updates the item quantity", async function (assert): Promise<void> {
	const oActionStub = {
		setParameter: sinon.stub(),
		invoke: sinon.stub().returns(Promise.resolve()),
		getBoundContext: sinon.stub().returns(createContext({ items: [{}, {}, {}] }))
	};
	oDataModelStub.bindContext.returns(oActionStub);

	await CartService.addProducts(oController as never, ["p1", "p2"]);

	assert.ok(oActionStub.setParameter.calledWith("product_IDs", ["p1", "p2"]), "product IDs were passed as parameter");
	assert.ok(oActionStub.invoke.calledOnce, "the action was invoked");
	assert.ok(
		oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 3),
		"the cart item quantity was updated"
	);
});

QUnit.test("addProducts reports an error when the action rejects", async function (assert): Promise<void> {
	const oActionStub = {
		setParameter: sinon.stub(),
		invoke: sinon.stub().returns(Promise.reject(new Error("boom"))),
		getBoundContext: sinon.stub()
	};
	oDataModelStub.bindContext.returns(oActionStub);

	await CartService.addProducts(oController as never, ["p1"]);

	assert.ok((MessageBox.error as unknown as SinonStub).calledOnce, "an error MessageBox was shown");
	assert.ok(oActionStub.getBoundContext.notCalled, "the response was never read");
	assert.ok(oViewStub.setBusy.lastCall.calledWith(false), "busy state was released");
});

QUnit.test("deleteItem deletes a single cart item context", async function (assert): Promise<void> {
	const oItem = createContext({ name: "Product A" });

	await CartService.deleteItem(oController as never, oItem as never);

	assert.ok(oItem.delete.calledWith("$auto"), "the item was deleted with the $auto group");
	assert.ok((MessageToast.show as unknown as SinonStub).calledOnce, "one success toast was shown");
});

QUnit.test("deleteItem deletes every context of an array", async function (assert): Promise<void> {
	const aItems = [createContext({ name: "A" }), createContext({ name: "B" })];

	await CartService.deleteItem(oController as never, aItems as never);

	assert.ok(aItems[0].delete.calledOnce, "the first item was deleted");
	assert.ok(aItems[1].delete.calledOnce, "the second item was deleted");
	assert.strictEqual((MessageToast.show as unknown as SinonStub).callCount, 2, "one toast per deleted item");
});

QUnit.test("deleteItem returns early when no context is supplied", async function (assert): Promise<void> {
	await CartService.deleteItem(oController as never, undefined as never);

	assert.ok((MessageToast.show as unknown as SinonStub).notCalled, "no toast was shown");
	assert.ok((MessageBox.error as unknown as SinonStub).notCalled, "no error was shown");
});

QUnit.test("assignOnCompanyLoad clears the selection when no active cart exists", async function (assert): Promise<void> {
	oController._getEntitySetContexts.returns(Promise.resolve([]));

	await CartService.assignOnCompanyLoad(oController as never);

	assert.ok(oController._getEntitySetContexts.calledOnce, "carts were queried");
	assert.strictEqual(oController._getEntitySetContexts.firstCall.args[0], "/Cart", "the Cart entity set was queried");
	assert.deepEqual(
		oController.setProp.firstCall.args,
		["globalModel", "/selectedCart", {}],
		"the selected cart was reset to an empty object"
	);
});

QUnit.test("assignOnCompanyLoad selects the first cart and stores its item count", async function (assert): Promise<void> {
	const oCart = createContext({ ID: "cart-1", items: [{}, {}, {}, {}] });
	oController._getEntitySetContexts.returns(Promise.resolve([oCart]));

	await CartService.assignOnCompanyLoad(oController as never);

	assert.ok(
		oController.setProp.calledWith("globalModel", "/selectedCart", oCart),
		"the first cart became the selected cart"
	);
	assert.ok(
		oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 4),
		"the item quantity was stored"
	);
	assert.ok((oGlobalModel.refresh as unknown as SinonStub).calledOnce, "the global model was refreshed");
});

QUnit.test("bindDataToFragment returns early when the fragment controls are missing", function (assert): void {
	CartService.bindDataToFragment(oController as never);

	assert.ok((Fragment.byId as unknown as SinonStub).called, "fragment controls were looked up");
	assert.ok(oController.setProp.notCalled, "nothing was written to the global model");
});

QUnit.test("bindDataToFragment clears the table when no cart is selected", function (assert): void {
	const oBinding = { filter: sinon.stub(), refresh: sinon.stub() };
	const oCartTable = { bindRows: sinon.stub(), unbindRows: sinon.stub(), setBusy: sinon.stub() };
	const oCartTableFooter = { bindElement: sinon.stub(), unbindElement: sinon.stub() };
	const oCartSelect = { getBinding: sinon.stub().returns(oBinding), setSelectedKey: sinon.stub() };

	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartTable").returns(oCartTable);
	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartTableFooter").returns(oCartTableFooter);
	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartsSelect").returns(oCartSelect);
	oController.getProp.withArgs("globalModel", "/selectedCart").returns({});

	CartService.bindDataToFragment(oController as never);

	assert.ok(oBinding.filter.calledOnce, "the select binding was filtered");
	assert.ok(oCartSelect.setSelectedKey.calledWith(""), "the selected key was cleared");
	assert.ok(oCartTable.unbindRows.calledOnce, "the table rows were unbound");
	assert.ok(
		oController.setProp.calledWith("globalModel", "/cartItemsQuantity", 0),
		"the item quantity was reset to zero"
	);
});

QUnit.test("bindDataToFragment binds the selected cart to table and footer", function (assert): void {
	const oBinding = { filter: sinon.stub(), refresh: sinon.stub() };
	const oCartTable = { bindRows: sinon.stub(), unbindRows: sinon.stub(), setBusy: sinon.stub() };
	const oCartTableFooter = { bindElement: sinon.stub(), unbindElement: sinon.stub() };
	const oCartSelect = { getBinding: sinon.stub().returns(oBinding), setSelectedKey: sinon.stub() };
	const oSelectedCart = createContext({ ID: "cart-1" }, "/Cart('cart-1')");

	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartTable").returns(oCartTable);
	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartTableFooter").returns(oCartTableFooter);
	(Fragment.byId as unknown as SinonStub).withArgs("viewId", "cartsSelect").returns(oCartSelect);
	oController.getProp.withArgs("globalModel", "/selectedCart").returns(oSelectedCart);

	CartService.bindDataToFragment(oController as never);

	assert.ok(oCartSelect.setSelectedKey.calledWith("cart-1"), "the selected key was set to the cart ID");
	assert.strictEqual(
		(oCartTable.bindRows.firstCall.args[0] as { path: string }).path,
		"/Cart('cart-1')/items",
		"the table was bound to the cart items path"
	);
	assert.deepEqual(
		oCartTableFooter.bindElement.firstCall.args[0],
		{ path: "/Cart('cart-1')" },
		"the footer was bound to the cart path"
	);
	assert.ok(oCartTable.unbindRows.notCalled, "the rows were not unbound");
});
