import Settings from "cap_try_ts/controller/Settings.controller";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import Event from "sap/ui/base/Event";
import Table from "sap/ui/table/Table";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import MessageToast from "sap/m/MessageToast";

interface TestContext {
    sandbox: any;
    oController: Settings;
    oCompaniesTable: Table;
    oCartsFragmentTable: Table;
    oCartItemsFragmentTable: Table;
    oViewStub: { byId: any; getId: any };
    oSetPropStub: any;
    oGetPropStub: any;
    oGetModelStub: any;
    oFakeModel: any;
    oCompanyListBinding: any;
    oCompanyContextBinding: any;
}

QUnit.module("cap_try_ts.controller.Settings", {
    beforeEach: function (this: TestContext) {
        this.sandbox = sinon.sandbox.create();

        this.oController = new Settings("Settings");

        this.oCompaniesTable = new Table();
        this.oCartsFragmentTable = new Table();
        this.oCartItemsFragmentTable = new Table();

        this.oViewStub = {
            byId: this.sandbox.stub(),
            getId: this.sandbox.stub().returns("settingsView")
        };
        this.oViewStub.byId.withArgs("companiesTable").returns(this.oCompaniesTable);

        this.sandbox.stub(this.oController as any, "getView").returns(this.oViewStub);
        this.sandbox.stub(this.oController as any, "getI18nText").returns("i18nText");

        this.oSetPropStub = this.sandbox.stub(this.oController as any, "setProp");
        this.oGetPropStub = this.sandbox.stub(this.oController as any, "getProp").returns({});

        this.oCompanyListBinding = {
            create: this.sandbox.stub().returns({
                created: this.sandbox.stub().returns(Promise.resolve()),
                getObject: this.sandbox.stub().returns({ name: "Acme" })
            })
        };
        this.oCompanyContextBinding = {
            requestObject: this.sandbox.stub().returns(Promise.resolve({ ID: "1", name: "Acme" })),
            getBoundContext: this.sandbox.stub().returns({ sentinel: "context" })
        };
        this.oFakeModel = {
            refresh: this.sandbox.stub(),
            submitBatch: this.sandbox.stub().returns(Promise.resolve()),
            bindList: this.sandbox.stub().returns(this.oCompanyListBinding),
            bindContext: this.sandbox.stub().returns(this.oCompanyContextBinding)
        };
        this.oGetModelStub = this.sandbox.stub(this.oController as any, "getModel").returns(this.oFakeModel);

        this.sandbox.stub(this.oController as any, "_addMessage");
    },
    afterEach: function (this: TestContext) {
        this.oCompaniesTable.destroy();
        this.oCartsFragmentTable.destroy();
        this.oCartItemsFragmentTable.destroy();
        this.sandbox.restore();
    }
});

QUnit.test("onInit should trigger the controller load hook and attach the pattern matched handler for the Settings route", function (this: TestContext, assert) {
    const oAttachStub = this.sandbox.stub();
    const oRouteStub = { attachPatternMatched: oAttachStub, detachPatternMatched: this.sandbox.stub() };
    const oGetRouteStub = this.sandbox.stub().returns(oRouteStub);
    this.sandbox.stub(this.oController as any, "getRouter").returns({ getRoute: oGetRouteStub });
    const oControllerLoadStub = this.sandbox.stub(this.oController as any, "_onControllerLoad");

    this.oController.onInit();

    assert.ok(oControllerLoadStub.calledOnce, "_onControllerLoad should be triggered once");
    assert.ok(oGetRouteStub.calledWith("Settings"), "getRoute should be called with 'Settings'");
    assert.ok(oAttachStub.calledOnce, "attachPatternMatched should be called exactly once");
    assert.strictEqual(oAttachStub.firstCall.args[1], this.oController, "the pattern matched handler should be bound to the controller instance");
});

