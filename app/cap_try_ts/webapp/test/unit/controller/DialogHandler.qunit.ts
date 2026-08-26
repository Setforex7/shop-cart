import Fragment from "sap/ui/core/Fragment";
import Log from "sap/base/Log";
import Dialog from "sap/m/Dialog";
import NavContainer from "sap/m/NavContainer";
import Page from "sap/m/Page";
import JSONModel from "sap/ui/model/json/JSONModel";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- the sinon bundled with UI5 ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import DialogHandler from "cap_try_ts/controller/DialogHandler";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const oSinon = sinon as Any;

QUnit.module("cap_try_ts.controller.DialogHandler", {
	beforeEach: function (this: Any) {
		this.oSandbox = oSinon.sandbox.create();

		// Real UI5 controls used as fragment stand-ins / containers.
		this.oNavContainer = new NavContainer("mainContainer");
		this.oFragment = new Page();
		this.oDialog = new Dialog();
		this.oGlobalModel = new JSONModel({ selectedCompany: "C1" });
		this.oI18nModel = new JSONModel({});
		this.oODataModel = new JSONModel({});

		this.aDependents = [];

		const oNavContainer = this.oNavContainer as NavContainer;
		const aDependents = this.aDependents as Any[];
		const oGlobalModel = this.oGlobalModel as JSONModel;
		const oI18nModel = this.oI18nModel as JSONModel;
		const oODataModel = this.oODataModel as JSONModel;

		this.oComponentStub = {
			getModel: function (): JSONModel {
				return oODataModel;
			}
		};

		this.oViewStub = {
			getId: function (): string {
				return "testView";
			},
			byId: function (sId: string): Any {
				return sId === "mainContainer" ? oNavContainer : undefined;
			},
			addDependent: function (oControl: Any): void {
				aDependents.push(oControl);
			}
		};

		const oViewStub = this.oViewStub as Any;
		const oComponentStub = this.oComponentStub as Any;
		const oDialog = this.oDialog as Dialog;

		this.oControllerStub = {
			getView: function (): Any {
				return oViewStub;
			},
			getOwnerComponent: function (): Any {
				return oComponentStub;
			},
			getModel: function (sName?: string): Any {
				if (sName === "globalModel") {
					return oGlobalModel;
				}
				if (sName === "i18n") {
					return oI18nModel;
				}
				return oODataModel;
			},
			byId: function (): Any {
				return oDialog;
			}
		};

		this.oDialogHandler = new DialogHandler(this.oControllerStub as Any);
	},
	afterEach: function (this: Any) {
		this.oSandbox.restore();

		if (this.oDialogHandler && (this.oDialogHandler as Any).destroy) {
			(this.oDialogHandler as Any).destroy();
		}
		(this.oNavContainer as NavContainer).destroy();
		(this.oFragment as Page).destroy();
		(this.oDialog as Dialog).destroy();
		(this.oGlobalModel as JSONModel).destroy();
		(this.oI18nModel as JSONModel).destroy();
		(this.oODataModel as JSONModel).destroy();

		this.oDialogHandler = null;
		this.oControllerStub = null;
		this.oViewStub = null;
		this.oComponentStub = null;
	}
});

QUnit.test("constructor stores the controller and initialises the fragment caches", function (this: Any, assert: Assert) {
	const oHandler = this.oDialogHandler as Any;

	assert.ok(oHandler instanceof DialogHandler, "An instance of DialogHandler is created");
	assert.strictEqual(oHandler._oController, this.oControllerStub, "The controller reference is stored");
	assert.strictEqual(oHandler._oCompaniesFragment, undefined, "The Companies fragment cache starts undefined");
	assert.strictEqual(oHandler._oCartsFragment, undefined, "The Carts fragment cache starts undefined");
	assert.strictEqual(oHandler._dDialogCart, undefined, "The Cart dialog cache starts undefined");
	assert.strictEqual(oHandler._dDialogAddProduct, undefined, "The AddProduct dialog cache starts undefined");
	assert.strictEqual(oHandler._dDialogEditProduct, undefined, "The EditProduct dialog cache starts undefined");
});

QUnit.test("the public API methods are exposed on the prototype", function (this: Any, assert: Assert) {
	const oHandler = this.oDialogHandler as Any;
	const aMethods = [
		"_openCompaniesFragment",
		"_openCartsFragment",
		"_openAddProductDialog",
		"_closeAddProductDialog",
		"_openEditProductDialog",
		"_closeEditProductDialog",
		"_openCartDialog",
		"_closeCartDialog"
	];

	aMethods.forEach(function (sMethod: string) {
		assert.strictEqual(typeof oHandler[sMethod], "function", sMethod + " is a function");
	});

	assert.strictEqual(aMethods.length, 8, "All documented members are covered");
});

QUnit.test("a fragment is loaded once and cached for subsequent opens", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;
	const oFragment = this.oFragment as Page;
	const oNavContainer = this.oNavContainer as NavContainer;

	const oLoadStub = this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oFragment));
	const oToSpy = this.oSandbox.spy(oNavContainer, "to");

	oHandler._openCompaniesFragment();

	(oHandler._oCompaniesFragment as Promise<unknown>).then(function (this: Any) {
		assert.strictEqual(oLoadStub.callCount, 1, "Fragment.load is called once on the first open");
		assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try_ts.view.fragments.Companies",
			"The Companies fragment name is requested");
		assert.strictEqual(oLoadStub.firstCall.args[0].id, "testView", "The fragment is namespaced with the view id");
		assert.strictEqual(oLoadStub.firstCall.args[0].controller, this.oControllerStub,
			"The owning controller is passed to the fragment");
		assert.deepEqual(this.aDependents, [oFragment], "The loaded fragment is added as a view dependent");
		assert.strictEqual(oNavContainer.getPages().length, 1, "The fragment is added as a page of the NavContainer");
		assert.strictEqual(oToSpy.callCount, 1, "The NavContainer navigates to the fragment");

		oHandler._openCompaniesFragment();

		return (oHandler._oCompaniesFragment as Promise<unknown>).then(function () {
			assert.strictEqual(oLoadStub.callCount, 1, "The cached fragment is reused on the second open");
			assert.strictEqual(oToSpy.callCount, 2, "The NavContainer navigates again to the cached fragment");
			done();
		});
	}.bind(this));
});

