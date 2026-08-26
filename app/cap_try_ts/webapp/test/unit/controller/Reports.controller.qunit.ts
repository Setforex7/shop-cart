import Reports from "cap_try_ts/controller/Reports.controller";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import Event from "sap/ui/base/Event";
import Table from "sap/ui/table/Table";
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import { LayoutType } from "sap/f/library";
import Spreadsheet from "sap/ui/export/Spreadsheet";

interface TestContext {
    sandbox: any;
    oController: Reports;
    oOrdersTable: Table;
    oItemsTable: Table;
    oFcl: FlexibleColumnLayout;
    oViewStub: { byId: any; setBusy: any };
    oByIdStub: any;
    oSetPropStub: any;
    oGetPropStub: any;
}

QUnit.module("cap_try_ts.controller.Reports", {
    beforeEach: function (this: TestContext) {
        this.sandbox = sinon.sandbox.create();

        this.oController = new Reports("Reports");

        this.oOrdersTable = new Table();
        this.oItemsTable = new Table();
        this.oFcl = new FlexibleColumnLayout();

        this.oViewStub = {
            byId: this.sandbox.stub(),
            setBusy: this.sandbox.stub()
        };
        this.oViewStub.byId.withArgs("ordersTable").returns(this.oOrdersTable);
        this.oViewStub.byId.withArgs("itemsTable").returns(this.oItemsTable);
        this.oViewStub.byId.withArgs("fcl").returns(this.oFcl);

        this.sandbox.stub(this.oController as any, "getView").returns(this.oViewStub);

        this.oByIdStub = this.sandbox.stub(this.oController as any, "byId");
        this.oByIdStub.withArgs("ordersTable").returns(this.oOrdersTable);

        this.sandbox.stub(this.oController as any, "getI18nText").returns("i18nText");
        this.oSetPropStub = this.sandbox.stub(this.oController as any, "setProp");
        this.oGetPropStub = this.sandbox.stub(this.oController as any, "getProp").returns({ ID: "company-1" });
        this.sandbox.stub(this.oController as any, "getModel").returns({ refresh: this.sandbox.stub() });
    },
    afterEach: function (this: TestContext) {
        this.oOrdersTable.destroy();
        this.oItemsTable.destroy();
        this.oFcl.destroy();
        this.sandbox.restore();
    }
});

QUnit.test("onInit should attach the pattern matched handler for the Reports route", function (this: TestContext, assert) {
    const oAttachStub = this.sandbox.stub();
    const oRouteStub = { attachPatternMatched: oAttachStub, detachPatternMatched: this.sandbox.stub() };
    const oGetRouteStub = this.sandbox.stub().returns(oRouteStub);
    this.sandbox.stub(this.oController as any, "getRouter").returns({ getRoute: oGetRouteStub });
    this.sandbox.stub(this.oController as any, "_onControllerLoad");

    this.oController.onInit();

    assert.ok(oGetRouteStub.calledWith("Reports"), "getRoute should be called with 'Reports'");
    assert.ok(oAttachStub.calledOnce, "attachPatternMatched should be called exactly once");
    assert.strictEqual(oAttachStub.firstCall.args[1], this.oController, "the pattern matched handler should be bound to the controller instance");
});

QUnit.test("onExit should detach the pattern matched handler for the Reports route", function (this: TestContext, assert) {
    const oDetachStub = this.sandbox.stub();
    const oRouteStub = { attachPatternMatched: this.sandbox.stub(), detachPatternMatched: oDetachStub };
    const oGetRouteStub = this.sandbox.stub().returns(oRouteStub);
    this.sandbox.stub(this.oController as any, "getRouter").returns({ getRoute: oGetRouteStub });

    this.oController.onExit();

    assert.ok(oGetRouteStub.calledWith("Reports"), "getRoute should be called with 'Reports'");
    assert.ok(oDetachStub.calledOnce, "detachPatternMatched should be called exactly once");
    assert.strictEqual(oDetachStub.firstCall.args[1], this.oController, "the pattern matched handler should be bound to the controller instance");
});

