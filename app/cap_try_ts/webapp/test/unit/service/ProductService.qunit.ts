// @ts-ignore -- the UI5 bundled sinon ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import ProductService from "cap_try_ts/service/ProductService";
import JSONModel from "sap/ui/model/json/JSONModel";

type AnyObject = Record<string, unknown>;

interface FakeStub {
	callCount: number;
	firstCall: { args: unknown[] };
	calledWith(...aArgs: unknown[]): boolean;
	returns(vValue: unknown): FakeStub;
}

interface FakeSandbox {
	stub(oObject: object, sMethod: string): FakeStub;
	restore(): void;
}

interface FakeView {
	bindElement(mParameters?: AnyObject): void;
	setBusy(bBusy?: boolean): void;
}

const createSandbox = function (): FakeSandbox {
	return (sinon as { sandbox: { create(): FakeSandbox } }).sandbox.create();
};

interface TestContext {
	sandbox: FakeSandbox;
	oView: FakeView;
	oGlobalModel: JSONModel;
	oController: AnyObject;
	oModel: AnyObject;
	oListBinding: AnyObject;
	oDialogHandler: AnyObject;
	aMessages: AnyObject[];
	createdContext: AnyObject;
}

QUnit.module("service/ProductService", {
	beforeEach: function (this: TestContext) {
		this.sandbox = createSandbox();

		this.oView = {
			bindElement: function () {
				/* stubbed in the tests */
			},
			setBusy: function () {
				/* stubbed in the tests */
			}
		};

		this.oGlobalModel = new JSONModel({
			selectedCompany: { ID: "company-1" },
			product: { name: "draft" }
		});

		this.aMessages = [];

		this.createdContext = {
			created: function () {
				return Promise.resolve();
			},
			getObject: function () {
				return { name: "Widget" };
			}
		};

		const that = this;

		this.oListBinding = {
			createdRows: [] as AnyObject[],
			create: function (oData: AnyObject) {
				(this.createdRows as AnyObject[]).push(oData);
				return that.createdContext;
			}
		};

		this.oModel = {
			bindListCalls: [] as unknown[][],
			submitBatchCalls: [] as string[],
			bindList: function (...aArgs: unknown[]) {
				(this.bindListCalls as unknown[][]).push(aArgs);
				return that.oListBinding;
			},
			submitBatch: function (sGroup: string) {
				(this.submitBatchCalls as string[]).push(sGroup);
				return Promise.resolve();
			}
		};

		this.oDialogHandler = {
			closeAddProductCalls: 0,
			_closeAddProductDialog: function () {
				this.closeAddProductCalls = (this.closeAddProductCalls as number) + 1;
			}
		};

		this.oController = {
			setPropCalls: [] as unknown[][],
			getModel: function () {
				return that.oModel;
			},
			getView: function () {
				return that.oView;
			},
			getDialogHandler: function () {
				return that.oDialogHandler;
			},
			getI18nText: function (sKey: string, aArgs?: unknown[]) {
				return aArgs && aArgs.length ? sKey + ":" + String(aArgs[0]) : sKey;
			},
			getProp: function (sModel: string, sPath: string) {
				return (that.oGlobalModel.getProperty(sPath) || {}) as AnyObject;
			},
			setProp: function (sModel: string, sPath: string, vValue: unknown) {
				(this.setPropCalls as unknown[][]).push([sModel, sPath, vValue]);
				that.oGlobalModel.setProperty(sPath, vValue);
			},
			_addMessage: function (oMessage: AnyObject) {
				that.aMessages.push(oMessage);
			}
		};
	},
	afterEach: function (this: TestContext) {
		this.sandbox.restore();
		this.oGlobalModel.destroy();
	}
});

