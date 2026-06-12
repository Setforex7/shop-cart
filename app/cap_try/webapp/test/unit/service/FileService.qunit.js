sap.ui.define([
    "cap_try/service/FileService",
    "sap/ui/thirdparty/sinon"
], function (FileService, sinon) {
    "use strict";

    QUnit.module("cap_try.service.FileService", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();
            this.oService = FileService;
        },
        afterEach: function () {
            this.sandbox.restore();
            this.oService = null;
        }
    });

    QUnit.test("Service exposes a public 'read' function", function (assert) {
        assert.ok(this.oService, "The FileService module was loaded");
        assert.strictEqual(typeof this.oService.read, "function", "'read' is exposed as a function");
    });

    QUnit.test("read: returns early and does not invoke the callback when no file is selected", function (assert) {
        // Arrange
        const fnCallback = this.sandbox.spy();
        const oGetParameterStub = this.sandbox.stub();
        oGetParameterStub.withArgs("files").returns([]);
        const oEvent = { getParameter: oGetParameterStub };
        const oController = {
            getI18nText: this.sandbox.stub().returns("file_read_error_text")
        };

        // Act
        const vResult = this.oService.read(oController, oEvent, fnCallback);

        // Assert
        assert.strictEqual(vResult, undefined, "read returns undefined when the files array is empty");
        assert.ok(oGetParameterStub.calledWith("files"), "read queried the event for the 'files' parameter");
        assert.strictEqual(fnCallback.callCount, 0, "The callback was not invoked when no file is present");
        assert.strictEqual(oController.getI18nText.callCount, 0, "No error text was requested when no file is present");
    });

    QUnit.test("read: returns early when the 'files' parameter contains an undefined entry", function (assert) {
        // Arrange
        const fnCallback = this.sandbox.spy();
        const oGetParameterStub = this.sandbox.stub();
        oGetParameterStub.withArgs("files").returns([undefined]);
        const oEvent = { getParameter: oGetParameterStub };
        const oController = {
            getI18nText: this.sandbox.stub().returns("file_read_error_text")
        };

        // Act
        const vResult = this.oService.read(oController, oEvent, fnCallback);

        // Assert
        assert.strictEqual(vResult, undefined, "read returns undefined when the first file entry is falsy");
        assert.strictEqual(fnCallback.callCount, 0, "The callback was not invoked for a falsy file entry");
    });
});
