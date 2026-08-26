// @ts-ignore - the bundled UI5 sinon ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import CompanyService from "cap_try_ts/service/CompanyService";

type ControllerLike = Parameters<typeof CompanyService.create>[0];

interface StubCall {
    args: unknown[];
}

interface Stub {
    (...args: unknown[]): unknown;
    callCount: number;
    args: unknown[][];
    firstCall: StubCall;
    secondCall: StubCall;
    thirdCall: StubCall;
    returns(vValue: unknown): Stub;
    withArgs(...args: unknown[]): Stub;
}

interface Sandbox {
    restore(): void;
    stub(oObject: object, sMethod: string): Stub;
    spy(oObject: object, sMethod: string): Stub;
}

interface MessageEntry {
    type: string;
    title: string;
    subtitle: string;
}

interface TestContext {
    oSandbox: Sandbox;
    oGlobalModel: JSONModel;
    aMessages: MessageEntry[];
    oCreatedContext: { created: Stub; getObject: Stub };
    oListBinding: { create: Stub };
    oODataModel: { bindList: Stub; submitBatch: Stub };
    oSetPropStub: Stub;
    oController: ControllerLike;
    oMessageToastStub: Stub;
    oMessageBoxStub: Stub;
}

QUnit.module("cap_try_ts.service.CompanyService", {
    beforeEach: function (this: TestContext): void {
        this.oSandbox = sinon.sandbox.create() as Sandbox;

        // JSONModel instance used by clearSelected (destroyed in afterEach)
        this.oGlobalModel = new JSONModel({ selectedCompany: { name: "old" } });

        this.aMessages = [];
        this.oCreatedContext = {
            created: sinon.stub().returns(Promise.resolve()) as Stub,
            getObject: sinon.stub().returns({ name: "ACME" }) as Stub
        };
        this.oListBinding = {
            create: sinon.stub().returns(this.oCreatedContext) as Stub
        };
        this.oODataModel = {
            bindList: sinon.stub().returns(this.oListBinding) as Stub,
            submitBatch: sinon.stub().returns(Promise.resolve()) as Stub
        };
        this.oSetPropStub = sinon.stub() as Stub;

        const that: TestContext = this;
        this.oController = {
            getModel: function (sName?: string): unknown {
                return sName === "globalModel" ? that.oGlobalModel : that.oODataModel;
            },
            getI18nText: function (sKey: string, aArgs?: string[]): string {
                return aArgs && aArgs.length ? sKey + ":" + aArgs.join(",") : sKey;
            },
            _addMessage: function (oMessage: MessageEntry): void {
                that.aMessages.push(oMessage);
            },
            setProp: that.oSetPropStub
        } as unknown as ControllerLike;

        this.oMessageToastStub = this.oSandbox.stub(MessageToast, "show");
        this.oMessageBoxStub = this.oSandbox.stub(MessageBox, "error");
    },
    afterEach: function (this: TestContext): void {
        this.oSandbox.restore();
        this.oGlobalModel.destroy();
    }
});

QUnit.test("create - binds the Company entity set and creates the company", async function (this: TestContext, assert: Assert) {
    const oCompany = { name: "ACME", capital: 100 };

    await CompanyService.create(this.oController, oCompany as never);

    assert.strictEqual(this.oODataModel.bindList.callCount, 1, "bindList was called once");
    assert.strictEqual(this.oODataModel.bindList.firstCall.args[0], "/Company", "bindList was called with the Company entity set");
    assert.strictEqual(this.oListBinding.create.callCount, 1, "create was called once on the list binding");
    assert.deepEqual(this.oListBinding.create.firstCall.args[0], oCompany as unknown, "create received the company payload");
    assert.strictEqual(this.oCreatedContext.created.callCount, 1, "the created() promise was awaited");
});

QUnit.test("create - adds a success message and shows a toast on success", async function (this: TestContext, assert: Assert) {
    await CompanyService.create(this.oController, { name: "ACME" } as never);

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.deepEqual(this.aMessages[0], {
        type: "Success",
        title: "success",
        subtitle: "create_company_success:ACME"
    }, "a success message with the company name was added");
    assert.strictEqual(this.oMessageToastStub.callCount, 1, "a MessageToast was shown");
    assert.strictEqual(this.oMessageToastStub.firstCall.args[0], "create_company_success:ACME", "the toast text contains the company name");
    assert.strictEqual(this.oMessageBoxStub.callCount, 0, "no error box was shown");
});

