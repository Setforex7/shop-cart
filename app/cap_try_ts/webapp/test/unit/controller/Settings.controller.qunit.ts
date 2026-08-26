import Settings from "cap_try_ts/controller/Settings.controller";
import CompanyService from "cap_try_ts/service/CompanyService";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import JSONModel from "sap/ui/model/json/JSONModel";
// @ts-ignore - UI5 ships sinon 1.17 as a plain third party module without TypeScript declarations
import sinon from "sap/ui/thirdparty/sinon";

// --- minimal local typings for the bundled sinon 1.17 -------------------
interface SinonCall {
	args: unknown[];
}

interface SinonStub {
	(...aArgs: unknown[]): unknown;
	returns(vValue: unknown): SinonStub;
	returnsArg(iIndex: number): SinonStub;
	withArgs(...aArgs: unknown[]): SinonStub;
	calledWith(...aArgs: unknown[]): boolean;
	calledOnce: boolean;
	calledTwice: boolean;
	notCalled: boolean;
	callCount: number;
	firstCall: SinonCall;
	secondCall: SinonCall;
}

interface SinonSandbox {
	stub(oTarget?: unknown, sMethod?: string): SinonStub;
	restore(): void;
}

interface StubbedTable {
	setSelectionMode: SinonStub;
	getBinding: SinonStub;
	unbindRows: SinonStub;
	bindRows: SinonStub;
}

interface StubbedBinding {
	refresh: SinonStub;
	filter: SinonStub;
}

QUnit.module("Settings.controller", {
	beforeEach: function (this: Record<string, unknown>) {
		const oSandbox = sinon.sandbox.create() as SinonSandbox;
		this.sandbox = oSandbox;

		const oController = new Settings("settingsControllerUnderTest");
		this.controller = oController;

		// --- global JSON model backing getProp/setProp -----------------
		const oGlobalModel = new JSONModel({ selectedCompany: {} });
		this.globalModel = oGlobalModel;

		// --- fake bindings / tables -----------------------------------
		const oRowBinding: StubbedBinding = {
			refresh: oSandbox.stub(),
			filter: oSandbox.stub()
		};
		this.rowBinding = oRowBinding;

		const oCompaniesTable: StubbedTable = {
			setSelectionMode: oSandbox.stub(),
			getBinding: oSandbox.stub().returns(oRowBinding),
			unbindRows: oSandbox.stub(),
			bindRows: oSandbox.stub()
		};
		this.companiesTable = oCompaniesTable;

		const oCartsTable: StubbedTable = {
			setSelectionMode: oSandbox.stub(),
			getBinding: oSandbox.stub().returns(oRowBinding),
			unbindRows: oSandbox.stub(),
			bindRows: oSandbox.stub()
		};
		this.cartsTable = oCartsTable;

		const oCartItemsTable: StubbedTable = {
			setSelectionMode: oSandbox.stub(),
			getBinding: oSandbox.stub().returns(oRowBinding),
			unbindRows: oSandbox.stub(),
			bindRows: oSandbox.stub()
		};
		this.cartItemsTable = oCartItemsTable;

		// --- fake view -------------------------------------------------
		const oView = {
			getId: oSandbox.stub().returns("settingsView"),
			byId: oSandbox.stub().returns(oCompaniesTable)
		};
		this.view = oView;
		oSandbox.stub(oController, "getView").returns(oView);

		// --- fake models -----------------------------------------------
		const oODataModel = {
			bindContext: oSandbox.stub()
		};
		this.odataModel = oODataModel;

		const oGetModel = oSandbox.stub(oController, "getModel");
		oGetModel.withArgs("globalModel").returns(oGlobalModel);
		oGetModel.withArgs(undefined).returns(oODataModel);
		oGetModel.returns(oODataModel);

		// --- getProp / setProp ----------------------------------------
		oSandbox.stub(oController, "getProp").returns(undefined);
		oSandbox.stub(oController, "setProp");

		// --- i18n --------------------------------------------------------
		oSandbox.stub(oController, "getI18nText").returnsArg(0);

		// --- router ------------------------------------------------------
		const oRoute = {
			attachPatternMatched: oSandbox.stub(),
			detachPatternMatched: oSandbox.stub()
		};
		this.route = oRoute;
		const oRouter = {
			getRoute: oSandbox.stub().returns(oRoute)
		};
		this.router = oRouter;
		oSandbox.stub(oController, "getRouter").returns(oRouter);

		// --- dialog handler ----------------------------------------------
		const oDialogHandler = {
			_openCartsFragment: oSandbox.stub(),
			_openCompaniesFragment: oSandbox.stub()
		};
		this.dialogHandler = oDialogHandler;
		oSandbox.stub(oController, "getDialogHandler").returns(oDialogHandler);

		// --- CompanyService ------------------------------------------------
		oSandbox.stub(CompanyService, "create").returns(Promise.resolve());
		oSandbox.stub(CompanyService, "edit").returns(Promise.resolve());
		oSandbox.stub(CompanyService, "clearSelected");

		// --- Fragment.byId --------------------------------------------------
		const oFragmentById = oSandbox.stub(Fragment, "byId");
		oFragmentById.withArgs("settingsView", "cartsFragmentTable").returns(oCartsTable);
		oFragmentById.withArgs("settingsView", "cartItemsFragmentTable").returns(oCartItemsTable);
		this.fragmentById = oFragmentById;

		// helper to build a fake Event with getParameter
		this.makeEvent = function (mParams: Record<string, unknown>) {
			return {
				getParameter: function (sName: string) {
					return mParams[sName];
				}
			};
		};
	},

	afterEach: function (this: Record<string, unknown>) {
		(this.sandbox as SinonSandbox).restore();
		(this.globalModel as JSONModel).destroy();
		(this.controller as Settings).destroy();
	}
});