QUnit.test("onExit should detach the pattern matched handler for the Settings route", function (this: TestContext, assert) {
    const oDetachStub = this.sandbox.stub();
    const oRouteStub = { attachPatternMatched: this.sandbox.stub(), detachPatternMatched: oDetachStub };
    const oGetRouteStub = this.sandbox.stub().returns(oRouteStub);
    this.sandbox.stub(this.oController as any, "getRouter").returns({ getRoute: oGetRouteStub });

    this.oController.onExit();

    assert.ok(oGetRouteStub.calledWith("Settings"), "getRoute should be called with 'Settings'");
    assert.ok(oDetachStub.calledOnce, "detachPatternMatched should be called exactly once");
    assert.strictEqual(oDetachStub.firstCall.args[1], this.oController, "the pattern matched handler should be bound to the controller instance");
});

QUnit.test("onCreateCompany should create the company via the OData model, refresh the table and clear the selection", async function (this: TestContext, assert) {
    this.oGetPropStub.withArgs("globalModel", "/selectedCompany").returns({ name: "Acme", description: "Desc", capital: 100, currency_code: "EUR" });
    const oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");
    const oClearStub = this.sandbox.stub(this.oController, "onClearSelectedCompanyData");
    const oMessageToastStub = this.sandbox.stub(MessageToast, "show");

    await this.oController.onCreateCompany();

    assert.ok(this.oFakeModel.bindList.calledWith("/Company"), "the company list binding should target the Company entity set");
    assert.ok(this.oCompanyListBinding.create.calledWith({ name: "Acme", description: "Desc", capital: 100, currency_code: "EUR" }), "the new company should be created with the selected company data");
    assert.ok(oRefreshStub.calledOnce, "the companies table should be refreshed after creation");
    assert.ok(oClearStub.calledOnce, "the selected company data should be cleared after creation");
    assert.ok(oMessageToastStub.calledOnce, "a success toast should be shown after creation");
});

QUnit.test("onEditCompany should do nothing when the selected company has no bound metadata", async function (this: TestContext, assert) {
    this.oGetPropStub.withArgs("globalModel", "/selectedCompany").returns({ name: "Acme" });
    const oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");

    await this.oController.onEditCompany();

    assert.notOk(this.oFakeModel.submitBatch.called, "no batch submission should be attempted without bound metadata");
    assert.notOk(oRefreshStub.called, "the companies table should not be refreshed when nothing was edited");
});

QUnit.test("onEditCompany should update the bound company entity and refresh the table", async function (this: TestContext, assert) {
    const oSetPropertyStub = this.sandbox.stub();
    this.oGetPropStub.withArgs("globalModel", "/selectedCompany").returns({
        metadata: { setProperty: oSetPropertyStub },
        name: "Acme",
        description: "Desc",
        capital: "150.5"
    });
    const oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");
    const oMessageToastStub = this.sandbox.stub(MessageToast, "show");

    await this.oController.onEditCompany();

    assert.ok(oSetPropertyStub.calledWith("name", "Acme"), "the bound entity's name should be updated");
    assert.ok(oSetPropertyStub.calledWith("description", "Desc"), "the bound entity's description should be updated");
    assert.ok(oSetPropertyStub.calledWith("capital", 150.5), "the bound entity's capital should be updated as a parsed number");
    assert.ok(this.oFakeModel.submitBatch.calledWith("updateCompanies"), "the batch group used for company updates should be submitted");
    assert.ok(oRefreshStub.calledOnce, "the companies table should be refreshed after the edit");
    assert.ok(oMessageToastStub.calledOnce, "a success toast should be shown after the edit");
});

QUnit.test("onCompanyTabSelect should clear the selection and disable row selection when the create tab is chosen", function (this: TestContext, assert) {
    const oSetSelectionModeStub = this.sandbox.stub(this.oCompaniesTable, "setSelectionMode");
    const oEvent = { getParameter: this.sandbox.stub().withArgs("key").returns("create") } as unknown as Event<Record<string, unknown>>;

    this.oController.onCompanyTabSelect(oEvent);

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany", {}), "the selected company should be cleared when switching tabs");
    assert.ok(oSetSelectionModeStub.calledWith("None"), "row selection should be disabled while creating a company");
});