QUnit.test("create - adds an error message and shows an error box on failure", async function (this: TestContext, assert: Assert) {
    this.oCreatedContext.created.returns(Promise.reject(new Error("backend down")));

    await CompanyService.create(this.oController, { name: "ACME" } as never);

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.deepEqual(this.aMessages[0], {
        type: "Error",
        title: "error",
        subtitle: "create_company_error"
    }, "an error message was added");
    assert.strictEqual(this.oMessageBoxStub.callCount, 1, "MessageBox.error was called");
    assert.strictEqual(this.oMessageBoxStub.firstCall.args[0], "create_company_error", "the error text is the create error key");
    assert.strictEqual(this.oMessageToastStub.callCount, 0, "no success toast was shown");
});

QUnit.test("edit - shows an error and does nothing when no company is selected", async function (this: TestContext, assert: Assert) {
    await CompanyService.edit(this.oController, { name: "ACME", description: "desc", capital: "10" } as never);

    assert.strictEqual(this.oMessageBoxStub.callCount, 1, "MessageBox.error was called");
    assert.strictEqual(this.oMessageBoxStub.firstCall.args[0], "edit_company_no_selection", "the no-selection error text was used");
    assert.strictEqual(this.oODataModel.submitBatch.callCount, 0, "no batch was submitted");
    assert.strictEqual(this.aMessages.length, 0, "no message was added");
});

QUnit.test("edit - writes the properties, submits the batch and reports success", async function (this: TestContext, assert: Assert) {
    const oSetProperty = sinon.stub() as Stub;
    const oMetadata = { setProperty: oSetProperty };

    await CompanyService.edit(this.oController, {
        metadata: oMetadata,
        name: "ACME",
        description: "A description",
        capital: "1234.50"
    } as never);

    assert.strictEqual(oSetProperty.callCount, 3, "name, description and capital were written");
    assert.deepEqual(oSetProperty.firstCall.args, ["name", "ACME"] as unknown[], "name was set");
    assert.deepEqual(oSetProperty.secondCall.args, ["description", "A description"] as unknown[], "description was set");
    assert.deepEqual(oSetProperty.thirdCall.args, ["capital", 1234.5] as unknown[], "capital was parsed to a float before being set");
    assert.strictEqual(this.oODataModel.submitBatch.callCount, 1, "submitBatch was called once");
    assert.strictEqual(this.oODataModel.submitBatch.firstCall.args[0], "updateCompanies", "submitBatch used the updateCompanies group");
    assert.deepEqual(this.aMessages[0], {
        type: "Success",
        title: "success",
        subtitle: "edit_company_success:ACME"
    }, "a success message was added");
    assert.strictEqual(this.oMessageToastStub.callCount, 1, "a success toast was shown");
});

QUnit.test("edit - adds an error message and shows an error box when the batch fails", async function (this: TestContext, assert: Assert) {
    const oMetadata = { setProperty: sinon.stub() as Stub };
    this.oODataModel.submitBatch.returns(Promise.reject(new Error("batch failed")));

    await CompanyService.edit(this.oController, {
        metadata: oMetadata,
        name: "ACME",
        description: "desc",
        capital: "10"
    } as never);

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.deepEqual(this.aMessages[0], {
        type: "Error",
        title: "error",
        subtitle: "edit_company_error:ACME"
    }, "an error message with the company name was added");
    assert.strictEqual(this.oMessageBoxStub.callCount, 1, "MessageBox.error was called");
    assert.strictEqual(this.oMessageBoxStub.firstCall.args[0], "edit_company_error:ACME", "the error text contains the company name");
    assert.strictEqual(this.oMessageToastStub.callCount, 0, "no success toast was shown");
});

QUnit.test("clearSelected - resets the selected company and refreshes the global model", function (this: TestContext, assert: Assert) {
    const oRefreshSpy = this.oSandbox.spy(this.oGlobalModel, "refresh");

    CompanyService.clearSelected(this.oController);

    assert.strictEqual(this.oSetPropStub.callCount, 1, "setProp was called once");
    assert.strictEqual(this.oSetPropStub.firstCall.args[0], "globalModel", "the global model was targeted");
    assert.strictEqual(this.oSetPropStub.firstCall.args[1], "/selectedCompany", "the selectedCompany path was targeted");
    assert.deepEqual(this.oSetPropStub.firstCall.args[2], {} as unknown, "the selected company was reset to an empty object");
    assert.strictEqual(oRefreshSpy.callCount, 1, "the global model was refreshed");
    assert.strictEqual(oRefreshSpy.firstCall.args[0], true, "the refresh was forced");
});
