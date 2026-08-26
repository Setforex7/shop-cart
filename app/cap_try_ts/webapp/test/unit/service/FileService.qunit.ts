// @ts-ignore -- "sap/ui/thirdparty/sinon" ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import type Event from "sap/ui/base/Event";
import type BaseController from "cap_try_ts/controller/BaseController";
import FileService from "cap_try_ts/service/FileService";

type ReaderLike = {
	onload: ((e: unknown) => void) | null;
	onerror: (() => void) | null;
	readAsBinaryString: (file: unknown) => void;
	result: unknown;
};

type StubLike = {
	callCount: number;
	firstCall: { args: unknown[] };
};

type SandboxLike = {
	stub: (oObject?: unknown, sMethod?: string) => StubLike;
	spy: (oObject?: unknown, sMethod?: string) => StubLike;
	restore: () => void;
};

const oGlobal = (0, eval)("this") as Record<string, unknown>;

QUnit.module("cap_try_ts.service.FileService", {
	beforeEach: function (this: Record<string, unknown>) {
		this.sandbox = sinon.sandbox.create();

		// Fake controller stub (no SAPUI5 controls created, nothing to destroy)
		this.oController = {
			getI18nText: function (sKey: string) {
				return "i18n:" + sKey;
			}
		} as unknown as BaseController;

		// Fake FileReader captured per test
		const that = this;
		this.oReader = {
			onload: null,
			onerror: null,
			result: "binary-content",
			readAsBinaryString: function (oFile: unknown) {
				that.readFile = oFile;
				that.readCalls = ((that.readCalls as number) || 0) + 1;
			}
		} as ReaderLike;

		this.oOriginalFileReader = oGlobal.FileReader;
		oGlobal.FileReader = function (this: unknown) {
			return that.oReader as ReaderLike;
		} as unknown as typeof FileReader;

		// Fake XLSX global used by the service
		this.oOriginalXLSX = oGlobal.XLSX;
		this.oParsedRows = [{ name: "Product A", price: 10 }];
		const oParsedRows = this.oParsedRows;
		this.oWorkbook = {
			SheetNames: ["Sheet1"],
			Sheets: { Sheet1: { A1: { v: "name" } } }
		};
		const oWorkbook = this.oWorkbook;
		oGlobal.XLSX = {
			read: function (data: unknown, oOptions: unknown) {
				that.readArgs = { data: data, options: oOptions };
				return oWorkbook;
			},
			utils: {
				sheet_to_json: function (oSheet: unknown) {
					that.sheetArg = oSheet;
					return oParsedRows;
				}
			}
		};

		this.createEvent = function (aFiles: unknown[]) {
			return {
				getParameter: function (sName: string) {
					return sName === "files" ? aFiles : undefined;
				}
			} as unknown as Event;
		};
	},

	afterEach: function (this: Record<string, unknown>) {
		oGlobal.FileReader = this.oOriginalFileReader as typeof FileReader;
		oGlobal.XLSX = this.oOriginalXLSX;
		(this.sandbox as SandboxLike).restore();
		this.oController = null;
		this.oReader = null;
	}
});

QUnit.test("read - exposes a read function on the default export", function (assert) {
	assert.ok(FileService, "FileService module is defined");
	assert.strictEqual(typeof FileService.read, "function", "read is a function");
});

QUnit.test("read - starts reading the first selected file as a binary string", function (this: Record<string, unknown>, assert) {
	const oFile = { name: "products.xlsx" };
	const oEvent = (this.createEvent as (a: unknown[]) => Event)([oFile, { name: "ignored.xlsx" }]);
	const fCallback = (this.sandbox as SandboxLike).stub();

	FileService.read(this.oController as BaseController, oEvent, fCallback as unknown as (data: unknown[]) => void);

	assert.strictEqual(this.readCalls, 1, "readAsBinaryString called exactly once");
	assert.strictEqual(this.readFile, oFile, "the first file of the event is read");
	assert.strictEqual(typeof (this.oReader as ReaderLike).onload, "function", "an onload handler is registered");
	assert.strictEqual(typeof (this.oReader as ReaderLike).onerror, "function", "an onerror handler is registered");
	assert.strictEqual(fCallback.callCount, 0, "callback is not invoked before the file is loaded");
});

QUnit.test("read - does nothing when no file was selected", function (this: Record<string, unknown>, assert) {
	const oEvent = (this.createEvent as (a: unknown[]) => Event)([]);
	const fCallback = (this.sandbox as SandboxLike).stub();

	FileService.read(this.oController as BaseController, oEvent, fCallback as unknown as (data: unknown[]) => void);

	assert.strictEqual(this.readCalls, undefined, "readAsBinaryString is never called");
	assert.strictEqual((this.oReader as ReaderLike).onload, null, "no onload handler is registered");
	assert.strictEqual(fCallback.callCount, 0, "callback is not invoked");
});

QUnit.test("read - onload parses the first sheet and forwards the rows to the callback", function (this: Record<string, unknown>, assert) {
	const oEvent = (this.createEvent as (a: unknown[]) => Event)([{ name: "products.xlsx" }]);
	const fCallback = (this.sandbox as SandboxLike).stub();

	FileService.read(this.oController as BaseController, oEvent, fCallback as unknown as (data: unknown[]) => void);

	const oReader = this.oReader as ReaderLike;
	oReader.onload!({ target: { result: "binary-content" } });

	const oReadArgs = this.readArgs as { data: unknown; options: { type: string } };
	assert.strictEqual(oReadArgs.data, "binary-content", "the reader result is passed to XLSX.read");
	assert.strictEqual(oReadArgs.options.type, "binary", "XLSX.read is called with type 'binary'");
	assert.strictEqual(
		this.sheetArg,
		(this.oWorkbook as { Sheets: Record<string, unknown> }).Sheets.Sheet1,
		"the first sheet of the workbook is converted to JSON"
	);
	assert.strictEqual(fCallback.callCount, 1, "callback invoked once");
	assert.deepEqual(fCallback.firstCall.args[0], this.oParsedRows, "parsed rows are handed to the callback");
});

QUnit.test("read - onerror shows an i18n error message box", function (this: Record<string, unknown>, assert) {
	const oErrorStub = (this.sandbox as SandboxLike).stub(MessageBox, "error");
	const oI18nSpy = (this.sandbox as SandboxLike).spy(this.oController as object, "getI18nText");
	const oEvent = (this.createEvent as (a: unknown[]) => Event)([{ name: "products.xlsx" }]);
	const fCallback = (this.sandbox as SandboxLike).stub();

	FileService.read(this.oController as BaseController, oEvent, fCallback as unknown as (data: unknown[]) => void);

	(this.oReader as ReaderLike).onerror!();

	assert.strictEqual(oI18nSpy.callCount, 1, "i18n text is resolved once");
	assert.strictEqual(oI18nSpy.firstCall.args[0], "file_read_error", "the 'file_read_error' key is used");
	assert.strictEqual(oErrorStub.callCount, 1, "MessageBox.error is shown once");
	assert.strictEqual(oErrorStub.firstCall.args[0], "i18n:file_read_error", "the resolved text is displayed");
	assert.strictEqual(fCallback.callCount, 0, "callback is not invoked on a read error");
});
