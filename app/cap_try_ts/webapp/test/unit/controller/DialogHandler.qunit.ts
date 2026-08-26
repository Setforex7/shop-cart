import DialogHandler from "cap_try_ts/controller/DialogHandler";
import Controller from "sap/ui/core/mvc/Controller";
import BaseObject from "sap/ui/base/Object";
import Fragment from "sap/ui/core/Fragment";

/**
 * Unit tests for cap_try_ts/controller/DialogHandler.
 *
 * DialogHandler exposes no non-underscore public methods of its own, so the
 * observable public surface under test is the constructor contract (the
 * controller reference it keeps and the lazy fragment/dialog caches it
 * initialises) plus the inherited sap/ui/base/Object lifecycle.
 *
 * No test double library is used here: Fragment.load is swapped for a local
 * counting stub in beforeEach and restored in afterEach, which keeps the test
 * free of any dependency that is not resolvable from the UI5 type definitions.
 */

type DialogHandlerController = ConstructorParameters<typeof DialogHandler>[0];
type DialogHandlerInternals = Record<string, unknown>;

const CACHE_FIELDS: string[] = [
	"_oCompaniesFragment",
	"_oCartsFragment",
	"_dDialogCart",
	"_dDialogAddProduct",
	"_dDialogEditProduct"
];

const API_METHODS: string[] = [
	"_openCompaniesFragment",
	"_openCartsFragment",
	"_openAddProductDialog",
	"_closeAddProductDialog",
	"_openEditProductDialog",
	"_closeEditProductDialog",
	"_openCartDialog",
	"_closeCartDialog"
];

let oControllerStub: Controller | undefined;
let oDialogHandler: DialogHandler | undefined;
let fnOriginalFragmentLoad: unknown;
let iFragmentLoadCallCount: number = 0;

function internals(oHandler: DialogHandler): DialogHandlerInternals {
	return oHandler as unknown as DialogHandlerInternals;
}

function fragmentModule(): Record<string, unknown> {
	return Fragment as unknown as Record<string, unknown>;
}

QUnit.module("cap_try_ts/controller/DialogHandler", {
	beforeEach: function (): void {
		// Guard against any accidental fragment loading during the tests.
		icFragmentLoadReset();

		oControllerStub = new Controller("cap_try_ts.controller.DialogHandlerTest");
		oDialogHandler = new DialogHandler(oControllerStub as unknown as DialogHandlerController);
	},
	afterEach: function (): void {
		if (oDialogHandler) {
			oDialogHandler.destroy();
			oDialogHandler = undefined;
		}
		if (oControllerStub) {
			oControllerStub.destroy();
			oControllerStub = undefined;
		}
		fragmentModule()["load"] = fnOriginalFragmentLoad;
	}
});

function icFragmentLoadReset(): void {
	icFragmentLoadCountReset();
	fnOriginalFragmentLoad = fragmentModule()["load"];
	fragmentModule()["load"] = function (): Promise<undefined> {
		iFragmentLoadCallCount = iFragmentLoadCallCount + 1;
		return Promise.resolve(undefined);
	};
}

function icFragmentLoadCountReset(): void {
	iFragmentLoadCallCount = 0;
}

QUnit.test("constructor creates an instance of DialogHandler", function (assert: Assert): void {
	assert.ok(oDialogHandler instanceof DialogHandler, "instance is a DialogHandler");
});

QUnit.test("constructor produces a sap/ui/base/Object subclass instance", function (assert: Assert): void {
	assert.ok(oDialogHandler instanceof BaseObject, "DialogHandler extends sap/ui/base/Object");
});

QUnit.test("constructor keeps the controller reference it was given", function (assert: Assert): void {
	assert.strictEqual(
		internals(oDialogHandler as DialogHandler)["_oController"],
		oControllerStub,
		"the controller passed to the constructor is stored on the instance"
	);
});

QUnit.test("constructor initialises every fragment/dialog cache as undefined", function (assert: Assert): void {
	const oInternals: DialogHandlerInternals = internals(oDialogHandler as DialogHandler);

	CACHE_FIELDS.forEach(function (sField: string): void {
		assert.strictEqual(oInternals[sField], undefined, sField + " starts out undefined");
	});
});

QUnit.test("constructor does not eagerly load any fragment", function (assert: Assert): void {
	assert.strictEqual(iFragmentLoadCallCount, 0, "Fragment.load is not called while constructing the handler");
});

QUnit.test("instance exposes the expected fragment and dialog operations", function (assert: Assert): void {
	const oInternals: DialogHandlerInternals = internals(oDialogHandler as DialogHandler);

	API_METHODS.forEach(function (sMethod: string): void {
		assert.strictEqual(typeof oInternals[sMethod], "function", sMethod + " is a function");
	});
});

QUnit.test("each instance owns an independent fragment cache", function (assert: Assert): void {
	const oOtherController: Controller = new Controller("cap_try_ts.controller.DialogHandlerTest.other");
	const oOtherHandler: DialogHandler = new DialogHandler(oOtherController as unknown as DialogHandlerController);

	try {
		const oMarker: Promise<undefined> = Promise.resolve(undefined);
		internals(oDialogHandler as DialogHandler)["_dDialogCart"] = oMarker;

		assert.strictEqual(
			internals(oDialogHandler as DialogHandler)["_dDialogCart"],
			oMarker,
			"the cache of the first handler holds the assigned value"
		);
		assert.strictEqual(
			internals(oOtherHandler)["_dDialogCart"],
			undefined,
			"the cache of the second handler is untouched"
		);
		assert.notStrictEqual(
			internals(oOtherHandler)["_oController"],
			internals(oDialogHandler as DialogHandler)["_oController"],
			"each handler keeps its own controller reference"
		);
	} finally {
		oOtherHandler.destroy();
		oOtherController.destroy();
	}
});

QUnit.test("destroy can be called on the handler without throwing", function (assert: Assert): void {
	const oHandler: DialogHandler = new DialogHandler(oControllerStub as unknown as DialogHandlerController);

	oHandler.destroy();

	assert.ok(true, "destroy() completed without raising an error");
});
