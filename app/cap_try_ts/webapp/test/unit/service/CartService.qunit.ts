// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- sinon ships with UI5 as a thirdparty module without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import CartService from "cap_try_ts/service/CartService";
import Fragment from "sap/ui/core/Fragment";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/ui/table/Table";
import Select from "sap/m/Select";
import Text from "sap/m/Text";

interface StubbedAny {
	[key: string]: any;
}

const oSinon: StubbedAny = sinon as unknown as StubbedAny;

let oSandbox: any;
let oGlobalModel: JSONModel;
let oCartTable: Table;
let oCartSelect: Select;
let oCartTableFooter: Text;
let oControllerStub: StubbedAny;
let oViewStub: StubbedAny;
let oDataModelStub: StubbedAny;
let oGlobalProps: StubbedAny;

function createContext(oData: StubbedAny, sPath: string): StubbedAny {
	return {
		getObject: function (): StubbedAny {
			return oData;
		},
		getPath: function (): string {
			return sPath;
		},
		delete: function (): Promise<void> {
			return Promise.resolve();
		},
		created: function (): Promise<void> {
			return Promise.resolve();
		}
	};
}

function setupFixture(): void {
	oSandbox = oSinon.sandbox.create();

	oGlobalModel = new JSONModel({});
	oCartTable = new Table();
	oCartSelect = new Select();
	oCartTableFooter = new Text();

	oGlobalProps = {
		"/selectedCompany": { ID: "company-1", currency_code: "EUR" },
		"/selectedCompany/ID": "company-1",
		"/selectedCart": createContext({ ID: "cart-1", name: "Cart 1", items: [{}, {}] }, "/Cart(cart-1)"),
		"/cartItemsQuantity": 2
	};

	oViewStub = {
		setBusy: oSinon.stub(),
		getId: oSinon.stub().returns("testView")
	};

	oDataModelStub = {
		bindContext: oSinon.stub(),
		bindList: oSinon.stub()
	};

	oControllerStub = {
		getOwnerComponent: function (): StubbedAny {
			return {
				getModel: function (): StubbedAny {
					return oDataModelStub;
				}
			};
		},
		getView: function (): StubbedAny {
			return oViewStub;
		},
		getModel: function (): JSONModel {
			return oGlobalModel;
		},
		getI18nText: function (sKey: string): string {
			return sKey;
		},
		getProp: function (_sModel: string, sPath: string): any {
			return oGlobalProps[sPath];
		},
		setProp: function (_sModel: string, sPath: string, vValue: any): void {
			oGlobalProps[sPath] = vValue;
		},
		_addMessage: oSinon.stub(),
		_getEntitySetContexts: oSinon.stub().returns(Promise.resolve([]))
	};

	oSandbox.stub(MessageBox, "success");
	oSandbox.stub(MessageBox, "error");
	oSandbox.stub(MessageToast, "show");
	oSandbox.stub(Fragment, "byId");
}

function teardownFixture(): void {
	oSandbox.restore();
	oCartTable.destroy();
	oCartSelect.destroy();
	oCartTableFooter.destroy();
	oGlobalModel.destroy();
}

function stubFragmentControls(oSelectBinding: StubbedAny): void {
	(oCartSelect as any).getBinding = function (): StubbedAny {
		return oSelectBinding;
	};
	(Fragment.byId as any).withArgs("testView", "cartTable").returns(oCartTable);
	(Fragment.byId as any).withArgs("testView", "cartTableFooter").returns(oCartTableFooter);
	(Fragment.byId as any).withArgs("testView", "cartsSelect").returns(oCartSelect);
}

function createSelectBindingStub(): StubbedAny {
	return {
		filter: oSinon.stub(),
		refresh: oSinon.stub()
	};
}

QUnit.module("service/CartService", {
	beforeEach: setupFixture,
	afterEach: teardownFixture
});