QUnit.test("onCompanyTabSelect should enable single row selection when a non-create tab is chosen", function (this: TestContext, assert) {
    const oSetSelectionModeStub = this.sandbox.stub(this.oCompaniesTable, "setSelectionMode");
    const oEvent = { getParameter: this.sandbox.stub().withArgs("key").returns("edit") } as unknown as Event<Record<string, unknown>>;

    this.oController.onCompanyTabSelect(oEvent);

    assert.ok(oSetSelectionModeStub.calledWith("Single"), "row selection should be enabled outside of the create tab");
});

QUnit.test("onCompaniesSelectedCancelPress should clear the selected company data", function (this: TestContext, assert) {
    this.oController.onCompaniesSelectedCancelPress();

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany", {}), "the selected company should be cleared");
    assert.ok(this.oFakeModel.refresh.calledWith(true), "the global model should be refreshed after clearing the selection");
});

QUnit.test("onCompaniesTableRefresh should refresh the rows binding of the companies table", function (this: TestContext, assert) {
    const oRefreshStub = this.sandbox.stub();
    this.sandbox.stub(this.oCompaniesTable, "getBinding").withArgs("rows").returns({ refresh: oRefreshStub });

    this.oController.onCompaniesTableRefresh();

    assert.ok(oRefreshStub.calledOnce, "the rows binding of the companies table should be refreshed once");
});

