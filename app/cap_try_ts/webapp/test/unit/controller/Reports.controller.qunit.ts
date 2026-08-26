// @ts-ignore -- UI5 ships sinon as a module without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import Reports from "cap_try_ts/controller/Reports.controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import Event from "sap/ui/base/Event";
import { LayoutType } from "sap/f/library";

type AnyRecord = Record<string, unknown>;
type ReportsEvent = Event<Record<string, unknown>>;

interface StubLike {
	(...args: unknown[]): unknown;
	callCount: number;
	firstCall: { args: unknown[] };
	returns(vValue: unknown): StubLike;
	returnsArg(iIndex: number): StubLike;
	withArgs(...args: unknown[]): StubLike;
}

interface SandboxLike {
	stub(oTarget?: unknown, sMethod?: string): StubLike;
	spy(oTarget?: unknown, sMethod?: string): StubLike;
	restore(): void;
}

interface FakeTable {
	bindRows: StubLike;
	getBinding: StubLike;
}

interface FakeFCL {
	setLayout(sLayout: string): void;
	getLayout(): string;
}

interface FakeView {
	byId(sId: string): unknown;
	setBusy(bBusy: boolean): void;
	getBusy(): boolean;
	setModel(oModel?: unknown, sName?: string): void;
	getModel(sName?: string): unknown;
	destroy(): void;
}

interface TestHooks {
	oSandbox: SandboxLike;
	oController: Reports;
	oGlobalModel: JSONModel;
	oRefreshSpy: StubLike;
	oODataModel: AnyRecord;
	oComponent: AnyRecord;
	oRouter: AnyRecord;
	oRoute: AnyRecord;
	oView: FakeView;
	oOrdersTable: FakeTable;
	oItemsTable: FakeTable;
	oFCL: FakeFCL;
	oRowsBindingRefresh: StubLike;
	oBindContextStub: StubLike;
	oGetRouteStub: StubLike;
	oAttachStub: StubLike;
	oDetachStub: StubLike;
	oGetTextStub: StubLike;
	oRequestObjectResult: AnyRecord;
}

QUnit.module("cap_try_ts.controller.Reports", {
	beforeEach: function (this: TestHooks) {
		this.oSandbox = sinon.sandbox.create() as SandboxLike;

		// --- models --------------------------------------------------------------
		this.oGlobalModel = new JSONModel({
			selectedCompany: { ID: "company-1", name: "Initial" },
			userInfo: { id: "alice", roles: ["admin"] }
		});
		this.oRefreshSpy = this.oSandbox.spy(this.oGlobalModel, "refresh");

		this.oRequestObjectResult = { ID: "company-42", name: "ACME" };
		const oContextBinding = {
			requestObject: () => Promise.resolve(this.oRequestObjectResult)
		};
		this.oBindContextStub = sinon.stub() as StubLike;
		this.oBindContextStub.returns(oContextBinding);
		this.oODataModel = {
			bindContext: this.oBindContextStub,
			refresh: sinon.stub() as StubLike
		};

		// --- fake controls -------------------------------------------------------
		this.oRowsBindingRefresh = sinon.stub() as StubLike;
		const oGetBindingStub = sinon.stub() as StubLike;
		oGetBindingStub.returns({ refresh: this.oRowsBindingRefresh });

		this.oOrdersTable = {
			bindRows: sinon.stub() as StubLike,
			getBinding: oGetBindingStub
		};
		this.oItemsTable = {
			bindRows: sinon.stub() as StubLike,
			getBinding: sinon.stub() as StubLike
		};

		let sLayout: string = LayoutType.OneColumn;
		this.oFCL = {
			setLayout: (sNewLayout: string) => {
				sLayout = sNewLayout;
			},
			getLayout: () => sLayout
		};

		const mControls: Record<string, unknown> = {
			ordersTable: this.oOrdersTable,
			itemsTable: this.oItemsTable,
			fcl: this.oFCL
		};

		// --- fake view (sap.ui.core.mvc.View is abstract, so a stand-in is used) --
		let bViewBusy = false;
		this.oView = {
			byId: (sId: string) => mControls[sId],
			setBusy: (bBusy: boolean) => {
				bViewBusy = bBusy;
			},
			getBusy: () => bViewBusy,
			setModel: () => undefined,
			getModel: () => undefined,
			destroy: () => undefined
		};

		// --- router --------------------------------------------------------------
		this.oAttachStub = sinon.stub() as StubLike;
		this.oDetachStub = sinon.stub() as StubLike;
		this.oRoute = {
			attachPatternMatched: this.oAttachStub,
			detachPatternMatched: this.oDetachStub
		};
		this.oGetRouteStub = sinon.stub() as StubLike;
		this.oGetRouteStub.returns(this.oRoute);
		this.oRouter = {
			getRoute: this.oGetRouteStub,
			navTo: sinon.stub() as StubLike
		};

		// --- owner component -----------------------------------------------------
		const oGetModelStub = sinon.stub() as StubLike;
		oGetModelStub.returns(this.oODataModel);
		oGetModelStub.withArgs(undefined).returns(this.oODataModel);
		oGetModelStub.withArgs("globalModel").returns(this.oGlobalModel);
		this.oComponent = {
			getModel: oGetModelStub,
			getRouter: () => this.oRouter
		};

		this.oGetTextStub = sinon.stub() as StubLike;
		this.oGetTextStub.returnsArg(0);

		// --- controller ----------------------------------------------------------
		this.oController = new Reports("cap_try_ts.controller.Reports");
		this.oSandbox.stub(this.oController, "getOwnerComponent").returns(this.oComponent);
		this.oSandbox.stub(this.oController, "getView").returns(this.oView);
		this.oSandbox.stub(this.oController, "byId").returns(this.oOrdersTable);

		// Wire the private collaborators the inherited API delegates to.
		const oInternals = this.oController as unknown as AnyRecord;
		oInternals._i18n = { getText: this.oGetTextStub };
		oInternals._oRouter = this.oRouter;
	},

	afterEach: function (this: TestHooks) {
		this.oGlobalModel.destroy();
		this.oSandbox.restore();
		this.oController.destroy();
	}
});