QUnit.test("finalize invokes the bound action and reports success", function (assert) {
	const done = assert.async();
	const oInvoke = oSinon.stub().returns(Promise.resolve());
	oDataModelStub.bindContext.returns({ invoke: oInvoke });

	const oAssign = oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
	const oBind = oSandbox.stub(CartService, "bindDataToFragment");

	CartService.finalize(oControllerStub as any, "cart-1").then(function () {
		assert.ok(oDataModelStub.bindContext.calledOnce, "bindContext was called once");
		assert.ok(
			oDataModelStub.bindContext.firstCall.args[0].indexOf("/Cart(cart-1)") === 0,
			"the action path targets the given cart"
		);
		assert.ok(oInvoke.calledOnce, "the finalizeCart action was invoked");
		assert.ok(oAssign.calledOnce, "carts were reloaded for the company");
		assert.ok(oBind.calledOnce, "the fragment was rebound");
		assert.strictEqual((MessageBox.success as any).callCount, 1, "a success MessageBox was shown");
		assert.strictEqual((MessageBox.error as any).callCount, 0, "no error MessageBox was shown");
		assert.strictEqual(oViewStub.setBusy.lastCall.args[0], false, "busy state was reset");
		done();
	});
});

QUnit.test("finalize reports an error when the action rejects", function (assert) {
	const done = assert.async();
	oDataModelStub.bindContext.returns({
		invoke: oSinon.stub().returns(Promise.reject(new Error("boom")))
	});
	oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
	oSandbox.stub(CartService, "bindDataToFragment");

	CartService.finalize(oControllerStub as any, "cart-1").then(function () {
		assert.strictEqual((MessageBox.error as any).callCount, 1, "an error MessageBox was shown");
		assert.strictEqual(
			oControllerStub._addMessage.lastCall.args[0].type,
			"Error",
			"an Error message was added"
		);
		assert.strictEqual(oViewStub.setBusy.lastCall.args[0], false, "busy state was reset");
		done();
	});
});

QUnit.test("create creates a cart for the given company and stores it globally", function (assert) {
	const done = assert.async();
	const oCreatedCart = createContext({ ID: "cart-new", name: "Cart 2", items: [] }, "/Cart(cart-new)");
	const oCreateStub = oSinon.stub().returns(oCreatedCart);
	oDataModelStub.bindList.returns({ create: oCreateStub });
	const oBind = oSandbox.stub(CartService, "bindDataToFragment");

	CartService.create(oControllerStub as any, "company-1").then(function () {
		assert.ok(oDataModelStub.bindList.calledWith("/Cart"), "the Cart entity set was bound");
		assert.deepEqual(
			oCreateStub.firstCall.args[0],
			{ company_ID: "company-1", currency_code: "EUR" },
			"the new cart carries company and currency"
		);
		assert.strictEqual(oGlobalProps["/selectedCart"], oCreatedCart, "the created cart became the selected cart");
		assert.ok(oBind.calledOnce, "the fragment was rebound");
		assert.strictEqual((MessageToast.show as any).callCount, 1, "a MessageToast was shown");
		assert.strictEqual(oViewStub.setBusy.lastCall.args[0], false, "busy state was reset");
		done();
	});
});

QUnit.test("create reports an error when creation fails", function (assert) {
	const done = assert.async();
	oDataModelStub.bindList.returns({
		create: oSinon.stub().returns({
			created: function (): Promise<void> {
				return Promise.reject(new Error("boom"));
			}
		})
	});
	oSandbox.stub(CartService, "bindDataToFragment");

	CartService.create(oControllerStub as any, "company-1").then(function () {
		assert.strictEqual(
			oControllerStub._addMessage.lastCall.args[0].type,
			"Error",
			"an Error message was added"
		);
		assert.strictEqual(
			(MessageToast.show as any).lastCall.args[0],
			"create_cart_error",
			"the error toast text was used"
		);
		done();
	});
});

QUnit.test("delete removes the cart and refreshes the state", function (assert) {
	const done = assert.async();
	const oCart = createContext({ ID: "cart-1", name: "Cart 1" }, "/Cart(cart-1)");
	const oDeleteStub = oSinon.stub(oCart, "delete").returns(Promise.resolve());
	const oAssign = oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
	const oBind = oSandbox.stub(CartService, "bindDataToFragment");

	CartService.delete(oControllerStub as any, oCart as any).then(function () {
		assert.ok(oDeleteStub.calledOnce, "the cart context was deleted");
		assert.strictEqual((MessageToast.show as any).callCount, 1, "a success toast was shown");
		assert.ok(oAssign.calledOnce, "carts were reloaded");
		assert.ok(oBind.calledOnce, "the fragment was rebound");
		done();
	});
});

