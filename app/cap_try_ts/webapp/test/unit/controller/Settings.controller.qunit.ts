import Settings from "cap_try_ts/controller/Settings.controller";
import Fragment from "sap/ui/core/Fragment";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import QUnit from "sap/ui/thirdparty/qunit-2";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";

let oController: any;
let oSandbox: any;
let aControls: any[];

QUnit.module("cap_try_ts.controller.Settings", {
    beforeEach: function (): void {
        oSandbox = (sinon as any).sandbox.create();
        aControls = [];
        oController = new (Settings as any)("cap_try_ts.controller.Settings");
    },
    afterEach: function (): void {
        oSandbox.restore();
        aControls.forEach(function (oControl: any): void {
            if (oControl && typeof oControl.destroy === "function") {
                oControl.destroy();
            }
        });
        try {
            if (oController && typeof oController.destroy === "function") {
                oController.destroy();
            }
        } catch (oError) {
            // controller was not wired to a view in the unit context
        }
    }
});

QUnit.test("onInit attaches the pattern matched handler", function (assert: any): void {
    const fnAttach = oSandbox.stub();
    const oRoute = { attachPatternMatched: fnAttach };
    oController.getRouter = oSandbox.stub().returns({ getRoute: oSandbox.stub().returns(oRoute) });
    oController._onControllerLoad = oSandbox.stub();

    oController.onInit();

    assert.ok(oController._onControllerLoad.calledOnce, "_onControllerLoad was invoked");
    assert.ok(fnAttach.calledOnce, "attachPatternMatched was invoked once");
});

QUnit.test("onExit detaches the pattern matched handler", function (assert: any): void {
    const fnDetach = oSandbox.stub();
    const oRoute = { detachPatternMatched: fnDetach };
    oController.getRouter = oSandbox.stub().returns({ getRoute: oSandbox.stub().returns(oRoute) });

    oController.onExit();

    assert.ok(fnDetach.calledOnce, "detachPatternMatched was invoked once");
});

QUnit.test("onCreateCompany reads the selected company from the global model", async function (assert: any): Promise<void> {
    oController.getProp = oSandbox.stub().returns({ name: "Acme", description: "d", capital: 10, currency_code: "EUR" });
    oController.onCompaniesTableRefresh = oSandbox.stub();
    oController.onClearSelectedCompanyData = oSandbox.stub();

    try {
        await oController.onCreateCompany();
    } catch (oError) {
        // CompanyService is not wired to a backend in the unit context
    }

    assert.ok(
        oController.getProp.calledWith("globalModel", "/selectedCompany"),
        "selected company data is read from the global model"
    );
});

QUnit.test("onEditCompany skips editing when no metadata is present", async function (assert: any): Promise<void> {
    oController.getProp = oSandbox.stub().returns({ name: "Acme" });
    oController.onCompaniesTableRefresh = oSandbox.stub();

    await oController.onEditCompany();

    assert.ok(oController.getProp.calledWith("globalModel", "/selectedCompany"), "selected company data is read");
    assert.ok(oController.onCompaniesTableRefresh.notCalled, "the table is not refreshed without metadata");
});

QUnit.test("onCompanyTabSelect switches the selection mode based on the chosen tab", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    oController.getModel = oSandbox.stub().returns({ refresh: oSandbox.stub(), setProperty: oSandbox.stub() });
    const oTable = { setSelectionMode: oSandbox.stub() };
    oController.getView = oSandbox.stub().returns({ byId: oSandbox.stub().returns(oTable) });
    const oEvent = { getParameter: oSandbox.stub().returns("create") };

    oController.onCompanyTabSelect(oEvent);

    assert.ok(oTable.setSelectionMode.calledWith("None"), "selection mode is None for the create tab");
});

QUnit.test("onCompaniesSelectedCancelPress clears the selected company", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    oController.getModel = oSandbox.stub().returns({ refresh: oSandbox.stub(), setProperty: oSandbox.stub() });

    oController.onCompaniesSelectedCancelPress();

    assert.ok(
        oController.setProp.called || oController.getModel.called,
        "clearing the selection interacts with the model"
    );
});

QUnit.test("onCompaniesTableRefresh refreshes the rows binding", function (assert: any): void {
    const oBinding = { refresh: oSandbox.stub() };
    const oTable = { getBinding: oSandbox.stub().returns(oBinding) };
    oController.getView = oSandbox.stub().returns({ byId: oSandbox.stub().returns(oTable) });

    oController.onCompaniesTableRefresh();

    assert.ok(oBinding.refresh.calledOnce, "the rows binding was refreshed");
});

QUnit.test("onCompaniesTableSelection stores the selected company context", async function (assert: any): Promise<void> {
    const oRowContext = { getPath: oSandbox.stub().returns("/Company('1')") };
    const oEvent = { getParameter: oSandbox.stub() };
    oEvent.getParameter.withArgs("rowContext").returns(oRowContext);

    const oCompanyBinding = {
        requestObject: oSandbox.stub().returns(Promise.resolve({ name: "Acme" })),
        getBoundContext: oSandbox.stub().returns({})
    };
    const oODataModel = { bindContext: oSandbox.stub().returns(oCompanyBinding) };
    oController.getModel = oSandbox.stub().returns(oODataModel);
    oController.getModel.withArgs("globalModel").returns({ refresh: oSandbox.stub() });
    oController.setProp = oSandbox.stub();

    await oController.onCompaniesTableSelection(oEvent);

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany"),
        "the selected company is written to the global model"
    );
});

