// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - "sap/ui/thirdparty/sinon" is a runtime-only UI5 module without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import CompanyService from "cap_try_ts/service/CompanyService";

QUnit.module("cap_try_ts/service/CompanyService", {
    beforeEach: function (this: any) {
        this.oSandbox = sinon.sandbox.create();

        this.aMessages = [];

        const that = this;

        // --- OData v4 model test double ---
        this.oCreatedContext = {
            created: function () {
                return Promise.resolve();
            },
            getObject: function () {
                return { name: "ACME" };
            }
        };

        this.oListBinding = {
            create: function () {
                return that.oCreatedContext;
            }
        };

        this.oODataModel = {
            bindList: function () {
                return that.oListBinding;
            },
            submitBatch: function () {
                return Promise.resolve();
            }
        };

        // --- globalModel (JSONModel) test double ---
        this.oGlobalModel = {
            refresh: function (bForce: boolean) {
                that.bRefreshed = bForce;
            }
        };

        this.aSetProps = [];

        // --- BaseController test double ---
        this.oController = {
            getModel: function (sName?: string) {
                return sName === "globalModel" ? that.oGlobalModel : that.oODataModel;
            },
            getI18nText: function (sKey: string, aArgs?: unknown[]) {
                return aArgs && aArgs.length ? sKey + ":" + String(aArgs[0]) : sKey;
            },
            _addMessage: function (oMessage: object) {
                that.aMessages.push(oMessage);
            },
            setProp: function (sModel: string, sPath: string, vValue: unknown) {
                that.aSetProps.push({ model: sModel, path: sPath, value: vValue });
            }
        };
    },

    afterEach: function (this: any) {
        this.oSandbox.restore();
        // No SAPUI5 controls are instantiated in this suite; nothing to destroy.
        this.oController = null;
        this.oODataModel = null;
        this.oGlobalModel = null;
        this.oListBinding = null;
        this.oCreatedContext = null;
    }
});

QUnit.test("create() creates the company, awaits creation and reports success", function (this: any, assert) {
    const done = assert.async();
    const oCompanyPayload = { name: "ACME", description: "desc", capital: 100 };

    const oBindListSpy = this.oSandbox.spy(this.oODataModel, "bindList");
    const oCreateSpy = this.oSandbox.spy(this.oListBinding, "create");
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.create(this.oController, oCompanyPayload).then(() => {
        assert.strictEqual(oBindListSpy.callCount, 1, "bindList was called once");
        assert.strictEqual(oBindListSpy.firstCall.args[0], "/Company", "bindList was called with the Company entity set");
        assert.strictEqual(oCreateSpy.callCount, 1, "a new company context was created");
        assert.deepEqual(oCreateSpy.firstCall.args[0], oCompanyPayload, "the company payload was forwarded to create()");
        assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Success", "a Success message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].title, "success", "the success title key was resolved");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].subtitle, "create_company_success:ACME",
            "the subtitle contains the created company name");
        done();
    });
});

QUnit.test("create() adds an Error message when the creation fails", function (this: any, assert) {
    const done = assert.async();

    this.oSandbox.stub(this.oODataModel, "bindList").throws(new Error("bindList failed"));
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.create(this.oController, { name: "ACME" }).then(() => {
        assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Error", "an Error message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].title, "error", "the error title key was resolved");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].subtitle, "create_company_error",
            "the error subtitle key was resolved");
        done();
    });
});

QUnit.test("create() rejects with no unhandled error when created() rejects", function (this: any, assert) {
    const done = assert.async();

    this.oSandbox.stub(this.oCreatedContext, "created").returns(Promise.reject(new Error("create failed")));
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.create(this.oController, { name: "ACME" }).then(() => {
        assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Error", "the rejection was translated into an Error message");
        done();
    });
});

QUnit.test("edit() aborts without submitting a batch when no selection metadata is given", function (this: any, assert) {
    const done = assert.async();

    const oSubmitSpy = this.oSandbox.spy(this.oODataModel, "submitBatch");
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.edit(this.oController, {
        name: "ACME",
        description: "desc",
        capital: "100"
    } as any).then(() => {
        assert.strictEqual(oSubmitSpy.callCount, 0, "no batch was submitted without a selected company");
        assert.strictEqual(oAddMessageSpy.callCount, 0, "no message was pushed to the message model");
        done();
    });
});