QUnit.test("onInit loads the controller and attaches the Reports pattern matched handler", function (this: TestHooks, assert: Assert) {
	const oLoadStub = this.oSandbox.stub(this.oController, "_onControllerLoad");

	this.oController.onInit();

	assert.strictEqual(oLoadStub.callCount, 1, "_onControllerLoad was called once");
	assert.strictEqual(this.oGetRouteStub.firstCall.args[0], "Reports", "the Reports route was requested");
	assert.strictEqual(this.oAttachStub.callCount, 1, "attachPatternMatched was called once");
	assert.strictEqual(this.oAttachStub.firstCall.args[0], this.oController._onObjectMatched,
		"the inherited _onObjectMatched handler is attached");
	assert.strictEqual(this.oAttachStub.firstCall.args[1], this.oController,
		"the controller is passed as listener context");
});

QUnit.test("onExit detaches the Reports pattern matched handler", function (this: TestHooks, assert: Assert) {
	this.oController.onExit();

	assert.strictEqual(this.oGetRouteStub.firstCall.args[0], "Reports", "the Reports route was requested");
	assert.strictEqual(this.oDetachStub.callCount, 1, "detachPatternMatched was called once");
	assert.strictEqual(this.oDetachStub.firstCall.args[0], this.oController._onObjectMatched,
		"the same handler reference is detached");
	assert.strictEqual(this.oDetachStub.firstCall.args[1], this.oController,
		"the controller is passed as listener context");
});

QUnit.test("onCompanyChange stores the selected company, refreshes the model and rebinds the table", function (this: TestHooks, assert: Assert) {
	const done = assert.async();
	const oEvent = {
		getSource: () => ({ getSelectedKey: () => "company-42" })
	} as unknown as ReportsEvent;

	void this.oController.onCompanyChange(oEvent).then(() => {
		assert.strictEqual(this.oBindContextStub.callCount, 1, "the company entity was read once");
		assert.strictEqual(this.oBindContextStub.firstCall.args[0], "/Company('company-42')",
			"the keyed company path was built from the selected key");
		assert.deepEqual(this.oGlobalModel.getProperty("/selectedCompany"), this.oRequestObjectResult,
			"the selected company was written into the global model");
		assert.strictEqual(this.oRefreshSpy.callCount, 1, "the global model was refreshed once");
		assert.strictEqual(this.oRefreshSpy.firstCall.args[0], true, "the global model is force refreshed");
		assert.strictEqual(this.oOrdersTable.bindRows.callCount, 1, "the orders table rows were rebound");

		const oBindingInfo = this.oOrdersTable.bindRows.firstCall.args[0] as AnyRecord;
		assert.strictEqual(oBindingInfo.path, "/Orders", "the rows binding points to the Orders entity set");
		assert.deepEqual(oBindingInfo.parameters, { $expand: "company,items" },
			"company and items are expanded");

		const oFilter = oBindingInfo.filters as Filter;
		assert.ok(oFilter instanceof Filter, "a filter instance was created");
		assert.strictEqual((oFilter as unknown as AnyRecord).sPath, "company_ID", "the filter targets the company");
		assert.strictEqual((oFilter as unknown as AnyRecord).oValue1, "company-42",
			"the filter uses the newly selected company id");
		assert.strictEqual(this.oView.getBusy(), false, "the view busy state was reset");
		done();
	});
});