QUnit.test("onCompaniesTableSelection should store the resolved company context together with its bound metadata", async function (this: TestContext, assert) {
    const oRowContext = { getPath: this.sandbox.stub().returns("/Company('1')") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowContext").returns(oRowContext) } as unknown as Event<Record<string, unknown>>;

    await this.oController.onCompaniesTableSelection(oEvent);

    assert.ok(this.oFakeModel.bindContext.calledWith("/Company('1')"), "a context binding should be created for the selected row's path");
    assert.ok(this.oSetPropStub.calledOnce, "the selected company should be stored on the global model");
    const oStoredCompany = this.oSetPropStub.firstCall.args[2];
    assert.strictEqual(oStoredCompany.ID, "1", "the stored company should carry the resolved entity data");
    assert.strictEqual(oStoredCompany.metadata, this.oCompanyContextBinding.getBoundContext(), "the stored company should carry its bound context as metadata");
    assert.ok(this.oFakeModel.refresh.calledWith(true), "the global model should be refreshed after selecting a row");
});

QUnit.test("onCompaniesTableSelection should do nothing when no row context is provided", async function (this: TestContext, assert) {
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowContext").returns(undefined) } as unknown as Event<Record<string, unknown>>;

    await this.oController.onCompaniesTableSelection(oEvent);

    assert.notOk(this.oFakeModel.bindContext.called, "no context binding should be created without a selected row");
    assert.notOk(this.oSetPropStub.called, "the selected company should not change without a selected row");
});

QUnit.test("onClearSelectedCompanyData should reset the selected company on the global model", function (this: TestContext, assert) {
    this.oController.onClearSelectedCompanyData();

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany", {}), "the selected company should be reset to an empty object");
    assert.ok(this.oFakeModel.refresh.calledWith(true), "the global model should be refreshed after clearing the selection");
});

QUnit.test("onCreateCompanyNameChange should store the new name on the selected company", function (this: TestContext, assert) {
    const oEvent = { getParameter: this.sandbox.stub().withArgs("value").returns("New Co") } as unknown as Event<Record<string, unknown>>;

    this.oController.onCreateCompanyNameChange(oEvent);

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany/name", "New Co"), "the selected company's name should be updated");
});

QUnit.test("onCreateCompanyDescriptionChange should store the new description on the selected company", function (this: TestContext, assert) {
    const oEvent = { getParameter: this.sandbox.stub().withArgs("value").returns("New description") } as unknown as Event<Record<string, unknown>>;

    this.oController.onCreateCompanyDescriptionChange(oEvent);

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany/description", "New description"), "the selected company's description should be updated");
});

QUnit.test("onCreateCompanyCapitalChange should store the new capital on the selected company", function (this: TestContext, assert) {
    const oEvent = { getParameter: this.sandbox.stub().withArgs("value").returns(250) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCreateCompanyCapitalChange(oEvent);

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany/capital", 250), "the selected company's capital should be updated");
});

QUnit.test("onCreateCompanyCurrencyChange should store the selected currency code on the selected company", function (this: TestContext, assert) {
    const oSelectedItem = { getKey: this.sandbox.stub().returns("USD") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("selectedItem").returns(oSelectedItem) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCreateCompanyCurrencyChange(oEvent);

    assert.ok(this.oSetPropStub.calledWith("globalModel", "/selectedCompany/currency_code", "USD"), "the selected company's currency should be updated");
});

QUnit.test("onCreateCompanyCurrencyChange should do nothing when no currency item is selected", function (this: TestContext, assert) {
    const oEvent = { getParameter: this.sandbox.stub().withArgs("selectedItem").returns(undefined) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCreateCompanyCurrencyChange(oEvent);

    assert.notOk(this.oSetPropStub.called, "the selected company's currency should not change without a selected item");
});

QUnit.test("onSideBarItemSelect should open the carts fragment when the carts item is selected", function (this: TestContext, assert) {
    const oOpenCartsStub = this.sandbox.stub();
    this.sandbox.stub(this.oController as any, "getDialogHandler").returns({ _openCartsFragment: oOpenCartsStub, _openCompaniesFragment: this.sandbox.stub() });
    const oItem = { getKey: this.sandbox.stub().returns("carts") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("item").returns(oItem) } as unknown as Event<Record<string, unknown>>;

    this.oController.onSideBarItemSelect(oEvent);

    assert.ok(oOpenCartsStub.calledOnce, "the carts fragment should be opened when the carts item is selected");
});

QUnit.test("onSideBarItemSelect should open the companies fragment when the companies item is selected", function (this: TestContext, assert) {
    const oOpenCompaniesStub = this.sandbox.stub();
    this.sandbox.stub(this.oController as any, "getDialogHandler").returns({ _openCartsFragment: this.sandbox.stub(), _openCompaniesFragment: oOpenCompaniesStub });
    const oItem = { getKey: this.sandbox.stub().returns("companies") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("item").returns(oItem) } as unknown as Event<Record<string, unknown>>;

    this.oController.onSideBarItemSelect(oEvent);

    assert.ok(oOpenCompaniesStub.calledOnce, "the companies fragment should be opened when the companies item is selected");
});

QUnit.test("onCompanyChange should unbind the cart items table and filter the carts table by the selected company", function (this: TestContext, assert) {
    const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId");
    oFragmentByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(this.oCartsFragmentTable);
    oFragmentByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsFragmentTable);
    const oUnbindStub = this.sandbox.stub(this.oCartItemsFragmentTable, "unbindRows");
    const oFilterStub = this.sandbox.stub();
    this.sandbox.stub(this.oCartsFragmentTable, "getBinding").withArgs("rows").returns({ filter: oFilterStub });

    const oSelectedItem = { getKey: this.sandbox.stub().returns("company-1") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("selectedItem").returns(oSelectedItem) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCompanyChange(oEvent);

    assert.ok(oUnbindStub.calledOnce, "the cart items table should be unbound before applying a new company filter");
    assert.ok(oFilterStub.calledOnce, "the carts table should be filtered once");
    const aFilters = oFilterStub.firstCall.args[0];
    assert.strictEqual(aFilters.length, 1, "exactly one filter should be applied");
    assert.ok(aFilters[0] instanceof Filter, "the applied filter should be a Filter instance");
    assert.strictEqual((aFilters[0] as any).sPath, "company_ID", "the filter should target the company_ID field");
    assert.strictEqual((aFilters[0] as any).sOperator, FilterOperator.EQ, "the filter should use the equals operator");
});

QUnit.test("onCompanyChange should clear the carts table filter when no company is selected", function (this: TestContext, assert) {
    const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId");
    oFragmentByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(this.oCartsFragmentTable);
    oFragmentByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsFragmentTable);
    this.sandbox.stub(this.oCartItemsFragmentTable, "unbindRows");
    const oFilterStub = this.sandbox.stub();
    this.sandbox.stub(this.oCartsFragmentTable, "getBinding").withArgs("rows").returns({ filter: oFilterStub });

    const oEvent = { getParameter: this.sandbox.stub().withArgs("selectedItem").returns(undefined) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCompanyChange(oEvent);

    assert.ok(oFilterStub.calledWith([]), "the carts table filter should be cleared when no company is selected");
});

QUnit.test("onCompanyChange should do nothing when the fragment tables are not yet available", function (this: TestContext, assert) {
    const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId").returns(undefined);
    const oSelectedItem = { getKey: this.sandbox.stub().returns("company-1") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("selectedItem").returns(oSelectedItem) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCompanyChange(oEvent);

    assert.ok(oFragmentByIdStub.calledWith("settingsView", "cartsFragmentTable"), "the carts fragment table should be looked up");
    assert.ok(oFragmentByIdStub.calledWith("settingsView", "cartItemsFragmentTable"), "the cart items fragment table should be looked up");
});

QUnit.test("onCartAdminTableSelection should bind the cart items table to the selected row's items", function (this: TestContext, assert) {
    this.sandbox.stub(Fragment, "byId").withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsFragmentTable);
    const oBindRowsStub = this.sandbox.stub(this.oCartItemsFragmentTable, "bindRows");
    const oRowContext = { getPath: this.sandbox.stub().returns("/Cart('1')") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowContext").returns(oRowContext) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCartAdminTableSelection(oEvent);

    assert.ok(oBindRowsStub.calledWith({ path: "/Cart('1')/items", parameters: { $expand: "product" } }), "the cart items table should be bound to the selected cart's items");
});

QUnit.test("onCartAdminTableSelection should unbind the cart items table when no row is selected", function (this: TestContext, assert) {
    this.sandbox.stub(Fragment, "byId").withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsFragmentTable);
    const oUnbindStub = this.sandbox.stub(this.oCartItemsFragmentTable, "unbindRows");
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowContext").returns(undefined) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCartAdminTableSelection(oEvent);

    assert.ok(oUnbindStub.calledOnce, "the cart items table should be unbound without a selected row");
});

QUnit.test("onCartAdminTableSelection should do nothing when the cart items fragment table is not yet available", function (this: TestContext, assert) {
    const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId").returns(undefined);
    const oRowContext = { getPath: this.sandbox.stub().returns("/Cart('1')") };
    const oEvent = { getParameter: this.sandbox.stub().withArgs("rowContext").returns(oRowContext) } as unknown as Event<Record<string, unknown>>;

    this.oController.onCartAdminTableSelection(oEvent);

    assert.ok(oFragmentByIdStub.calledWith("settingsView", "cartItemsFragmentTable"), "the cart items fragment table should be looked up");
});

QUnit.test("onExportExcel should build and destroy a Spreadsheet export of the companies table", async function (this: TestContext, assert) {
    this.sandbox.stub(this.oCompaniesTable, "getBinding").withArgs("rows").returns({});
    const oBuildStub = this.sandbox.stub(Spreadsheet.prototype, "build").returns(Promise.resolve());
    const oDestroySpy = this.sandbox.spy(Spreadsheet.prototype, "destroy");

    this.oController.onExportExcel();

    assert.ok(this.oViewStub.byId.calledWith("companiesTable"), "the companies table should be looked up to export its rows");
    assert.ok(oBuildStub.calledOnce, "the spreadsheet build should be triggered for the export");

    await Promise.resolve();
    await Promise.resolve();

    assert.ok(oDestroySpy.calledOnce, "the spreadsheet instance should be destroyed after building completes");
});
