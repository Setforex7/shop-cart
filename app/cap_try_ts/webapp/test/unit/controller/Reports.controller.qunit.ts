import Reports from "cap_try_ts/controller/Reports.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";
// @ts-ignore - the bundled thirdparty sinon (1.17) ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";
import Table from "sap/ui/table/Table";
import Select from "sap/m/Select";
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import { LayoutType } from "sap/f/library";

let oController: Reports;
let oSandbox: any;
let oOrdersTable: Table;
let oItemsTable: Table;
let oFCL: FlexibleColumnLayout;
let oSelect: Select;
let oView: any;
let oRouter: any;
let oRoute: any;
let oGlobalModel: any;
let oRowsBinding: any;
let oCompany: any;

QUnit.module("cap_try_ts.controller.Reports", {
    beforeEach: function () {
        oSandbox = sinon.sandbox.create();

        oOrdersTable = new Table();
        oItemsTable = new Table();
        oFCL = new FlexibleColumnLayout();
        oSelect = new Select();

        oRowsBinding = { refresh: oSandbox.stub() };
        oSandbox.stub(oOrdersTable, "bindRows");
        oSandbox.stub(oOrdersTable, "getBinding").returns(oRowsBinding);
        oSandbox.stub(oItemsTable, "bindRows");
        oSandbox.stub(oFCL, "setLayout");

        oCompany = { ID: "C1", name: "ACME" };

        oView = {
            byId: oSandbox.stub(),
            setBusy: oSandbox.stub()
        };
        oView.byId.withArgs("ordersTable").returns(oOrdersTable);
        oView.byId.withArgs("itemsTable").returns(oItemsTable);
        oView.byId.withArgs("fcl").returns(oFCL);

        oRoute = {
            attachPatternMatched: oSandbox.stub(),
            detachPatternMatched: oSandbox.stub()
        };
        oRouter = { getRoute: oSandbox.stub().returns(oRoute) };
        oGlobalModel = { refresh: oSandbox.stub() };

        oController = new Reports("Reports");

        oSandbox.stub(oController, "getView").returns(oView);
        oSandbox.stub(oController, "byId").returns(oOrdersTable);
        oSandbox.stub(oController, "getRouter").returns(oRouter);
        oSandbox.stub(oController, "getModel").returns(oGlobalModel);
        oSandbox.stub(oController, "getI18nText").returns("txt");
        oSandbox.stub(oController, "getProp").returns(oCompany);
        oSandbox.stub(oController, "setProp");
        oSandbox.stub(oController, "_getEntityContexts").returns(Promise.resolve(oCompany));
        oSandbox.stub(oController, "_onControllerLoad");
    },
    afterEach: function () {
        oSandbox.restore();
        oOrdersTable.destroy();
        oItemsTable.destroy();
        oFCL.destroy();
        oSelect.destroy();
        oController.destroy();
    }
});

QUnit.test("onInit loads the controller and attaches the route pattern matched handler", function (assert) {
    oController.onInit();

    assert.ok((oController as any)._onControllerLoad.calledOnce, "controller load logic executed once");
    assert.ok(oRouter.getRoute.calledWith("Reports"), "the Reports route was resolved");
    assert.ok(oRoute.attachPatternMatched.calledOnce, "the pattern matched handler was attached");
});

QUnit.test("onExit detaches the route pattern matched handler", function (assert) {
    oController.onExit();

    assert.ok(oRoute.detachPatternMatched.calledOnce, "the pattern matched handler was detached");
    assert.ok(oRouter.getRoute.calledWith("Reports"), "the Reports route was resolved");
});

QUnit.test("onCompanyChange stores the selection and rebinds the orders table", async function (assert) {
    oSandbox.stub(oSelect, "getSelectedKey").returns("C1");
    const oEvent: any = { getSource: function () { return oSelect; } };

    await oController.onCompanyChange(oEvent);

    assert.ok(oView.setBusy.calledWith(true), "the view was set busy while loading");
    assert.ok((oController as any).setProp.calledWith("globalModel", "/selectedCompany", oCompany), "the selected company was stored");
    assert.ok(oGlobalModel.refresh.calledWith(true), "the global model was refreshed");
    assert.ok((oOrdersTable.bindRows as any).calledOnce, "the orders table was rebound");
    assert.ok(oView.setBusy.calledWith(false), "the busy state was cleared");
});

QUnit.test("onOrdersTableRefresh refreshes the rows binding", function (assert) {
    oController.onOrdersTableRefresh();

    assert.ok(oRowsBinding.refresh.calledOnce, "the rows binding was refreshed once");
});

QUnit.test("onExportExcel builds a spreadsheet from the orders table binding", function (assert) {
    const oBuildStub = oSandbox.stub(Spreadsheet.prototype, "build").returns(Promise.resolve());
    oSandbox.stub(Spreadsheet.prototype, "destroy");

    oController.onExportExcel();

    assert.ok((oController.byId as any).calledWith("ordersTable"), "the orders table was resolved");
    assert.ok(oBuildStub.calledOnce, "the spreadsheet build was triggered once");
});

QUnit.test("onOrderPress binds the order items and expands the layout", function (assert) {
    const oContext: any = { getPath: oSandbox.stub().returns("/Orders('1')") };
    const oEvent: any = { getParameter: oSandbox.stub().returns(oContext) };

    oController.onOrderPress(oEvent);

    assert.ok((oItemsTable.bindRows as any).calledOnce, "the items table was bound");
    assert.deepEqual((oItemsTable.bindRows as any).firstCall.args[0], { path: "/Orders('1')/items" }, "the items table was bound to the order items path");
    assert.ok((oFCL.setLayout as any).calledWith(LayoutType.TwoColumnsMidExpanded), "the layout was expanded to two columns");
});

QUnit.test("onOrderPress does nothing without a row binding context", function (assert) {
    const oEvent: any = { getParameter: oSandbox.stub().returns(undefined) };

    oController.onOrderPress(oEvent);

    assert.ok((oItemsTable.bindRows as any).notCalled, "the items table was not bound");
    assert.ok((oFCL.setLayout as any).notCalled, "the layout was not changed");
});

QUnit.test("onCloseDetail collapses the layout to a single column", function (assert) {
    oController.onCloseDetail();

    assert.ok((oFCL.setLayout as any).calledWith(LayoutType.OneColumn), "the layout was reset to one column");
});