QUnit.test("create binds the Products list, creates the product and reports success", async function (this: TestContext, assert) {
	const oBindElement = this.sandbox.stub(this.oView, "bindElement");
	const oSetBusy = this.sandbox.stub(this.oView, "setBusy");

	await ProductService.create(this.oController as never, {
		name: "Widget",
		description: "A widget",
		company_ID: "company-1",
		price: 10,
		stock_min: 1,
		stock: 5
	});

	assert.strictEqual((this.oModel.bindListCalls as unknown[][]).length, 1, "bindList was called once");
	assert.strictEqual((this.oModel.bindListCalls as unknown[][])[0][0], "/Products", "bindList used the Products entity set");
	assert.strictEqual((this.oListBinding.createdRows as AnyObject[]).length, 1, "one product was created");
	assert.strictEqual(this.aMessages.length, 1, "one message was added");
	assert.strictEqual(this.aMessages[0].type, "Success", "a success message was added");
	assert.strictEqual(this.oDialogHandler.closeAddProductCalls, 1, "the add product dialog was closed");
	assert.deepEqual((this.oController.setPropCalls as unknown[][])[0], ["globalModel", "/product", {}], "the product draft was reset");
	assert.strictEqual(oBindElement.callCount, 1, "loadByCompany rebound the view");
	assert.ok(oSetBusy.calledWith(false), "the view busy state was cleared");
});

QUnit.test("create reports an error message when creation fails", async function (this: TestContext, assert) {
	this.createdContext.created = function () {
		return Promise.reject(new Error("boom"));
	};

	await ProductService.create(this.oController as never, {
		name: "Broken",
		description: "",
		company_ID: "company-1",
		price: 1,
		stock_min: 0,
		stock: 0
	});

	assert.strictEqual(this.aMessages.length, 1, "one message was added");
	assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
	assert.strictEqual(this.aMessages[0].subtitle, "create_product_error:Broken", "the error message names the product");
	assert.strictEqual(this.oDialogHandler.closeAddProductCalls, 0, "the dialog stays open on failure");
});

QUnit.test("createBatch creates every product with the selected company and submits the batch", async function (this: TestContext, assert) {
	this.sandbox.stub(this.oView, "bindElement");
	this.sandbox.stub(this.oView, "setBusy");

	await ProductService.createBatch(this.oController as never, [
		{ name: "A", price: 1 },
		{ name: "B", price: 2 }
	]);

	const aRows = this.oListBinding.createdRows as AnyObject[];
	assert.strictEqual(aRows.length, 2, "both products were created");
	assert.strictEqual(aRows[0].company_ID, "company-1", "the selected company was assigned to the first product");
	assert.strictEqual(aRows[1].company_ID, "company-1", "the selected company was assigned to the second product");
	assert.deepEqual(this.oModel.submitBatchCalls, ["editProducts"], "the editProducts batch group was submitted");
	assert.strictEqual(this.aMessages.length, 2, "one success message per product");
	assert.strictEqual(this.aMessages[1].subtitle, "product_created_success:B", "the message names the product");
});

QUnit.test("createBatch reports an error when the batch submit fails", async function (this: TestContext, assert) {
	this.oModel.submitBatch = function () {
		return Promise.reject(new Error("batch failed"));
	};

	await ProductService.createBatch(this.oController as never, [{ name: "A" }]);

	assert.strictEqual(this.aMessages.length, 1, "one message was added");
	assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
	assert.strictEqual(this.aMessages[0].subtitle, "create_product_error", "the generic create error text was used");
});

QUnit.test("edit writes every changed property onto the context and submits the update batch", async function (this: TestContext, assert) {
	const mWritten: AnyObject = {};
	const oMetadata = {
		setProperty: function (sKey: string, vValue: unknown) {
			mWritten[sKey] = vValue;
		}
	};

	await ProductService.edit(this.oController as never, {
		metadata: oMetadata as never,
		name: "Widget",
		description: "Updated",
		price: 42,
		stock: 7,
		stock_min: 2
	});

	assert.deepEqual(mWritten, {
		name: "Widget",
		description: "Updated",
		price: 42,
		stock: 7,
		stock_min: 2
	}, "all editable properties were written to the context");
	assert.deepEqual(this.oModel.submitBatchCalls, ["updateProducts"], "the updateProducts batch group was submitted");
	assert.strictEqual(this.aMessages.length, 1, "one message was added");
	assert.strictEqual(this.aMessages[0].type, "Success", "a success message was added");
});