QUnit.test("onOrdersTableRefresh refreshes the rows binding of the orders table", function (this: TestHooks, assert: Assert) {
	this.oController.onOrdersTableRefresh();

	assert.strictEqual(this.oOrdersTable.getBinding.callCount, 1, "the binding was requested once");
	assert.strictEqual(this.oOrdersTable.getBinding.firstCall.args[0], "rows", "the rows aggregation binding is used");
	assert.strictEqual(this.oRowsBindingRefresh.callCount, 1, "refresh was called exactly once on the rows binding");
});

QUnit.test("_getOrdersExcelFieldsConfig describes the nine exported order columns", function (this: TestHooks, assert: Assert) {
	const aColumns = (this.oController as unknown as { _getOrdersExcelFieldsConfig(): AnyRecord[] })
		._getOrdersExcelFieldsConfig();

	assert.strictEqual(aColumns.length, 9, "nine excel columns are configured");
	assert.deepEqual(
		aColumns.map((oColumn) => oColumn.property as string),
		["ID", "createdAt", "company/name", "company/description", "type", "status", "total_price", "currency", "createdBy"],
		"every exported property is configured in order"
	);
	assert.strictEqual(aColumns[0].label, "order_id", "column labels are resolved through the resource bundle");
	assert.strictEqual(aColumns[1].type, "date", "the creation date is exported as a date");
	assert.strictEqual(aColumns[6].type, "number", "the total price is exported as a number");
	assert.strictEqual(aColumns[6].scale, 2, "the total price keeps two decimals");
	assert.strictEqual(this.oGetTextStub.callCount, 9, "one bundle lookup per column label");
	assert.strictEqual(typeof (this.oController as unknown as AnyRecord).onExportExcel, "function",
		"onExportExcel is implemented on the controller");
});

QUnit.test("onOrderPress binds the items table and expands the mid column", function (this: TestHooks, assert: Assert) {
	const oEvent = {
		getParameter: (sName: string) =>
			sName === "rowBindingContext" ? { getPath: () => "/Orders('1')" } : undefined
	} as unknown as ReportsEvent;

	this.oController.onOrderPress(oEvent);

	assert.strictEqual(this.oItemsTable.bindRows.callCount, 1, "the items table rows were bound");
	assert.deepEqual(this.oItemsTable.bindRows.firstCall.args[0], { path: "/Orders('1')/items" },
		"the binding path points to the items of the pressed order");
	assert.strictEqual(this.oFCL.getLayout(), LayoutType.TwoColumnsMidExpanded, "the FCL shows the detail column");
});

QUnit.test("onOrderPress does nothing when the row has no binding context", function (this: TestHooks, assert: Assert) {
	this.oFCL.setLayout(LayoutType.OneColumn);
	const oEvent = {
		getParameter: () => undefined
	} as unknown as ReportsEvent;

	this.oController.onOrderPress(oEvent);

	assert.strictEqual(this.oItemsTable.bindRows.callCount, 0, "no binding is created");
	assert.strictEqual(this.oFCL.getLayout(), LayoutType.OneColumn, "the layout stays unchanged");
});

QUnit.test("onCloseDetail collapses the FlexibleColumnLayout to one column", function (this: TestHooks, assert: Assert) {
	this.oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);

	this.oController.onCloseDetail();

	assert.strictEqual(this.oFCL.getLayout(), LayoutType.OneColumn, "the layout is reset to a single column");
});
