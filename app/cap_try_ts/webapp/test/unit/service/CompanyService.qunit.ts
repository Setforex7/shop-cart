import CompanyService from "cap_try_ts/service/CompanyService";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";

let sandbox: any;
let oController: any;
let aMessages: any[];

QUnit.module("cap_try_ts.service.CompanyService", {
    beforeEach: function () {
        sandbox = sinon.sandbox.create();
        sandbox.stub(MessageBox, "error");
        sandbox.stub(MessageToast, "show");

        aMessages = [];
        oController = {
            _addMessage: function (oMessage: object) {
                aMessages.push(oMessage);
            },
            getI18nText: function (sKey: string) {
                return sKey;
            },
            getModel: function () {
                return null;
            },
            setProp: function () {
                /* no-op */
            }
        };
    },
    afterEach: function () {
        sandbox.restore();
    }
});

QUnit.test("create() adds a success message and toast when the company is created", async function (assert) {
    const oNewContext = {
        created: function () {
            return Promise.resolve();
        },
        getObject: function () {
            return { name: "ACME" };
        }
    };
    const oListBinding = {
        create: sandbox.stub().returns(oNewContext)
    };
    const oModel = {
        bindList: sandbox.stub().returns(oListBinding)
    };
    sandbox.stub(oController, "getModel").returns(oModel);
    const oAddMessageSpy = sandbox.spy(oController, "_addMessage");

    await CompanyService.create(oController, { name: "ACME" });

    assert.ok(oModel.bindList.calledWith("/Company"), "bindList was called for the Company entity set");
    assert.ok(oListBinding.create.calledOnce, "a new company context was created");
    assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
    assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Success", "a success message was added");
    assert.ok((MessageToast.show as any).calledOnce, "a success toast was shown");
    assert.ok((MessageBox.error as any).notCalled, "no error dialog was shown");
});

QUnit.test("create() adds an error message and dialog when creation fails", async function (assert) {
    const oNewContext = {
        created: function () {
            return Promise.reject(new Error("create failed"));
        },
        getObject: function () {
            return { name: "ACME" };
        }
    };
    const oListBinding = {
        create: sandbox.stub().returns(oNewContext)
    };
    const oModel = {
        bindList: sandbox.stub().returns(oListBinding)
    };
    sandbox.stub(oController, "getModel").returns(oModel);
    const oAddMessageSpy = sandbox.spy(oController, "_addMessage");

    await CompanyService.create(oController, { name: "ACME" });

    assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
    assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Error", "an error message was added");
    assert.ok((MessageBox.error as any).calledOnce, "an error dialog was shown");
    assert.ok((MessageToast.show as any).notCalled, "no success toast was shown");
});

QUnit.test("edit() shows an error and returns early when no company is selected", async function (assert) {
    const oAddMessageSpy = sandbox.spy(oController, "_addMessage");
    const oGetModelSpy = sandbox.spy(oController, "getModel");

    await CompanyService.edit(oController, { name: "ACME", description: "Desc", capital: "100" });

    assert.ok((MessageBox.error as any).calledOnce, "an error dialog was shown");
    assert.ok(oAddMessageSpy.notCalled, "no message was added");
    assert.ok(oGetModelSpy.notCalled, "the model was never accessed");
});

QUnit.test("edit() updates the metadata properties and shows success", async function (assert) {
    const oSetPropertyStub = sandbox.stub();
    const oMetadata = { setProperty: oSetPropertyStub };
    const oModel = {
        submitBatch: sandbox.stub().returns(Promise.resolve())
    };
    sandbox.stub(oController, "getModel").returns(oModel);
    const oAddMessageSpy = sandbox.spy(oController, "_addMessage");

    await CompanyService.edit(oController, {
        metadata: oMetadata as any,
        name: "ACME",
        description: "Desc",
        capital: "150.5"
    });

    assert.strictEqual(oSetPropertyStub.callCount, 3, "name, description and capital were all set");
    assert.ok(oSetPropertyStub.calledWith("capital", 150.5), "the capital was parsed into a float");
    assert.ok(oModel.submitBatch.calledWith("updateCompanies"), "the update batch group was submitted");
    assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Success", "a success message was added");
    assert.ok((MessageToast.show as any).calledOnce, "a success toast was shown");
});

QUnit.test("edit() adds an error message when the batch submit fails", async function (assert) {
    const oSetPropertyStub = sandbox.stub();
    const oMetadata = { setProperty: oSetPropertyStub };
    const oModel = {
        submitBatch: sandbox.stub().returns(Promise.reject(new Error("batch failed")))
    };
    sandbox.stub(oController, "getModel").returns(oModel);
    const oAddMessageSpy = sandbox.spy(oController, "_addMessage");

    await CompanyService.edit(oController, {
        metadata: oMetadata as any,
        name: "ACME",
        description: "Desc",
        capital: "150.5"
    });

    assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Error", "an error message was added");
    assert.ok((MessageBox.error as any).calledOnce, "an error dialog was shown");
});

QUnit.test("clearSelected() resets the selected company and refreshes the global model", function (assert) {
    const oRefreshStub = sandbox.stub();
    const oGlobalModel = { refresh: oRefreshStub };
    const oSetPropStub = sandbox.stub(oController, "setProp");
    sandbox.stub(oController, "getModel").withArgs("globalModel").returns(oGlobalModel);

    CompanyService.clearSelected(oController);

    assert.ok(oSetPropStub.calledOnce, "setProp was called once");
    assert.deepEqual(oSetPropStub.firstCall.args, ["globalModel", "/selectedCompany", {}], "the selected company was reset to an empty object");
    assert.ok(oRefreshStub.calledWith(true), "the global model was force-refreshed");
});