QUnit.test("delete shows an error MessageBox when deletion fails", function (assert) {
	const done = assert.async();
	const oCart = createContext({ ID: "cart-1", name: "Cart 1" }, "/Cart(cart-1)");
	oSinon.stub(oCart, "delete").returns(Promise.reject(new Error("boom")));
	oSandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
	oSandbox.stub(CartService, "bindDataToFragment");

	CartService.delete(oControllerStub as any, oCart as any).then(function () {
		assert.strictEqual(
			(MessageBox.error as any).lastCall.args[0],
			"delete_current_cart_error",
			"the delete error text was shown"
		);
		done();
	});
});

QUnit.test("addProducts passes the product IDs and updates the item quantity", function (assert) {
	const done = assert.async();
	const oSetParameter = oSinon.stub();
	const oInvoke = oSinon.stub().returns(Promise.resolve());
	oDataModelStub.bindContext.returns({
		setParameter: oSetParameter,
		invoke: oInvoke,
		getBoundContext: function (): StubbedAny {
			return createContext({ items: [{}, {}, {}] }, "/Cart(cart-1)");
		}
	});

	CartService.addProducts(oControllerStub as any, ["p1", "p2"]).then(function () {
		assert.ok(
			oDataModelStub.bindContext.firstCall.args[0].indexOf("addProductsToCart") > -1,
			"the addProductsToCart action was bound"
		);
		assert.deepEqual(
			oSetParameter.firstCall.args,
			["product_IDs", ["p1", "p2"]],
			"the product IDs were passed as parameter"
		);
		assert.ok(oInvoke.calledOnce, "the action was invoked");
		assert.strictEqual(oGlobalProps["/cartItemsQuantity"], 3, "the cart item quantity was updated");
		assert.strictEqual(oViewStub.setBusy.lastCall.args[0], false, "busy state was reset");
		done();
	});
});

QUnit.test("addProducts reports an error when the action rejects", function (assert) {
	const done = assert.async();
	oDataModelStub.bindContext.returns({
		setParameter: oSinon.stub(),
		invoke: oSinon.stub().returns(Promise.reject(new Error("boom"))),
		getBoundContext: oSinon.stub()
	});

	CartService.addProducts(oControllerStub as any, ["p1"]).then(function () {
		assert.strictEqual(
			(MessageBox.error as any).lastCall.args[0],
			"add_products_cart_error",
			"the add-products error text was shown"
		);
		assert.strictEqual(
			oControllerStub._addMessage.lastCall.args[0].type,
			"Error",
			"an Error message was added"
		);
		done();
	});
});

QUnit.test("deleteItem deletes a single cart item context", function (assert) {
	const done = assert.async();
	const oItem = createContext({ name: "Product A" }, "/CartItem(1)");
	const oDeleteStub = oSinon.stub(oItem, "delete").returns(Promise.resolve());
	const oBind = oSandbox.stub(CartService, "bindDataToFragment");

	CartService.deleteItem(oControllerStub as any, oItem as any).then(function () {
		assert.ok(oDeleteStub.calledWith("$auto"), "the item was deleted in the $auto group");
		assert.strictEqual((MessageToast.show as any).callCount, 1, "one toast per deleted item");
		assert.ok(oBind.calledOnce, "the fragment was rebound");
		done();
	});
});

QUnit.test("deleteItem deletes every context of an array", function (assert) {
	const done = assert.async();
	const oItemA = createContext({ name: "Product A" }, "/CartItem(1)");
	const oItemB = createContext({ name: "Product B" }, "/CartItem(2)");
	const oDeleteA = oSinon.stub(oItemA, "delete").returns(Promise.resolve());
	const oDeleteB = oSinon.stub(oItemB, "delete").returns(Promise.resolve());
	oSandbox.stub(CartService, "bindDataToFragment");

	CartService.deleteItem(oControllerStub as any, [oItemA, oItemB] as any).then(function () {
		assert.ok(oDeleteA.calledOnce, "the first item was deleted");
		assert.ok(oDeleteB.calledOnce, "the second item was deleted");
		assert.strictEqual((MessageToast.show as any).callCount, 2, "one toast per deleted item");
		done();
	});
});

QUnit.test("deleteItem returns early for a falsy argument", function (assert) {
	const done = assert.async();
	const oBind = oSandbox.stub(CartService, "bindDataToFragment");

	CartService.deleteItem(oControllerStub as any, null as any).then(function () {
		assert.strictEqual(oBind.callCount, 0, "nothing was rebound");
		assert.strictEqual((MessageToast.show as any).callCount, 0, "no toast was shown");
		done();
	});
});

