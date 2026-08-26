// @ts-ignore -- the bundled UI5 sinon module ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import Table from "sap/ui/table/Table";
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import { LayoutType } from "sap/f/library";
import Reports from "cap_try_ts/controller/Reports.controller";

interface StubLike {
	(...args: unknown[]): unknown;
	callCount: number;
	firstCall: { args: unknown[] };
	lastCall: { args: unknown[] };
	calledWith(...args: unknown[]): boolean;
	returns(value: unknown): StubLike;
	returnsArg(index: number): StubLike;
	withArgs(...args: unknown[]): StubLike;
	restore(): void;
}

interface SandboxLike {
	stub(...args: unknown[]): StubLike;
	restore(): void;
}

interface ViewLike {
	byId: StubLike;
	setBusy: StubLike;
	getModel: StubLike;
	destroy: StubLike;
}

interface TestSetup {
	oController: Reports;
	oView: ViewLike;
	oOrdersTable: Table;
	oItemsTable: Table;
	oFCL: FlexibleColumnLayout;
	oGlobalModel: JSONModel;
	oSandbox: SandboxLike;
	oSetPropStub: StubLike;
	oRouteStub: { attachPatternMatched: StubLike; detachPatternMatched: StubLike };
	oRouterStub: { getRoute: StubLike };
	oBindingStub: { refresh: StubLike };
}

function stubMethod(oSandbox: SandboxLike, oTarget: unknown, sMethod: string): StubLike {
	const oHost = oTarget as Record<string, unknown>;
	if (typeof oHost[sMethod] === "function") {
		return oSandbox.stub(oTarget, sMethod);
	}
	const oStub = oSandbox.stub();
	oHost[sMethod] = oStub;
	return oStub;
}

QUnit.module("Reports.controller", {
	beforeEach: function (this: TestSetup) {
		this.oSandbox = sinon.sandbox.create() as SandboxLike;

		this.oOrdersTable = new Table("ordersTable");
		this.oItemsTable = new Table("itemsTable");
		this.oFCL = new FlexibleColumnLayout("fcl");
		this.oGlobalModel = new JSONModel({ selectedCompany: { ID: "company-1" } });

		const oViewByIdStub = this.oSandbox.stub();
		oViewByIdStub.returns(this.oOrdersTable);
		oViewByIdStub.withArgs("ordersTable").returns(this.oOrdersTable);
		oViewByIdStub.withArgs("itemsTable").returns(this.oItemsTable);
		oViewByIdStub.withArgs("fcl").returns(this.oFCL);

		this.oView = {
			byId: oViewByIdStub,
			setBusy: this.oSandbox.stub(),
			getModel: this.oSandbox.stub(),
			destroy: this.oSandbox.stub()
		};
		this.oView.setBusy.returns(this.oView);
		this.oView.getModel.returns(this.oGlobalModel);

		this.oBindingStub = { refresh: this.oSandbox.stub() };

		this.oRouteStub = {
			attachPatternMatched: this.oSandbox.stub(),
			detachPatternMatched: this.oSandbox.stub()
		};
		this.oRouterStub = { getRoute: this.oSandbox.stub() };
		this.oRouterStub.getRoute.returns(this.oRouteStub);

		this.oController = new Reports("Reports");

		stubMethod(this.oSandbox, this.oController, "getView").returns(this.oView);

		const oControllerByIdStub = stubMethod(this.oSandbox, this.oController, "byId");
		oControllerByIdStub.returns(this.oOrdersTable);
		oControllerByIdStub.withArgs("ordersTable").returns(this.oOrdersTable);
		oControllerByIdStub.withArgs("itemsTable").returns(this.oItemsTable);
		oControllerByIdStub.withArgs("fcl").returns(this.oFCL);

		stubMethod(this.oSandbox, this.oController, "getRouter").returns(this.oRouterStub);
		stubMethod(this.oSandbox, this.oController, "getModel").returns(this.oGlobalModel);
		stubMethod(this.oSandbox, this.oController, "getI18nText").returnsArg(0);
		stubMethod(this.oSandbox, this.oController, "getProp").returns({ ID: "company-1" });
		this.oSetPropStub = stubMethod(this.oSandbox, this.oController, "setProp");
	},
	afterEach: function (this: TestSetup) {
		this.oSandbox.restore();
		this.oOrdersTable.destroy();
		this.oItemsTable.destroy();
		this.oFCL.destroy();
		this.oGlobalModel.destroy();
	}
});

QUnit.test("onInit attaches the pattern matched handler on the Reports route", function (this: TestSetup, assert: Assert) {
	const oLoadStub = stubMethod(this.oSandbox, this.oController, "_onControllerLoad");

	this.oController.onInit();

	assert.strictEqual(oLoadStub.callCount, 1, "_onControllerLoad was called once");
	assert.ok(this.oRouterStub.getRoute.calledWith("Reports"), "the Reports route was requested");
	assert.strictEqual(this.oRouteStub.attachPatternMatched.callCount, 1, "attachPatternMatched was called once");
	assert.strictEqual(this.oRouteStub.attachPatternMatched.firstCall.args[1], this.oController, "the controller is the listener context");
});