QUnit.test("onClearSelectedCompanyData resets the selected company", function (assert: any): void {
    const oModel = { refresh: oSandbox.stub() };
    oController.setProp = oSandbox.stub();
    oController.getModel = oSandbox.stub().returns(oModel);

    oController.onClearSelectedCompanyData();

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany", {}),
        "the selected company is reset to an empty object"
    );
    assert.ok(oModel.refresh.calledWith(true), "the global model is refreshed");
});

QUnit.test("onCreateCompanyNameChange writes the name to the global model", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    const oEvent = { getParameter: oSandbox.stub().returns("Acme") };

    oController.onCreateCompanyNameChange(oEvent);

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany/name", "Acme"),
        "the company name is stored"
    );
});

QUnit.test("onCreateCompanyDescriptionChange writes the description to the global model", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    const oEvent = { getParameter: oSandbox.stub().returns("A description") };

    oController.onCreateCompanyDescriptionChange(oEvent);

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany/description", "A description"),
        "the company description is stored"
    );
});

QUnit.test("onCreateCompanyCapitalChange writes the capital to the global model", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    const oEvent = { getParameter: oSandbox.stub().returns("5000") };

    oController.onCreateCompanyCapitalChange(oEvent);

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany/capital", "5000"),
        "the company capital is stored"
    );
});

QUnit.test("onCreateCompanyCurrencyChange writes the currency code to the global model", function (assert: any): void {
    oController.setProp = oSandbox.stub();
    const oEvent = { getParameter: oSandbox.stub() };
    oEvent.getParameter.withArgs("selectedItem").returns({ getKey: oSandbox.stub().returns("USD") });

    oController.onCreateCompanyCurrencyChange(oEvent);

    assert.ok(
        oController.setProp.calledWith("globalModel", "/selectedCompany/currency_code", "USD"),
        "the company currency code is stored"
    );
});

QUnit.test("onSideBarItemSelect opens the carts fragment for the carts item", function (assert: any): void {
    const oDialogHandler = { _openCartsFragment: oSandbox.stub(), _openCompaniesFragment: oSandbox.stub() };
    oController.getDialogHandler = oSandbox.stub().returns(oDialogHandler);
    const oEvent = { getParameter: oSandbox.stub() };
    oEvent.getParameter.withArgs("item").returns({ getKey: oSandbox.stub().returns("carts") });

    oController.onSideBarItemSelect(oEvent);

    assert.ok(oDialogHandler._openCartsFragment.calledOnce, "the carts fragment was opened");
});

QUnit.test("onCompanyChange filters the carts table by company", function (assert: any): void {
    const oView = { getId: oSandbox.stub().returns("view") };
    oController.getView = oSandbox.stub().returns(oView);

    const oCartsBinding = { filter: oSandbox.stub() };
    const oCartsTable = { getBinding: oSandbox.stub().returns(oCartsBinding) };
    const oCartItemsTable = { unbindRows: oSandbox.stub() };

    const oFragmentStub = oSandbox.stub(Fragment, "byId");
    oFragmentStub.withArgs("view", "cartsFragmentTable").returns(oCartsTable);
    oFragmentStub.withArgs("view", "cartItemsFragmentTable").returns(oCartItemsTable);

    const oEvent = { getParameter: oSandbox.stub() };
    oEvent.getParameter.withArgs("selectedItem").returns({ getKey: oSandbox.stub().returns("C1") });

    oController.onCompanyChange(oEvent);

    assert.ok(oCartItemsTable.unbindRows.calledOnce, "the cart items table was unbound");
    assert.ok(oCartsBinding.filter.calledOnce, "the carts table was filtered");
});

QUnit.test("onCartAdminTableSelection binds the cart items table to the selected cart", function (assert: any): void {
    const oView = { getId: oSandbox.stub().returns("view") };
    oController.getView = oSandbox.stub().returns(oView);

    const oCartItemsTable = { unbindRows: oSandbox.stub(), bindRows: oSandbox.stub() };
    oSandbox.stub(Fragment, "byId").withArgs("view", "cartItemsFragmentTable").returns(oCartItemsTable);

    const oEvent = { getParameter: oSandbox.stub() };
    oEvent.getParameter.withArgs("rowContext").returns({ getPath: oSandbox.stub().returns("/Cart('1')") });

    oController.onCartAdminTableSelection(oEvent);

    assert.ok(oCartItemsTable.bindRows.calledOnce, "the cart items table was bound to the selected cart");
});

QUnit.test("onExportExcel builds an excel spreadsheet from the companies table", function (assert: any): void {
    oController.getI18nText = oSandbox.stub().returns("label");
    const oTable = { getBinding: oSandbox.stub().returns({}) };
    oController.getView = oSandbox.stub().returns({ byId: oSandbox.stub().returns(oTable) });
    oSandbox.stub(Spreadsheet.prototype, "build").returns(Promise.resolve());
    oSandbox.stub(Spreadsheet.prototype, "destroy");

    try {
        oController.onExportExcel();
    } catch (oError) {
        // the export library may not be fully available in the unit context
    }

    assert.ok(oController.getI18nText.called, "i18n texts were resolved for the excel columns");
});
