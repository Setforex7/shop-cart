/* global QUnit */
// Pre-register a stub for sap/ui/export/Spreadsheet: the sap.ui.export library is
// not part of the karma-ui5 preload set and loading it would hang the test run.
sap.ui.define("sap/ui/export/Spreadsheet", [], function () {
	"use strict";

	function StubSpreadsheet(mSettings) {
		StubSpreadsheet.lastSettings = mSettings;
		StubSpreadsheet.instances.push(this);
		this.destroyed = false;
	}

	StubSpreadsheet.instances = [];
	StubSpreadsheet.lastSettings = null;

	StubSpreadsheet.prototype.build = function () {
		this.buildPromise = Promise.resolve();
		return this.buildPromise;
	};

	StubSpreadsheet.prototype.destroy = function () {
		this.destroyed = true;
	};

	return StubSpreadsheet;
});

sap.ui.define([
	"cap_try/controller/Settings.controller",
	"cap_try/service/CompanyService",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/export/Spreadsheet",
	"sap/ui/thirdparty/sinon"
], function (SettingsController, CompanyService, Fragment, Filter, FilterOperator, SpreadsheetStub, sinon) {
	"use strict";

	function createEvent(mParams) {
		return {
			getParameter: function (sName) {
				return mParams[sName];
			}
		};
	}

	QUnit.module("cap_try.controller.Settings", {
		beforeEach: function () {
			this.sandbox = sinon.sandbox.create();

			SpreadsheetStub.instances = [];
			SpreadsheetStub.lastSettings = null;

			// --- companies table + rows binding stubs ---
			this.oRowsBinding = {
				refresh: this.sandbox.stub(),
				filter: this.sandbox.stub()
			};
			this.oCompaniesTable = {
				getBinding: this.sandbox.stub().returns(this.oRowsBinding),
				setSelectionMode: this.sandbox.stub()
			};

			// --- view stub (plain object, no real controls created) ---
			var oByIdStub = this.sandbox.stub();
			oByIdStub.withArgs("companiesTable").returns(this.oCompaniesTable);
			this.oView = {
				byId: oByIdStub,
				getId: this.sandbox.stub().returns("settingsView")
			};

			// --- model stubs ---
			this.oGlobalModel = { refresh: this.sandbox.stub() };
			this.oBoundContext = { boundContextMarker: true };
			this.oContextBinding = {
				requestObject: this.sandbox.stub().returns(Promise.resolve({ ID: "company-1", name: "ACME" })),
				getBoundContext: this.sandbox.stub().returns(this.oBoundContext)
			};
			this.oODataModel = {
				bindContext: this.sandbox.stub().returns(this.oContextBinding)
			};

			// --- router stub ---
			this.oRoute = {
				attachPatternMatched: this.sandbox.stub(),
				detachPatternMatched: this.sandbox.stub()
			};
			this.oRouter = { getRoute: this.sandbox.stub().returns(this.oRoute) };

			// --- dialog handler stub ---
			this.oDialogHandler = {
				_openCartsFragment: this.sandbox.stub(),
				_openCompaniesFragment: this.sandbox.stub()
			};

			// --- controller under test ---
			this.oController = new SettingsController();

			var oGetModelStub = this.sandbox.stub();
			oGetModelStub.returns(this.oODataModel);
			oGetModelStub.withArgs("globalModel").returns(this.oGlobalModel);

			this.oController.getView = this.sandbox.stub().returns(this.oView);
			this.oController.getModel = oGetModelStub;
			this.oController.getRouter = this.sandbox.stub().returns(this.oRouter);
			this.oController.getDialogHandler = this.sandbox.stub().returns(this.oDialogHandler);
			this.oController.getProp = this.sandbox.stub();
			this.oController.setProp = this.sandbox.stub();
			this.oController.getI18nText = this.sandbox.stub().returnsArg(0);
			this.oController._onControllerLoad = this.sandbox.stub();
		},
		afterEach: function () {
			this.oController.destroy();
			this.sandbox.restore();
		}
	});

	QUnit.test("onInit loads controller base setup and attaches the Settings route handler", function (assert) {
		this.oController.onInit();

		assert.strictEqual(this.oController._onControllerLoad.callCount, 1, "_onControllerLoad was called once");
		assert.ok(this.oRouter.getRoute.calledWith("Settings"), "the 'Settings' route was requested");
		assert.strictEqual(this.oRoute.attachPatternMatched.callCount, 1, "attachPatternMatched was called once");
		assert.strictEqual(this.oRoute.attachPatternMatched.firstCall.args[1], this.oController, "the controller is the listener");
	});

	QUnit.test("onExit detaches the Settings route handler", function (assert) {
		this.oController.onExit();

		assert.ok(this.oRouter.getRoute.calledWith("Settings"), "the 'Settings' route was requested");
		assert.strictEqual(this.oRoute.detachPatternMatched.callCount, 1, "detachPatternMatched was called once");
		assert.strictEqual(this.oRoute.detachPatternMatched.firstCall.args[1], this.oController, "the controller is the listener");
	});

	QUnit.test("onCreateCompany creates the company with only the allowed fields and resets the form", function (assert) {
		var done = assert.async();
		var that = this;
		var oCompanyData = { name: "ACME", description: "A company", capital: 1000, currency_code: "EUR", extraneous: "ignored" };

		this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns(oCompanyData);
		var oCreateStub = this.sandbox.stub(CompanyService, "create").returns(Promise.resolve());
		var oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");
		var oClearStub = this.sandbox.stub(this.oController, "onClearSelectedCompanyData");

		this.oController.onCreateCompany().then(function () {
			assert.strictEqual(oCreateStub.callCount, 1, "CompanyService.create was called once");
			assert.strictEqual(oCreateStub.firstCall.args[0], that.oController, "the controller was passed to the service");
			assert.deepEqual(
				oCreateStub.firstCall.args[1],
				{ name: "ACME", description: "A company", capital: 1000, currency_code: "EUR" },
				"only name, description, capital and currency_code were sent"
			);
			assert.strictEqual(oRefreshStub.callCount, 1, "the companies table was refreshed");
			assert.strictEqual(oClearStub.callCount, 1, "the selected company data was cleared");
			done();
		});
	});

	QUnit.test("onEditCompany does nothing when the selected company has no metadata", function (assert) {
		var done = assert.async();
		this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ name: "ACME" });
		var oEditStub = this.sandbox.stub(CompanyService, "edit").returns(Promise.resolve());
		var oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");

		this.oController.onEditCompany().then(function () {
			assert.strictEqual(oEditStub.callCount, 0, "CompanyService.edit was not called");
			assert.strictEqual(oRefreshStub.callCount, 0, "the companies table was not refreshed");
			done();
		});
	});

	QUnit.test("onEditCompany edits the company and refreshes the table when metadata is present", function (assert) {
		var done = assert.async();
		var that = this;
		var oSelectedCompany = { name: "ACME", metadata: { contextMarker: true } };

		this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns(oSelectedCompany);
		var oEditStub = this.sandbox.stub(CompanyService, "edit").returns(Promise.resolve());
		var oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");

		this.oController.onEditCompany().then(function () {
			assert.strictEqual(oEditStub.callCount, 1, "CompanyService.edit was called once");
			assert.strictEqual(oEditStub.firstCall.args[0], that.oController, "the controller was passed to the service");
			assert.strictEqual(oEditStub.firstCall.args[1], oSelectedCompany, "the selected company was passed to the service");
			assert.strictEqual(oRefreshStub.callCount, 1, "the companies table was refreshed");
			done();
		});
	});

	QUnit.test("onCompanyTabSelect clears the selection and toggles the table selection mode", function (assert) {
		var oClearStub = this.sandbox.stub(CompanyService, "clearSelected");

		this.oController.onCompanyTabSelect(createEvent({ key: "create" }));
		assert.strictEqual(oClearStub.callCount, 1, "clearSelected was called for the 'create' tab");
		assert.ok(this.oCompaniesTable.setSelectionMode.calledWith("None"), "selection mode 'None' is set for the 'create' tab");

		this.oController.onCompanyTabSelect(createEvent({ key: "edit" }));
		assert.strictEqual(oClearStub.callCount, 2, "clearSelected was called again for the 'edit' tab");
		assert.ok(this.oCompaniesTable.setSelectionMode.calledWith("Single"), "selection mode 'Single' is set for the 'edit' tab");
	});

	QUnit.test("onCompaniesSelectedCancelPress clears the selected company", function (assert) {
		var oClearStub = this.sandbox.stub(CompanyService, "clearSelected");

		this.oController.onCompaniesSelectedCancelPress();

		assert.strictEqual(oClearStub.callCount, 1, "clearSelected was called once");
		assert.strictEqual(oClearStub.firstCall.args[0], this.oController, "the controller was passed to the service");
	});

	QUnit.test("onCompaniesTableRefresh refreshes the rows binding of the companies table", function (assert) {
		this.oController.onCompaniesTableRefresh();

		assert.ok(this.oCompaniesTable.getBinding.calledWith("rows"), "the 'rows' binding was requested");
		assert.strictEqual(this.oRowsBinding.refresh.callCount, 1, "the rows binding was refreshed once");
	});

	QUnit.test("onCompaniesTableSelection does nothing without a row context", function (assert) {
		var done = assert.async();
		var that = this;

		this.oController.onCompaniesTableSelection(createEvent({ rowContext: null })).then(function () {
			assert.strictEqual(that.oODataModel.bindContext.callCount, 0, "no context binding was created");
			assert.strictEqual(that.oController.setProp.callCount, 0, "setProp was not called");
			done();
		});
	});

	QUnit.test("onCompaniesTableSelection loads the row data and stores it with its bound context", function (assert) {
		var done = assert.async();
		var that = this;
		var oRowContext = { getPath: function () { return "/Company(abc)"; } };

		this.oController.onCompaniesTableSelection(createEvent({ rowContext: oRowContext })).then(function () {
			assert.ok(that.oODataModel.bindContext.calledWith("/Company(abc)"), "a context binding for the row path was created");
			assert.strictEqual(that.oController.setProp.callCount, 1, "setProp was called once");

			var aArgs = that.oController.setProp.firstCall.args;
			assert.strictEqual(aArgs[0], "globalModel", "the global model was targeted");
			assert.strictEqual(aArgs[1], "/selectedCompany", "the selected company path was targeted");
			assert.strictEqual(aArgs[2].name, "ACME", "the requested company data was stored");
			assert.strictEqual(aArgs[2].metadata, that.oBoundContext, "the bound context was stored as metadata");
			assert.ok(that.oGlobalModel.refresh.calledWith(true), "the global model was hard-refreshed");
			done();
		});
	});

	QUnit.test("onClearSelectedCompanyData resets the selected company and refreshes the global model", function (assert) {
		this.oController.onClearSelectedCompanyData();

		assert.strictEqual(this.oController.setProp.callCount, 1, "setProp was called once");
		assert.strictEqual(this.oController.setProp.firstCall.args[0], "globalModel", "the global model was targeted");
		assert.strictEqual(this.oController.setProp.firstCall.args[1], "/selectedCompany", "the selected company path was targeted");
		assert.deepEqual(this.oController.setProp.firstCall.args[2], {}, "the selected company was reset to an empty object");
		assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model was hard-refreshed");
	});

	QUnit.test("onCreateCompanyNameChange writes the name into the global model", function (assert) {
		this.oController.onCreateCompanyNameChange(createEvent({ value: "New Corp" }));

		assert.ok(
			this.oController.setProp.calledWith("globalModel", "/selectedCompany/name", "New Corp"),
			"the company name was stored"
		);
	});

	QUnit.test("onCreateCompanyDescriptionChange writes the description into the global model", function (assert) {
		this.oController.onCreateCompanyDescriptionChange(createEvent({ value: "Some description" }));

		assert.ok(
			this.oController.setProp.calledWith("globalModel", "/selectedCompany/description", "Some description"),
			"the company description was stored"
		);
	});

	QUnit.test("onCreateCompanyCapitalChange writes the capital into the global model", function (assert) {
		this.oController.onCreateCompanyCapitalChange(createEvent({ value: 2500 }));

		assert.ok(
			this.oController.setProp.calledWith("globalModel", "/selectedCompany/capital", 2500),
			"the company capital was stored"
		);
	});

	QUnit.test("onCreateCompanyCurrencyChange writes the currency key, ignoring empty selections", function (assert) {
		this.oController.onCreateCompanyCurrencyChange(createEvent({ selectedItem: null }));
		assert.strictEqual(this.oController.setProp.callCount, 0, "setProp was not called without a selected item");

		this.oController.onCreateCompanyCurrencyChange(createEvent({
			selectedItem: { getKey: function () { return "USD"; } }
		}));
		assert.ok(
			this.oController.setProp.calledWith("globalModel", "/selectedCompany/currency_code", "USD"),
			"the selected currency key was stored"
		);
	});

	QUnit.test("onSideBarItemSelect opens the matching fragment via the dialog handler", function (assert) {
		this.oController.onSideBarItemSelect(createEvent({ item: { getKey: function () { return "carts"; } } }));
		assert.strictEqual(this.oDialogHandler._openCartsFragment.callCount, 1, "the carts fragment was opened");
		assert.strictEqual(this.oDialogHandler._openCompaniesFragment.callCount, 0, "the companies fragment was not opened yet");

		this.oController.onSideBarItemSelect(createEvent({ item: { getKey: function () { return "companies"; } } }));
		assert.strictEqual(this.oDialogHandler._openCompaniesFragment.callCount, 1, "the companies fragment was opened");
		assert.strictEqual(this.oDialogHandler._openCartsFragment.callCount, 1, "the carts fragment was not opened again");
	});

	QUnit.test("onCompanyChange returns early when the fragment tables are not available", function (assert) {
		var oByIdStub = this.sandbox.stub(Fragment, "byId").returns(null);

		this.oController.onCompanyChange(createEvent({ selectedItem: { getKey: function () { return "company-1"; } } }));

		assert.strictEqual(oByIdStub.callCount, 2, "both fragment tables were looked up");
		assert.ok(oByIdStub.calledWith("settingsView", "cartsFragmentTable"), "the carts table was looked up by view id");
		assert.ok(oByIdStub.calledWith("settingsView", "cartItemsFragmentTable"), "the cart items table was looked up by view id");
	});

	QUnit.test("onCompanyChange filters the carts table by the selected company", function (assert) {
		var oFilterStub = this.sandbox.stub();
		var oCartsTable = { getBinding: this.sandbox.stub().returns({ filter: oFilterStub }) };
		var oCartItemsTable = { unbindRows: this.sandbox.stub() };
		var oByIdStub = this.sandbox.stub(Fragment, "byId");
		oByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(oCartsTable);
		oByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(oCartItemsTable);

		this.oController.onCompanyChange(createEvent({ selectedItem: { getKey: function () { return "company-1"; } } }));

		assert.strictEqual(oCartItemsTable.unbindRows.callCount, 1, "the cart items table rows were unbound");
		assert.strictEqual(oFilterStub.callCount, 1, "filter was applied once");

		var aFilters = oFilterStub.firstCall.args[0];
		assert.strictEqual(aFilters.length, 1, "exactly one filter was applied");
		assert.ok(aFilters[0] instanceof Filter, "the applied filter is a sap.ui.model.Filter");
		assert.strictEqual(aFilters[0].sPath, "company_ID", "the filter targets company_ID");
		assert.strictEqual(aFilters[0].sOperator, FilterOperator.EQ, "the filter uses the EQ operator");
		assert.strictEqual(aFilters[0].oValue1, "company-1", "the filter value is the selected company id");
	});

	QUnit.test("onCompanyChange clears the carts table filter when no company is selected", function (assert) {
		var oFilterStub = this.sandbox.stub();
		var oCartsTable = { getBinding: this.sandbox.stub().returns({ filter: oFilterStub }) };
		var oCartItemsTable = { unbindRows: this.sandbox.stub() };
		var oByIdStub = this.sandbox.stub(Fragment, "byId");
		oByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(oCartsTable);
		oByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(oCartItemsTable);

		this.oController.onCompanyChange(createEvent({ selectedItem: undefined }));

		assert.strictEqual(oCartItemsTable.unbindRows.callCount, 1, "the cart items table rows were unbound");
		assert.strictEqual(oFilterStub.callCount, 1, "filter was applied once");
		assert.deepEqual(oFilterStub.firstCall.args[0], [], "an empty filter list clears the filtering");
	});

	QUnit.test("onCartAdminTableSelection binds or unbinds the cart items rows depending on the row context", function (assert) {
		var oCartItemsTable = {
			unbindRows: this.sandbox.stub(),
			bindRows: this.sandbox.stub()
		};
		this.sandbox.stub(Fragment, "byId").returns(oCartItemsTable);

		this.oController.onCartAdminTableSelection(createEvent({ rowContext: null }));
		assert.strictEqual(oCartItemsTable.unbindRows.callCount, 1, "rows were unbound when no row context is given");
		assert.strictEqual(oCartItemsTable.bindRows.callCount, 0, "rows were not bound when no row context is given");

		this.oController.onCartAdminTableSelection(createEvent({
			rowContext: { getPath: function () { return "/Cart(xyz)"; } }
		}));
		assert.strictEqual(oCartItemsTable.bindRows.callCount, 1, "rows were bound once for a valid row context");
		assert.deepEqual(
			oCartItemsTable.bindRows.firstCall.args[0],
			{ path: "/Cart(xyz)/items", parameters: { $expand: "product" } },
			"the rows are bound to the cart items with the product expanded"
		);
	});

	QUnit.test("onExportExcel builds a spreadsheet from the companies rows binding and destroys it afterwards", function (assert) {
		var done = assert.async();

		this.oController.onExportExcel();

		assert.strictEqual(SpreadsheetStub.instances.length, 1, "exactly one spreadsheet was created");

		var oSettings = SpreadsheetStub.lastSettings;
		assert.strictEqual(oSettings.dataSource, this.oRowsBinding, "the companies rows binding is the data source");
		assert.strictEqual(oSettings.fileName, "excel_companies_report_filename", "the i18n file name was used");
		assert.strictEqual(oSettings.worker, false, "the export runs without a worker");
		assert.deepEqual(
			oSettings.workbook.columns.map(function (oColumn) { return oColumn.property; }),
			["ID", "name", "description", "capital"],
			"the workbook contains the expected columns"
		);

		var oInstance = SpreadsheetStub.instances[0];
		oInstance.buildPromise.then(function () {
			return Promise.resolve();
		}).then(function () {
			assert.strictEqual(oInstance.destroyed, true, "the spreadsheet was destroyed after building");
			done();
		});
	});
});