QUnit.test("deleteItem shows an error MessageBox when deletion fails", function (assert) {
	const done = assert.async();
	const oItem = createContext({ name: "Product A" }, "/CartItem(1)");
	oSinon.stub(oItem, "delete").returns(Promise.reject(new Error("boom")));
	oSandbox.stub(CartService, "bindDataToFragment");

	CartService.deleteItem(oControllerStub as any, oItem as any).then(function () {
		assert.strictEqual(
			(MessageBox.error as any).lastCall.args[0],
			"delete_product_error",
			"the delete error text was shown"
		);
		assert.strictEqual(oViewStub.setBusy.lastCall.args[0], false, "busy state was reset");
		done();
	});
});

QUnit.test("assignOnCompanyLoad selects the newest active cart", function (assert) {
	const done = assert.async();
	const oCart = createContext({ ID: "cart-9", items: [{}, {}, {}, {}] }, "/Cart(cart-9)");
	oControllerStub._getEntitySetContexts = oSinon.stub().returns(Promise.resolve([oCart]));

	CartService.assignOnCompanyLoad(oControllerStub as any).then(function () {
		assert.strictEqual(
			oControllerStub._getEntitySetContexts.firstCall.args[0],
			"/Cart",
			"the Cart entity set was queried"
		);
		assert.strictEqual(oGlobalProps["/selectedCart"], oCart, "the first cart became the selected cart");
		assert.strictEqual(oGlobalProps["/cartItemsQuantity"], 4, "the item quantity was taken from the cart");
		done();
	});
});

QUnit.test("assignOnCompanyLoad clears the selected cart when none exists", function (assert) {
	const done = assert.async();
	oControllerStub._getEntitySetContexts = oSinon.stub().returns(Promise.resolve([]));

	CartService.assignOnCompanyLoad(oControllerStub as any).then(function () {
		assert.deepEqual(oGlobalProps["/selectedCart"], {}, "the selected cart was cleared");
		done();
	});
});

QUnit.test("bindDataToFragment returns early when the fragment controls are missing", function (assert) {
	(Fragment.byId as any).returns(undefined);

	CartService.bindDataToFragment(oControllerStub as any);

	assert.ok((Fragment.byId as any).called, "the fragment controls were looked up");
	assert.strictEqual(oGlobalProps["/cartItemsQuantity"], 2, "no state was changed");
});

QUnit.test("bindDataToFragment binds the rows of the selected cart", function (assert) {
	const oSelectBinding = createSelectBindingStub();
	stubFragmentControls(oSelectBinding);
	const oBindRows = oSandbox.stub(oCartTable, "bindRows");
	const oBindElement = oSandbox.stub(oCartTableFooter, "bindElement");

	CartService.bindDataToFragment(oControllerStub as any);

	assert.ok(oSelectBinding.filter.calledOnce, "the select binding was filtered");
	assert.strictEqual(oSelectBinding.filter.firstCall.args[0].length, 2, "company and status filters were applied");
	assert.ok(oSelectBinding.refresh.calledOnce, "the select binding was refreshed");
	assert.strictEqual(oCartSelect.getSelectedKey(), "cart-1", "the selected cart key was set");
	assert.strictEqual(oBindRows.firstCall.args[0].path, "/Cart(cart-1)/items", "the rows were bound to the cart items");
	assert.strictEqual(oBindElement.firstCall.args[0].path, "/Cart(cart-1)", "the footer was bound to the cart");
});

QUnit.test("bindDataToFragment unbinds the table when no cart is selected", function (assert) {
	oGlobalProps["/selectedCart"] = {};
	const oSelectBinding = createSelectBindingStub();
	stubFragmentControls(oSelectBinding);
	const oUnbindRows = oSandbox.stub(oCartTable, "unbindRows");
	const oUnbindElement = oSandbox.stub(oCartTableFooter, "unbindElement");

	CartService.bindDataToFragment(oControllerStub as any);

	assert.ok(oSelectBinding.filter.calledOnce, "the select binding was filtered");
	assert.strictEqual(oGlobalProps["/cartItemsQuantity"], 0, "the item quantity was reset");
	assert.strictEqual(oCartSelect.getSelectedKey(), "", "the selected key was cleared");
	assert.ok(oUnbindElement.calledOnce, "the footer element binding was removed");
	assert.ok(oUnbindRows.calledOnce, "the table rows were unbound");
});