QUnit.test("a failed fragment load is logged and the cache is reset", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;
	const oError = new Error("boom");

	this.oSandbox.stub(Fragment, "load").returns(Promise.reject(oError));
	const oLogStub = this.oSandbox.stub(Log, "error");

	oHandler._openCartsFragment();

	const pPending = oHandler._oCartsFragment as Promise<unknown>;

	pPending.then(function () {
		assert.strictEqual(oLogStub.callCount, 1, "The load failure is logged exactly once");
		assert.strictEqual(oLogStub.firstCall.args[0], "Failed to load Carts fragment:", "The log message identifies the fragment");
		assert.strictEqual(oHandler._oCartsFragment, undefined, "The cache is cleared so a later open can retry");
		done();
	});
});

QUnit.test("a dialog fragment is loaded, added as dependent and opened", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;
	const oDialog = this.oDialog as Dialog;

	const oLoadStub = this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));
	const oOpenStub = this.oSandbox.stub(oDialog, "open");

	oHandler._openAddProductDialog();

	(oHandler._dDialogAddProduct as Promise<unknown>).then(function (this: Any) {
		assert.strictEqual(oLoadStub.callCount, 1, "Fragment.load is called once");
		assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try_ts.view.fragments.AddProduct",
			"The AddProduct fragment name is requested");
		assert.deepEqual(this.aDependents, [oDialog], "The dialog is added as a view dependent");
		assert.strictEqual(oOpenStub.callCount, 1, "The dialog is opened");
		done();
	}.bind(this));
});

QUnit.test("the edit-product dialog is cached between opens", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;
	const oDialog = this.oDialog as Dialog;

	const oLoadStub = this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));
	const oOpenStub = this.oSandbox.stub(oDialog, "open");

	oHandler._openEditProductDialog();

	(oHandler._dDialogEditProduct as Promise<unknown>).then(function () {
		assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try_ts.view.fragments.EditProduct",
			"The EditProduct fragment name is requested");

		oHandler._openEditProductDialog();

		return (oHandler._dDialogEditProduct as Promise<unknown>).then(function () {
			assert.strictEqual(oLoadStub.callCount, 1, "The dialog is only loaded once");
			assert.strictEqual(oOpenStub.callCount, 2, "The cached dialog is opened on both calls");
			done();
		});
	});
});

QUnit.test("the cart dialog receives its models and is opened", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;
	const oDialog = this.oDialog as Dialog;

	const oLoadStub = this.oSandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));
	const oOpenStub = this.oSandbox.stub(oDialog, "open");

	oHandler._openCartDialog().then(function (this: Any) {
		assert.strictEqual(oLoadStub.callCount, 1, "Fragment.load is called once");
		assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try_ts.view.fragments.Cart",
			"The Cart fragment name is requested");
		assert.strictEqual(oDialog.getModel("globalModel"), this.oGlobalModel, "The globalModel is set on the dialog");
		assert.strictEqual(oDialog.getModel("i18n"), this.oI18nModel, "The i18n model is set on the dialog");
		assert.strictEqual(oDialog.getModel(), this.oODataModel, "The component default model is set on the dialog");
		assert.strictEqual(oOpenStub.callCount, 1, "The cart dialog is opened");
		done();
	}.bind(this));
});

QUnit.test("a failed cart dialog load is logged and the cache is reset", function (this: Any, assert: Assert) {
	const done = assert.async();
	const oHandler = this.oDialogHandler as Any;

	this.oSandbox.stub(Fragment, "load").returns(Promise.reject(new Error("no cart")));
	const oLogStub = this.oSandbox.stub(Log, "error");

	oHandler._openCartDialog().then(function () {
		assert.strictEqual(oLogStub.callCount, 1, "The load failure is logged");
		assert.strictEqual(oLogStub.firstCall.args[0], "Failed to load Cart fragment:", "The log message identifies the fragment");
		assert.strictEqual(oHandler._dDialogCart, undefined, "The cart dialog cache is cleared");
		done();
	});
});

QUnit.test("the close helpers close the dialog resolved from the controller", function (this: Any, assert: Assert) {
	const oHandler = this.oDialogHandler as Any;
	const oDialog = this.oDialog as Dialog;

	const oCloseStub = this.oSandbox.stub(oDialog, "close");
	const oByIdSpy = this.oSandbox.spy(this.oControllerStub, "byId");

	oHandler._closeAddProductDialog();
	oHandler._closeEditProductDialog();
	oHandler._closeCartDialog();

	assert.strictEqual(oCloseStub.callCount, 3, "Each close helper closes its dialog");
	assert.strictEqual(oByIdSpy.callCount, 3, "Each close helper resolves the dialog through the controller");
	assert.deepEqual(
		[oByIdSpy.getCall(0).args[0], oByIdSpy.getCall(1).args[0], oByIdSpy.getCall(2).args[0]],
		["AddProduct", "editProduct", "Cart"],
		"The expected fragment ids are looked up"
	);
});