QUnit.test("edit() writes every property, submits the batch and reports success", function (this: any, assert) {
    const done = assert.async();
    const aSetProperties: { key: string; value: unknown }[] = [];

    const oMetadata = {
        setProperty: function (sKey: string, vValue: unknown) {
            aSetProperties.push({ key: sKey, value: vValue });
        }
    };

    const oSubmitSpy = this.oSandbox.spy(this.oODataModel, "submitBatch");
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.edit(this.oController, {
        metadata: oMetadata as any,
        name: "ACME",
        description: "desc",
        capital: "250.5"
    }).then(() => {
        assert.deepEqual(aSetProperties, [
            { key: "name", value: "ACME" },
            { key: "description", value: "desc" },
            { key: "capital", value: 250.5 }
        ], "name, description and the parsed capital were written to the context");
        assert.strictEqual(oSubmitSpy.callCount, 1, "the batch was submitted once");
        assert.strictEqual(oSubmitSpy.firstCall.args[0], "updateCompanies", "the updateCompanies batch group was used");
        assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Success", "a Success message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].subtitle, "edit_company_success:ACME",
            "the subtitle contains the edited company name");
        done();
    });
});

QUnit.test("edit() adds an Error message when submitBatch rejects", function (this: any, assert) {
    const done = assert.async();

    const oMetadata = {
        setProperty: function () {
            /* no-op */
        }
    };

    this.oSandbox.stub(this.oODataModel, "submitBatch").returns(Promise.reject(new Error("batch failed")));
    const oAddMessageSpy = this.oSandbox.spy(this.oController, "_addMessage");

    void CompanyService.edit(this.oController, {
        metadata: oMetadata as any,
        name: "ACME",
        description: "desc",
        capital: "10"
    }).then(() => {
        assert.strictEqual(oAddMessageSpy.callCount, 1, "exactly one message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].type, "Error", "an Error message was added");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].title, "error", "the error title key was resolved");
        assert.strictEqual(oAddMessageSpy.firstCall.args[0].subtitle, "edit_company_error:ACME",
            "the error subtitle contains the company name");
        done();
    });
});

QUnit.test("edit() parses a non-numeric capital into NaN and still submits", function (this: any, assert) {
    const done = assert.async();
    const aSetProperties: { key: string; value: unknown }[] = [];

    const oMetadata = {
        setProperty: function (sKey: string, vValue: unknown) {
            aSetProperties.push({ key: sKey, value: vValue });
        }
    };

    void CompanyService.edit(this.oController, {
        metadata: oMetadata as any,
        name: "ACME",
        description: "desc",
        capital: "not-a-number"
    }).then(() => {
        const oCapital = aSetProperties.filter((o) => o.key === "capital")[0];
        assert.ok(oCapital, "the capital property was written");
        assert.strictEqual(Number.isNaN(oCapital.value as number), true, "an unparsable capital becomes NaN");
        done();
    });
});

QUnit.test("clearSelected() resets the selected company and force-refreshes the globalModel", function (this: any, assert) {
    const oSetPropSpy = this.oSandbox.spy(this.oController, "setProp");
    const oRefreshSpy = this.oSandbox.spy(this.oGlobalModel, "refresh");

    const vResult = CompanyService.clearSelected(this.oController);

    assert.strictEqual(vResult, undefined, "clearSelected() returns nothing");
    assert.strictEqual(oSetPropSpy.callCount, 1, "setProp was called once");
    assert.strictEqual(oSetPropSpy.firstCall.args[0], "globalModel", "the globalModel was targeted");
    assert.strictEqual(oSetPropSpy.firstCall.args[1], "/selectedCompany", "the selectedCompany path was targeted");
    assert.deepEqual(oSetPropSpy.firstCall.args[2], {}, "the selected company was reset to an empty object");
    assert.strictEqual(oRefreshSpy.callCount, 1, "the globalModel was refreshed once");
    assert.strictEqual(oRefreshSpy.firstCall.args[0], true, "the refresh was forced");
});
