import QUnit from "sap/ui/thirdparty/qunit-2";
import FileService from "cap_try_ts/service/FileService";

interface Spy {
	(...args: any[]): any;
	callCount: number;
	called: boolean;
	calledWith: (...args: any[]) => boolean;
}

function createSpy(fImpl?: (...args: any[]) => any): Spy {
	const aCalls: any[][] = [];
	const fSpy = function (...args: any[]): any {
		aCalls.push(args);
		return fImpl ? fImpl.apply(null, args) : undefined;
	} as Spy;
	Object.defineProperty(fSpy, "callCount", {
		get: function (): number {
			return aCalls.length;
		}
	});
	Object.defineProperty(fSpy, "called", {
		get: function (): boolean {
			return aCalls.length > 0;
		}
	});
	fSpy.calledWith = function (...expected: any[]): boolean {
		return aCalls.some(function (aCallArgs: any[]): boolean {
			return expected.every(function (vValue: any, iIndex: number): boolean {
				return aCallArgs[iIndex] === vValue;
			});
		});
	};
	return fSpy;
}

let oController: any;

QUnit.module("cap_try_ts.service.FileService", {
	beforeEach: function (): void {
		oController = {
			getI18nText: function (sKey: string): string {
				return sKey;
			}
		};
	},
	afterEach: function (): void {
		oController = null;
	}
});

QUnit.test("read is exposed as a public function", function (assert): void {
	assert.strictEqual(typeof FileService.read, "function", "FileService exposes a read method");
});

QUnit.test("read returns early and does not invoke the callback when the file list is empty", function (assert): void {
	const fCallback = createSpy();
	const oEvent = {
		getParameter: function (sName: string): unknown {
			return sName === "files" ? [] : undefined;
		}
	};

	FileService.read(oController, oEvent as any, fCallback);

	assert.strictEqual(fCallback.called, false, "callback is not called when no file is selected");
});

QUnit.test("read skips processing without throwing when the selected file entry is undefined", function (assert): void {
	const fCallback = createSpy();
	const oEvent = {
		getParameter: function (): unknown {
			return [undefined];
		}
	};

	FileService.read(oController, oEvent as any, fCallback);

	assert.strictEqual(fCallback.callCount, 0, "callback is not triggered for an undefined file entry");
});

QUnit.test("read reads the file parameter named 'files' from the event", function (assert): void {
	const fCallback = createSpy();
	const oGetParameter = createSpy(function (): unknown {
		return [];
	});
	const oEvent = {
		getParameter: oGetParameter
	};

	FileService.read(oController, oEvent as any, fCallback);

	assert.ok(oGetParameter.calledWith("files"), "read requests the 'files' parameter from the event");
});
