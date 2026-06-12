sap.ui.define([
    "cap_try/service/CompanyService",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/thirdparty/sinon"
], function (CompanyService, MessageBox, MessageToast, sinon) {
    "use strict";

    QUnit.module("cap_try.service.CompanyService", {
        beforeEach: function () {
            var that = this;

            this.sandbox = sinon.sandbox.create();

            this.oMessageBoxErrorStub = this.sandbox.stub(MessageBox, "error");
            this.oMessageToastShowStub = this.sandbox.stub(MessageToast, "show");

            this.oODataModel = {
                bindList: this.sandbox.stub(),
                submitBatch: this.sandbox.stub().returns(Promise.resolve())
            };
            this.oGlobalModel = {
                refresh: this.sandbox.stub()
            };

            // Mock of the controller collaborator (BaseController surface used by the service)
            this.oController = {
                getModel: this.sandbox.spy(function (sName) {
                    return sName === "globalModel" ? that.oGlobalModel : that.oODataModel;
                }),
                getI18nText: this.sandbox.spy(function (sKey) {
                    return sKey;
                }),
                _addMessage: this.sandbox.spy(),
                setProp: this.sandbox.spy()
            };
        },
        afterEach: function () {
            // No SAPUI5 controls are instantiated by these tests; restore all stubs/spies
            this.sandbox.restore();
        }
    });

    QUnit.test("create: success path adds a Success message and shows a MessageToast", function (assert) {
        var done = assert.async();
        var that = this;

        var oCreatedContext = {
            created: function () {
                return Promise.resolve();
            },
            getObject: function () {
                return { name: "ACME" };
            }
        };
        var oCreateStub = this.sandbox.stub().returns(oCreatedContext);
        this.oODataModel.bindList.returns({ create: oCreateStub });

        CompanyService.create(this.oController, { name: "ACME" }).then(function () {
            assert.ok(that.oODataModel.bindList.calledWith("/Company"), "bindList was called with the /Company entity set");
            assert.ok(oCreateStub.calledWith({ name: "ACME" }), "create was called with the new company payload");
            assert.strictEqual(that.oController._addMessage.callCount, 1, "_addMessage was called exactly once");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Success", "a Success message was added");
            assert.ok(that.oMessageToastShowStub.calledOnce, "MessageToast.show was called once");
            assert.ok(that.oMessageToastShowStub.calledWith("create_company_success"), "the success i18n text was shown");
            assert.ok(that.oMessageBoxErrorStub.notCalled, "MessageBox.error was not called on success");
            done();
        });
    });

    QUnit.test("create: error path adds an Error message and shows a MessageBox", function (assert) {
        var done = assert.async();
        var that = this;

        var oCreatedContext = {
            created: function () {
                return Promise.reject(new Error("backend failure"));
            },
            getObject: function () {
                return { name: "ACME" };
            }
        };
        this.oODataModel.bindList.returns({ create: this.sandbox.stub().returns(oCreatedContext) });

        CompanyService.create(this.oController, { name: "ACME" }).then(function () {
            assert.strictEqual(that.oController._addMessage.callCount, 1, "_addMessage was called exactly once");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Error", "an Error message was added");
            assert.ok(that.oMessageBoxErrorStub.calledOnce, "MessageBox.error was called once");
            assert.ok(that.oMessageBoxErrorStub.calledWith("create_company_error"), "the error i18n text was shown");
            assert.ok(that.oMessageToastShowStub.notCalled, "MessageToast.show was not called on failure");
            done();
        });
    });

    QUnit.test("edit: success path writes properties, submits the batch and reports success", function (assert) {
        var done = assert.async();
        var that = this;

        var oSetPropertySpy = this.sandbox.spy();
        var oCompany = {
            metadata: { setProperty: oSetPropertySpy },
            name: "ACME",
            description: "A company",
            capital: "123.45"
        };

        CompanyService.edit(this.oController, oCompany).then(function () {
            assert.strictEqual(oSetPropertySpy.callCount, 3, "setProperty was called for name, description and capital");
            assert.ok(oSetPropertySpy.calledWith("name", "ACME"), "name was written to the context");
            assert.ok(oSetPropertySpy.calledWith("description", "A company"), "description was written to the context");
            assert.ok(oSetPropertySpy.calledWith("capital", 123.45), "capital was parsed to a float before writing");
            assert.ok(that.oODataModel.submitBatch.calledWith("updateCompanies"), "submitBatch was called with the updateCompanies group");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Success", "a Success message was added");
            assert.ok(that.oMessageToastShowStub.calledWith("edit_company_success"), "the edit success i18n text was shown");
            assert.ok(that.oMessageBoxErrorStub.notCalled, "MessageBox.error was not called on success");
            done();
        });
    });

    QUnit.test("edit: missing metadata shows a no-selection error and aborts", function (assert) {
        var done = assert.async();
        var that = this;

        CompanyService.edit(this.oController, { name: "ACME", description: "x", capital: "1" }).then(function () {
            assert.ok(that.oMessageBoxErrorStub.calledOnce, "MessageBox.error was called once");
            assert.ok(that.oMessageBoxErrorStub.calledWith("edit_company_no_selection"), "the no-selection i18n text was shown");
            assert.ok(that.oODataModel.submitBatch.notCalled, "submitBatch was not called");
            assert.ok(that.oController._addMessage.notCalled, "no message was added to the message model");
            done();
        });
    });

    QUnit.test("edit: failing batch submit adds an Error message and shows a MessageBox", function (assert) {
        var done = assert.async();
        var that = this;

        this.oODataModel.submitBatch.returns(Promise.reject(new Error("batch failed")));

        var oCompany = {
            metadata: { setProperty: this.sandbox.spy() },
            name: "ACME",
            description: "A company",
            capital: "10"
        };

        CompanyService.edit(this.oController, oCompany).then(function () {
            assert.strictEqual(that.oController._addMessage.callCount, 1, "_addMessage was called exactly once");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Error", "an Error message was added");
            assert.ok(that.oMessageBoxErrorStub.calledWith("edit_company_error"), "the edit error i18n text was shown");
            assert.ok(that.oMessageToastShowStub.notCalled, "MessageToast.show was not called on failure");
            done();
        });
    });

    QUnit.test("clearSelected: resets the selected company and refreshes the global model", function (assert) {
        CompanyService.clearSelected(this.oController);

        assert.strictEqual(this.oController.setProp.callCount, 1, "setProp was called exactly once");
        assert.strictEqual(this.oController.setProp.firstCall.args[0], "globalModel", "setProp targeted the globalModel");
        assert.strictEqual(this.oController.setProp.firstCall.args[1], "/selectedCompany", "setProp targeted /selectedCompany");
        assert.deepEqual(this.oController.setProp.firstCall.args[2], {}, "the selected company was reset to an empty object");
        assert.ok(this.oController.getModel.calledWith("globalModel"), "the globalModel was requested");
        assert.ok(this.oGlobalModel.refresh.calledWith(true), "the global model was refreshed with force=true");
    });
});
