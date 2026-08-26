// @ts-ignore -- the sinon build bundled with SAPUI5 ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import JSONModel from "sap/ui/model/json/JSONModel";
import FileService from "cap_try_ts/service/FileService";

interface FakeFileReader {
	onload: ((e: unknown) => void) | null;
	onerror: (() => void) | null;
	result: unknown;
	readAsBinaryString: (file: unknown) => void;
}

interface StubLike {
	callCount: number;
	args: unknown[][];
	calledWith: (...args: unknown[]) => boolean;
}

interface SandboxLike {
	stub: (target: object, method: string) => StubLike;
	spy: (target: object, method: string) => StubLike;
	restore: () => void;
}

interface SinonLike {
	sandbox: { create: () => SandboxLike };
}

type GlobalWithStubs = Record<string, unknown>;

const oSinon = sinon as unknown as SinonLike;

QUnit.module("cap_try_ts/service/FileService", {
	beforeEach: function (this: Record<string, unknown>) {
		this.oSandbox = oSinon.sandbox.create();

		// A JSON model stands in for a disposable SAPUI5 object created per test.
		this.oModel = new JSONModel({});

		// Minimal BaseController stand-in - no real controller instantiation needed.
		this.oControllerStub = {
			getI18nText: function (sKey: string): string {
				return "i18n:" + sKey;
			}
		};

		// Fake FileReader captured per test so we can drive onload/onerror manually.
		const that = this as Record<string, unknown>;
		that.aCreatedReaders = [] as FakeFileReader[];
		that.sReadFile = null;

		const oGlobal = globalThis as unknown as GlobalWithStubs;
		that.fnOriginalFileReader = oGlobal.FileReader;
		that.fnOriginalXLSX = oGlobal.XLSX;

		oGlobal.FileReader = function (this: FakeFileReader) {
			const oReader = this;
			oReader.onload = null;
			oReader.onerror = null;
			oReader.result = null;
			oReader.readAsBinaryString = function (oFile: unknown): void {
				that.sReadFile = oFile;
			};
			(that.aCreatedReaders as FakeFileReader[]).push(oReader);
		};

		that.oSheetsPassedToJson = [];
		that.oWorkbook = {
			SheetNames: ["Products", "Ignored"],
			Sheets: {
				Products: { marker: "products-sheet" },
				Ignored: { marker: "ignored-sheet" }
			}
		};
		that.aReadArgs = [];
		that.aJsonResult = [{ name: "Chair", price: 10 }];

		oGlobal.XLSX = {
			read: function (data: unknown, oOptions: unknown): unknown {
				(that.aReadArgs as unknown[]).push({ data: data, options: oOptions });
				return that.oWorkbook;
			},
			utils: {
				sheet_to_json: function (oSheet: unknown): unknown {
					(that.oSheetsPassedToJson as unknown[]).push(oSheet);
					return that.aJsonResult;
				}
			}
		};
	},

	afterEach: function (this: Record<string, unknown>) {
		const oGlobal = globalThis as unknown as GlobalWithStubs;
		oGlobal.FileReader = this.fnOriginalFileReader;
		oGlobal.XLSX = this.fnOriginalXLSX;

		(this.oModel as JSONModel).destroy();
		this.oModel = null;

		(this.oSandbox as SandboxLike).restore();
	}
});

function makeEvent(aFiles: unknown[]): unknown {
	return {
		getParameter: function (sName: string): unknown {
			return sName === "files" ? aFiles : undefined;
		}
	};
}

QUnit.test("read: exposes a callable read method", function (assert) {
	assert.ok(FileService, "FileService module is available");
	assert.strictEqual(typeof FileService.read, "function", "read is a function");
});

QUnit.test("read: does nothing when no file was selected", function (this: Record<string, unknown>, assert) {
	const oEvent = makeEvent([]);

	FileService.read(
		this.oControllerStub as never,
		oEvent as never,
		function () {
			assert.ok(false, "callback must not be invoked without a file");
		}
	);

	assert.strictEqual((this.aCreatedReaders as unknown[]).length, 0, "no FileReader was created");
	assert.strictEqual(this.sReadFile, null, "no file was read");
});

QUnit.test("read: starts a binary read of the first selected file", function (this: Record<string, unknown>, assert) {
	const oFirstFile = { name: "first.xlsx" };
	const oSecondFile = { name: "second.xlsx" };
	const oEvent = makeEvent([oFirstFile, oSecondFile]);

	FileService.read(this.oControllerStub as never, oEvent as never, function () { /* not called yet */ });

	assert.strictEqual((this.aCreatedReaders as unknown[]).length, 1, "exactly one FileReader was created");
	assert.strictEqual(this.sReadFile, oFirstFile, "the first file of the selection is read");
});

QUnit.test("read: parses the first sheet and hands the rows to the callback", function (this: Record<string, unknown>, assert) {
	const oFile = { name: "products.xlsx" };
	const oEvent = makeEvent([oFile]);
	let aCallbackData: unknown = null;
	let iCallbackCount = 0;

	FileService.read(this.oControllerStub as never, oEvent as never, function (aData: unknown[]) {
		iCallbackCount++;
		aCallbackData = aData;
	});

	const oReader = (this.aCreatedReaders as FakeFileReader[])[0];
	assert.strictEqual(typeof oReader.onload, "function", "an onload handler was registered");

	oReader.onload!({ target: { result: "binary-content" } });

	const aReadArgs = this.aReadArgs as { data: unknown; options: { type: string } }[];
	assert.strictEqual(aReadArgs.length, 1, "XLSX.read was called once");
	assert.strictEqual(aReadArgs[0].data, "binary-content", "the reader result is passed to XLSX.read");
	assert.strictEqual(aReadArgs[0].options.type, "binary", "the workbook is read as binary");

	const aSheets = this.oSheetsPassedToJson as { marker: string }[];
	assert.strictEqual(aSheets.length, 1, "sheet_to_json was called once");
	assert.strictEqual(aSheets[0].marker, "products-sheet", "only the first sheet is converted");

	assert.strictEqual(iCallbackCount, 1, "the callback ran exactly once");
	assert.deepEqual(aCallbackData, [{ name: "Chair", price: 10 }], "the parsed rows are handed to the callback");
});

QUnit.test("read: reports a read failure through MessageBox using the i18n text", function (this: Record<string, unknown>, assert) {
	const oErrorStub = (this.oSandbox as SandboxLike).stub(MessageBox as unknown as object, "error");
	const oI18nSpy = (this.oSandbox as SandboxLike).spy(this.oControllerStub as object, "getI18nText");
	const oEvent = makeEvent([{ name: "broken.xlsx" }]);
	let bCallbackCalled = false;

	FileService.read(this.oControllerStub as never, oEvent as never, function () {
		bCallbackCalled = true;
	});

	const oReader = (this.aCreatedReaders as FakeFileReader[])[0];
	assert.strictEqual(typeof oReader.onerror, "function", "an onerror handler was registered");

	oReader.onerror!();

	assert.strictEqual(oErrorStub.callCount, 1, "MessageBox.error was shown once");
	assert.strictEqual(oI18nSpy.calledWith("file_read_error"), true, "the file_read_error key is resolved");
	assert.strictEqual(oErrorStub.args[0][0], "i18n:file_read_error", "the translated text is displayed");
	assert.strictEqual(bCallbackCalled, false, "the callback is not invoked on error");
});