QUnit.test("onCompanyChange should store the resolved company and rebind the orders table", async function (this: TestContext, assert) {
    const oFakeCompanyContext = { ID: "company-1" };
    const oGetEntityContextsStub = this.sandbox.stub(this.oController as any, "_getEntityContexts").returns(Promise.resolve(oFakeCompanyContext));
    const oBindRowsStub = this.sandbox.stub(this.oOrdersTable, "bindRows");

    const oSelectStub = { getSelectedKey: this.sandbox.stub().returns("company-1") };
    const oEvent = { getSource: this.sandbox.stub().returns(oSelectStub) } as unknown as Event<Record<string, unknown>>;

    await this.oController.onCompanyChange(oEvent);

    assert.ok(oGetEntityContextsStub.calledWith("/Company", "company-1"), "the selected company should be looked up by its selected key");
    assert.ok(this.oViewStub.setBusy.calledWith(true), "the view should be marked busy while the company is loading");
    assert.ok(this.oViewStub.setBusy.calledWith(false), "the view busy state should be cleared once loading finishes");
    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany", oFakeCompanyContext), "the resolved company should be stored on the global model");
    assert.ok(oBindRowsStub.calledOnce, "the orders table rows binding should be refreshed for the new company");
    const oBindingInfo = oBindRowsStub.firstCall.args[0];
    assert.strictEqual(oBindingInfo.path, "/Orders", "the orders table should be bound to the /Orders path");
});

QUnit.test("onOrdersTableRefresh should refresh the rows binding of the orders table", function (this: TestContext, assert) {
    const oRefreshStub = this.sandbox.stub();
    this.sandbox.stub(this.oOrdersTable, "getBinding").withArgs("rows").returns({ refresh: oRefreshStub });

    this.oController.onOrdersTableRefresh();

    assert.ok(oRefreshStub.calledOnce, "the rows binding of the orders table should be refreshed once");
});

QUnit.test("onExportExcel should build and destroy a Spreadsheet export of the orders table", async function (this: TestContext, assert) {
    this.sandbox.stub(this.oOrdersTable, "getBinding").withArgs("rows").returns({});
    const oBuildStub = this.sandbox.stub(Spreadsheet.prototype, "build").returns(Promise.resolve());
    const oDestroySpy = this.sandbox.spy(Spreadsheet.prototype, "destroy");

    this.oController.onExportExcel();

    assert.ok(this.oByIdStub.calledWith("ordersTable"), "the orders table should be looked up to export its rows");
    assert.ok(oBuildStub.calledOnce, "the spreadsheet build should be triggered for the export");

    await Promise.resolve();
    await Promise.resolve();

    assert.ok(oDestroySpy.calledOnce, "the spreadsheet instance should be destroyed after building completes");
});

QUnit.test("onOrderPress should bind the items table to the pressed order and expand the detail column", function (this: TestContext, assert) {
    const oBindRowsStub = this.sandbox.stub(this.oItemsTable, "bindRows");
    const oSetLayoutStub = this.sandbox.stub(this.oFcl, "setLayout");

    const oFakeContext = { getPath: this.sandbox.stub().returns("/Orders('1')") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowBindingContext").returns(oFakeContext) } as unknown as Event<Record<string, unknown>>;

    this.oController.onOrderPress(oEvent);

    assert.ok(oBindRowsStub.calledWith({ path: "/Orders('1')/items" }), "the items table should be bound to the selected order's items");
    assert.ok(oSetLayoutStub.calledWith(LayoutType.TwoColumnsMidExpanded), "the layout should expand to show the detail column");
});

QUnit.test("onOrderPress should do nothing when no row binding context is provided", function (this: TestContext, assert) {
    const oBindRowsStub = this.sandbox.stub(this.oItemsTable, "bindRows");
    const oSetLayoutStub = this.sandbox.stub(this.oFcl, "setLayout");

    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowBindingContext").returns(undefined) } as unknown as Event<Record<string, unknown>>;

    this.oController.onOrderPress(oEvent);

    assert.notOk(oBindRowsStub.called, "the items table should not be rebound without a row context");
    assert.notOk(oSetLayoutStub.called, "the layout should not change without a row context");
});

QUnit.test("onCloseDetail should collapse the layout back to one column", function (this: TestContext, assert) {
    const oSetLayoutStub = this.sandbox.stub(this.oFcl, "setLayout");

    this.oController.onCloseDetail();

    assert.ok(oSetLayoutStub.calledWith(LayoutType.OneColumn), "the layout should be reset to one column");
});