QUnit.test("onExit detaches the pattern matched handler from the Reports route", function (this: TestSetup, assert: Assert) {
	this.oController.onExit();

	assert.ok(this.oRouterStub.getRoute.calledWith("Reports"), "the Reports route was requested");
	assert.strictEqual(this.oRouteStub.detachPatternMatched.callCount, 1, "detachPatternMatched was called once");
	assert.strictEqual(this.oRouteStub.detachPatternMatched.firstCall.args[1], this.oController, "the controller is the listener context");
});

QUnit.test("onCompanyChange stores the selected company, refreshes the model and rebinds the table", function (this: TestSetup, assert: Assert) {
	const done = assert.async();
	const oSelectedCompany = { ID: "company-42", name: "ACME" };

	const oGetContextsStub = stubMethod(this.oSandbox, this.oController, "_getEntityContexts");
	oGetContextsStub.returns(Promise.resolve(oSelectedCompany));
	const oSetBindingStub = stubMethod(this.oSandbox, this.oController, "_setOrderTableBinding");
	const oRefreshStub = this.oSandbox.stub(this.oGlobalModel, "refresh");
	const oBusyStub = this.oView.setBusy;

	const oSelect = new Select();
	this.oSandbox.stub(oSelect, "getSelectedKey").returns("company-42");
	const oEvent = { getSource: function () { return oSelect; } } as unknown as Parameters<Reports["onCompanyChange"]>[0];

	void this.oController.onCompanyChange(oEvent).then(() => {
		assert.ok(oGetContextsStub.calledWith("/Company", "company-42"), "the company entity was read with the selected key");
		assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany", oSelectedCompany), "the selected company was stored in the global model");
		assert.ok(oRefreshStub.calledWith(true), "the global model was force refreshed");
		assert.strictEqual(oSetBindingStub.callCount, 1, "the orders table binding was refreshed");
		assert.strictEqual(oBusyStub.callCount, 2, "the view was set busy and released again");
		assert.strictEqual(oBusyStub.firstCall.args[0], true, "the view was set busy first");
		assert.strictEqual(oBusyStub.lastCall.args[0], false, "the view was released at the end");
		oSelect.destroy();
		done();
	});
});

QUnit.test("onOrdersTableRefresh refreshes the rows binding of the orders table", function (this: TestSetup, assert: Assert) {
	const oGetBindingStub = this.oSandbox.stub(this.oOrdersTable, "getBinding");
	oGetBindingStub.returns(this.oBindingStub);

	this.oController.onOrdersTableRefresh();

	assert.ok(oGetBindingStub.calledWith("rows"), "the rows binding was requested");
	assert.strictEqual(this.oBindingStub.refresh.callCount, 1, "the rows binding was refreshed once");
});

QUnit.test("onExportExcel builds a spreadsheet from the rows binding", function (this: TestSetup, assert: Assert) {
	const oGetBindingStub = this.oSandbox.stub(this.oOrdersTable, "getBinding");
	oGetBindingStub.returns(this.oBindingStub);
	const aColumns = (this.oController as unknown as { _getOrdersExcelFieldsConfig: () => object[] })._getOrdersExcelFieldsConfig();

	this.oController.onExportExcel();

	assert.ok(oGetBindingStub.calledWith("rows"), "the rows binding was used as data source");
	assert.strictEqual(aColumns.length, 9, "the excel configuration declares nine columns");
	assert.deepEqual(
		aColumns.map(function (oColumn: object) { return (oColumn as { property: string }).property; }),
		["ID", "createdAt", "company/name", "company/description", "type", "status", "total_price", "currency", "createdBy"],
		"the excel configuration exports the expected order properties"
	);
});

QUnit.test("onOrderPress binds the items table and expands the mid column", function (this: TestSetup, assert: Assert) {
	const oBindRowsStub = this.oSandbox.stub(this.oItemsTable, "bindRows");
	oBindRowsStub.returns(this.oItemsTable);
	const oContext = { getPath: function () { return "/Orders('1')"; } };
	const oEvent = {
		getParameter: function () { return oContext; }
	} as unknown as Parameters<Reports["onOrderPress"]>[0];

	this.oController.onOrderPress(oEvent);

	assert.strictEqual(oBindRowsStub.callCount, 1, "the items table was bound once");
	assert.deepEqual(oBindRowsStub.firstCall.args[0], { path: "/Orders('1')/items" }, "the items binding uses the order path");
	assert.strictEqual(this.oFCL.getLayout(), LayoutType.TwoColumnsMidExpanded, "the detail column is expanded");
});

QUnit.test("onOrderPress does nothing without a row binding context", function (this: TestSetup, assert: Assert) {
	const oBindRowsStub = this.oSandbox.stub(this.oItemsTable, "bindRows");
	oBindRowsStub.returns(this.oItemsTable);
	this.oFCL.setLayout(LayoutType.OneColumn);
	const oEvent = {
		getParameter: function () { return undefined; }
	} as unknown as Parameters<Reports["onOrderPress"]>[0];

	this.oController.onOrderPress(oEvent);

	assert.strictEqual(oBindRowsStub.callCount, 0, "the items table was not bound");
	assert.strictEqual(this.oFCL.getLayout(), LayoutType.OneColumn, "the layout stayed unchanged");
});

QUnit.test("onCloseDetail collapses the layout back to one column", function (this: TestSetup, assert: Assert) {
	this.oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);

	this.oController.onCloseDetail();

	assert.strictEqual(this.oFCL.getLayout(), LayoutType.OneColumn, "the layout was reset to one column");
});