QUnit.test("edit reports an error when the update batch fails", async function (this: TestContext, assert) {
	this.oModel.submitBatch = function () {
		return Promise.reject(new Error("nope"));
	};
	const oMetadata = { setProperty: function () { /* noop */ } };

	await ProductService.edit(this.oController as never, {
		metadata: oMetadata as never,
		name: "Widget",
		description: "d",
		price: 1,
		stock: 1,
		stock_min: 1
	});

	assert.strictEqual(this.aMessages.length, 1, "one message was added");
	assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
	assert.strictEqual(this.aMessages[0].subtitle, "edit_product_error:Widget", "the error message names the product");
});

QUnit.test("delete removes a single context and reloads the company products", async function (this: TestContext, assert) {
	const oBindElement = this.sandbox.stub(this.oView, "bindElement");
	this.sandbox.stub(this.oView, "setBusy");
	const aDeleteGroups: string[] = [];

	const oContext = {
		getObject: function () {
			return { name: "Widget" };
		},
		delete: function (sGroup: string) {
			aDeleteGroups.push(sGroup);
			return Promise.resolve();
		}
	};

	await ProductService.delete(this.oController as never, oContext as never);

	assert.deepEqual(aDeleteGroups, ["$auto"], "the context was deleted in the $auto group");
	assert.strictEqual(oBindElement.callCount, 1, "the view was rebound after the delete");
});

QUnit.test("delete removes every context of an array", async function (this: TestContext, assert) {
	this.sandbox.stub(this.oView, "bindElement");
	this.sandbox.stub(this.oView, "setBusy");
	const aDeleted: string[] = [];

	const fnMakeContext = function (sName: string) {
		return {
			getObject: function () {
				return { name: sName };
			},
			delete: function () {
				aDeleted.push(sName);
				return Promise.resolve();
			}
		};
	};

	await ProductService.delete(this.oController as never, [
		fnMakeContext("A"),
		fnMakeContext("B")
	] as never);

	assert.deepEqual(aDeleted, ["A", "B"], "every product of the array was deleted");
});

QUnit.test("delete does nothing when no context is passed", async function (this: TestContext, assert) {
	const oBindElement = this.sandbox.stub(this.oView, "bindElement");

	await ProductService.delete(this.oController as never, null as never);

	assert.strictEqual(oBindElement.callCount, 0, "the view was not rebound");
	assert.strictEqual(this.aMessages.length, 0, "no message was added");
});

QUnit.test("delete clears the busy state when the deletion fails", async function (this: TestContext, assert) {
	const oSetBusy = this.sandbox.stub(this.oView, "setBusy");
	const oBindElement = this.sandbox.stub(this.oView, "bindElement");

	const oContext = {
		getObject: function () {
			return { name: "Widget" };
		},
		delete: function () {
			return Promise.reject(new Error("cannot delete"));
		}
	};

	await ProductService.delete(this.oController as never, oContext as never);

	assert.ok(oSetBusy.calledWith(false), "the busy state was cleared");
	assert.strictEqual(oBindElement.callCount, 0, "the view was not rebound after a failure");
});

QUnit.test("loadByCompany binds the view to the selected company and clears busy", function (this: TestContext, assert) {
	const oBindElement = this.sandbox.stub(this.oView, "bindElement");
	const oSetBusy = this.sandbox.stub(this.oView, "setBusy");

	ProductService.loadByCompany(this.oController as never);

	assert.strictEqual(oBindElement.callCount, 1, "bindElement was called once");
	assert.deepEqual(oBindElement.firstCall.args[0], { path: "/Company('company-1')" }, "the view was bound to the selected company");
	assert.ok(oSetBusy.calledWith(false), "the busy state was cleared");
});