QUnit.test("onInit attaches the pattern matched handler for the Settings route", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const oOnControllerLoad = (this.sandbox as SinonSandbox).stub(oController as unknown as Record<string, unknown>, "_onControllerLoad");

	oController.onInit();

	assert.ok(oOnControllerLoad.calledOnce, "_onControllerLoad was invoked once");
	assert.ok((this.router as Record<string, SinonStub>).getRoute.calledWith("Settings"), "the Settings route was requested");
	assert.ok((this.route as Record<string, SinonStub>).attachPatternMatched.calledOnce, "attachPatternMatched was called once");
});

QUnit.test("onExit detaches the pattern matched handler", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;

	oController.onExit();

	assert.ok((this.router as Record<string, SinonStub>).getRoute.calledWith("Settings"), "the Settings route was requested");
	assert.ok((this.route as Record<string, SinonStub>).detachPatternMatched.calledOnce, "detachPatternMatched was called once");
});

QUnit.test("onCreateCompany forwards the selected company payload to CompanyService.create", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;
	const oSandbox = this.sandbox as SinonSandbox;

	(oController.getProp as unknown as SinonStub).withArgs("globalModel", "/selectedCompany").returns({
		name: "ACME",
		description: "desc",
		capital: 100,
		currency_code: "EUR",
		extra: "ignored"
	});
	const oRefresh = oSandbox.stub(oController, "onCompaniesTableRefresh");
	const oClear = oSandbox.stub(oController, "onClearSelectedCompanyData");

	void oController.onCreateCompany().then(function () {
		const oCreateStub = CompanyService.create as unknown as SinonStub;
		assert.ok(oCreateStub.calledOnce, "CompanyService.create was called once");
		assert.deepEqual(oCreateStub.firstCall.args[1], {
			name: "ACME",
			description: "desc",
			capital: 100,
			currency_code: "EUR"
		}, "only the whitelisted company fields are sent");
		assert.ok(oRefresh.calledOnce, "the companies table was refreshed");
		assert.ok(oClear.calledOnce, "the selected company data was cleared");
		done();
	});
});

QUnit.test("onEditCompany does nothing when the selected company has no metadata", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;
	const oSandbox = this.sandbox as SinonSandbox;

	(oController.getProp as unknown as SinonStub).withArgs("globalModel", "/selectedCompany").returns({ name: "ACME" });
	const oRefresh = oSandbox.stub(oController, "onCompaniesTableRefresh");

	void oController.onEditCompany().then(function () {
		assert.ok((CompanyService.edit as unknown as SinonStub).notCalled, "CompanyService.edit was not called");
		assert.ok(oRefresh.notCalled, "the table was not refreshed");
		done();
	});
});

QUnit.test("onEditCompany edits and refreshes when metadata is present", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;
	const oSandbox = this.sandbox as SinonSandbox;
	const oSelected = { name: "ACME", metadata: { path: "/Company(1)" } };

	(oController.getProp as unknown as SinonStub).withArgs("globalModel", "/selectedCompany").returns(oSelected);
	const oRefresh = oSandbox.stub(oController, "onCompaniesTableRefresh");

	void oController.onEditCompany().then(function () {
		const oEditStub = CompanyService.edit as unknown as SinonStub;
		assert.ok(oEditStub.calledOnce, "CompanyService.edit was called once");
		assert.strictEqual(oEditStub.firstCall.args[1], oSelected, "the selected company was passed through");
		assert.ok(oRefresh.calledOnce, "the companies table was refreshed");
		done();
	});
});

QUnit.test("onCompanyTabSelect switches the selection mode per selected tab", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const oTable = this.companiesTable as StubbedTable;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCompanyTabSelect(makeEvent({ key: "create" }));
	assert.ok((CompanyService.clearSelected as unknown as SinonStub).calledOnce, "the selection was cleared");
	assert.strictEqual(oTable.setSelectionMode.firstCall.args[0], "None", "selection mode None on the create tab");

	oController.onCompanyTabSelect(makeEvent({ key: "edit" }));
	assert.strictEqual(oTable.setSelectionMode.secondCall.args[0], "Single", "selection mode Single on any other tab");
});

QUnit.test("onCompaniesSelectedCancelPress clears the selected company", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;

	oController.onCompaniesSelectedCancelPress();

	const oClearStub = CompanyService.clearSelected as unknown as SinonStub;
	assert.ok(oClearStub.calledOnce, "CompanyService.clearSelected was called once");
	assert.strictEqual(oClearStub.firstCall.args[0], oController, "the controller was handed to the service");
});

QUnit.test("onCompaniesTableRefresh refreshes the rows binding", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;

	oController.onCompaniesTableRefresh();

	assert.ok((this.companiesTable as StubbedTable).getBinding.calledWith("rows"), "the rows binding was requested");
	assert.ok((this.rowBinding as StubbedBinding).refresh.calledOnce, "the binding was refreshed once");
});

QUnit.test("onCompaniesTableSelection returns early without a row context", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	void oController.onCompaniesTableSelection(makeEvent({ rowContext: undefined })).then(() => {
		assert.ok((this.odataModel as Record<string, SinonStub>).bindContext.notCalled, "no context binding was created");
		assert.ok((oController.setProp as unknown as SinonStub).notCalled, "no global model property was written");
		done();
	});
});

QUnit.test("onCompaniesTableSelection stores the requested company plus its metadata", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;
	const oSandbox = this.sandbox as SinonSandbox;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;
	const oBoundContext = { id: "boundContext" };
	const oCompanyObject: Record<string, unknown> = { ID: "c1", name: "ACME" };

	(this.odataModel as Record<string, SinonStub>).bindContext.returns({
		requestObject: oSandbox.stub().returns(Promise.resolve(oCompanyObject)),
		getBoundContext: oSandbox.stub().returns(oBoundContext)
	});
	const oRefresh = oSandbox.stub(this.globalModel as JSONModel, "refresh");

	const oEvent = makeEvent({
		rowContext: { getPath: function () { return "/Company('c1')"; } }
	});

	void oController.onCompaniesTableSelection(oEvent).then(() => {
		assert.ok((this.odataModel as Record<string, SinonStub>).bindContext.calledWith("/Company('c1')"), "the row path was bound");
		const oSetProp = oController.setProp as unknown as SinonStub;
		assert.ok(oSetProp.calledOnce, "the selected company was written once");
		assert.strictEqual(oSetProp.firstCall.args[1], "/selectedCompany", "it was written to /selectedCompany");
		assert.strictEqual((oSetProp.firstCall.args[2] as Record<string, unknown>).metadata, oBoundContext, "the bound context was attached as metadata");
		assert.ok(oRefresh.calledWith(true), "the global model was force refreshed");
		done();
	});
});

QUnit.test("onClearSelectedCompanyData resets the selected company and refreshes", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const oRefresh = (this.sandbox as SinonSandbox).stub(this.globalModel as JSONModel, "refresh");

	oController.onClearSelectedCompanyData();

	const oSetProp = oController.setProp as unknown as SinonStub;
	assert.ok(oSetProp.calledOnce, "setProp was called once");
	assert.deepEqual(oSetProp.firstCall.args, ["globalModel", "/selectedCompany", {}], "the selected company was emptied");
	assert.ok(oRefresh.calledWith(true), "the global model was force refreshed");
});

QUnit.test("onCreateCompanyNameChange writes the new name", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCreateCompanyNameChange(makeEvent({ value: "NewCo" }));

	assert.deepEqual((oController.setProp as unknown as SinonStub).firstCall.args, ["globalModel", "/selectedCompany/name", "NewCo"], "the name was stored");
});

QUnit.test("onCreateCompanyDescriptionChange writes the new description", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCreateCompanyDescriptionChange(makeEvent({ value: "A description" }));

	assert.deepEqual((oController.setProp as unknown as SinonStub).firstCall.args, ["globalModel", "/selectedCompany/description", "A description"], "the description was stored");
});

QUnit.test("onCreateCompanyCapitalChange writes the new capital", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCreateCompanyCapitalChange(makeEvent({ value: "2500" }));

	assert.deepEqual((oController.setProp as unknown as SinonStub).firstCall.args, ["globalModel", "/selectedCompany/capital", "2500"], "the capital was stored");
});

QUnit.test("onCreateCompanyCurrencyChange stores the key only when an item is selected", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;
	const oSetProp = oController.setProp as unknown as SinonStub;

	oController.onCreateCompanyCurrencyChange(makeEvent({ selectedItem: undefined }));
	assert.ok(oSetProp.notCalled, "nothing is stored without a selected item");

	oController.onCreateCompanyCurrencyChange(makeEvent({
		selectedItem: { getKey: function () { return "USD"; } }
	}));
	assert.deepEqual(oSetProp.firstCall.args, ["globalModel", "/selectedCompany/currency_code", "USD"], "the currency code was stored");
});

QUnit.test("onSideBarItemSelect opens the fragment matching the selected key", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;
	const oDialogHandler = this.dialogHandler as Record<string, SinonStub>;

	oController.onSideBarItemSelect(makeEvent({ item: { getKey: function () { return "carts"; } } }));
	assert.ok(oDialogHandler._openCartsFragment.calledOnce, "the carts fragment was opened");

	oController.onSideBarItemSelect(makeEvent({ item: { getKey: function () { return "companies"; } } }));
	assert.ok(oDialogHandler._openCompaniesFragment.calledOnce, "the companies fragment was opened");

	oController.onSideBarItemSelect(makeEvent({ item: { getKey: function () { return "unknown"; } } }));
	assert.strictEqual(oDialogHandler._openCartsFragment.callCount + oDialogHandler._openCompaniesFragment.callCount, 2, "an unknown key opens nothing");
});

QUnit.test("onCompanyChange clears the filter when no company is selected", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCompanyChange(makeEvent({ selectedItem: undefined }));

	assert.ok((this.cartItemsTable as StubbedTable).unbindRows.calledOnce, "the cart items rows were unbound");
	const oFilter = this.rowBinding as StubbedBinding;
	assert.ok(oFilter.filter.calledOnce, "the carts binding was filtered once");
	assert.deepEqual(oFilter.filter.firstCall.args[0], [], "an empty filter array was applied");
});

QUnit.test("onCompanyChange filters the carts binding by the selected company", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCompanyChange(makeEvent({
		selectedItem: { getKey: function () { return "company-1"; } }
	}));

	const aFilters = (this.rowBinding as StubbedBinding).filter.firstCall.args[0] as Filter[];
	assert.strictEqual(aFilters.length, 1, "exactly one filter was applied");
	assert.strictEqual(aFilters[0].getPath(), "company_ID", "the filter targets company_ID");
	assert.strictEqual(aFilters[0].getValue1(), "company-1", "the filter carries the selected company id");
});

QUnit.test("onCompanyChange returns early when the fragment tables are missing", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	(this.fragmentById as SinonStub).returns(undefined);

	oController.onCompanyChange(makeEvent({ selectedItem: undefined }));

	assert.ok((this.cartItemsTable as StubbedTable).unbindRows.notCalled, "nothing was unbound");
	assert.ok((this.rowBinding as StubbedBinding).filter.notCalled, "no filter was applied");
});

QUnit.test("onCartAdminTableSelection binds the cart items of the selected row", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCartAdminTableSelection(makeEvent({
		rowContext: { getPath: function () { return "/Cart('x')"; } }
	}));

	const oBindRows = (this.cartItemsTable as StubbedTable).bindRows;
	assert.ok(oBindRows.calledOnce, "the cart items rows were bound once");
	assert.deepEqual(oBindRows.firstCall.args[0], {
		path: "/Cart('x')/items",
		parameters: { $expand: "product" }
	}, "the items path was bound with the product expand");
});

QUnit.test("onCartAdminTableSelection unbinds the cart items without a row context", function (this: Record<string, unknown>, assert: Assert) {
	const oController = this.controller as Settings;
	const makeEvent = this.makeEvent as (m: Record<string, unknown>) => never;

	oController.onCartAdminTableSelection(makeEvent({ rowContext: undefined }));

	assert.ok((this.cartItemsTable as StubbedTable).unbindRows.calledOnce, "the rows were unbound");
	assert.ok((this.cartItemsTable as StubbedTable).bindRows.notCalled, "nothing was bound");
});

QUnit.test("onExportExcel builds a spreadsheet from the companies rows binding", function (this: Record<string, unknown>, assert: Assert) {
	const done = assert.async();
	const oController = this.controller as Settings;

	oController.onExportExcel();

	assert.ok((this.companiesTable as StubbedTable).getBinding.calledWith("rows"), "the rows binding was used as data source");
	assert.ok((oController.getI18nText as unknown as SinonStub).calledWith("excel_companies_report_filename"), "the file name came from the i18n bundle");
	assert.ok((oController.getI18nText as unknown as SinonStub).callCount >= 5, "all column labels and the file name were translated");
	done();
});
