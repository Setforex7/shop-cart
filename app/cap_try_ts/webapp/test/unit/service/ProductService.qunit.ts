// @ts-ignore -- bundled UI5 sinon has no type declarations
import sinon from "sap/ui/thirdparty/sinon";
import ProductService from "cap_try_ts/service/ProductService";
import JSONModel from "sap/ui/model/json/JSONModel";

QUnit.module("cap_try_ts/service/ProductService", {
    beforeEach: function (this: any) {
        this.oSandbox = sinon.sandbox.create();

        this.oGlobalModel = new JSONModel({
            selectedCompany: { ID: "COMPANY-1" },
            product: { name: "old" }
        });

        // Plain test double for the view (sap.ui.core.mvc.View is abstract).
        this.oViewBindElementStub = this.oSandbox.stub();
        this.oViewSetBusyStub = this.oSandbox.stub();
        this.oView = {
            bindElement: this.oViewBindElementStub,
            setBusy: this.oViewSetBusyStub
        };
        this.oViewSetBusyStub.returns(this.oView);

        // Stubbed OData list binding
        this.oCreatedContext = {
            created: this.oSandbox.stub().returns(Promise.resolve()),
            getObject: this.oSandbox.stub().returns({ name: "Widget" })
        };
        this.oListBinding = {
            create: this.oSandbox.stub().returns(this.oCreatedContext)
        };

        // Stubbed OData v4 model
        this.oODataModel = {
            bindList: this.oSandbox.stub().returns(this.oListBinding),
            submitBatch: this.oSandbox.stub().returns(Promise.resolve())
        };

        this.oDialogHandler = {
            _closeAddProductDialog: this.oSandbox.stub()
        };

        this.aMessages = [];
        const aMessages = this.aMessages;
        const oGlobalModel = this.oGlobalModel;

        // Minimal BaseController test double
        this.oController = {
            getModel: this.oSandbox.stub().returns(this.oODataModel),
            getView: this.oSandbox.stub().returns(this.oView),
            getDialogHandler: this.oSandbox.stub().returns(this.oDialogHandler),
            getI18nText: function (sKey: string, aArgs?: unknown[]): string {
                return aArgs && aArgs.length ? sKey + ":" + String(aArgs[0]) : sKey;
            },
            _addMessage: function (oMessage: unknown): void {
                aMessages.push(oMessage);
            },
            getProp: function (sModel: string, sPath: string): unknown {
                return (oGlobalModel as JSONModel).getProperty(sPath);
            },
            setProp: function (sModel: string, sPath: string, vValue: unknown): void {
                (oGlobalModel as JSONModel).setProperty(sPath, vValue);
            }
        };

        this.oLoadByCompanySpy = this.oSandbox.spy(ProductService, "loadByCompany");
    },

    afterEach: function (this: any) {
        this.oSandbox.restore();
        this.oGlobalModel.destroy();
    }
});

QUnit.test("create() creates the product, reports success and reloads the company", async function (this: any, assert) {
    const oProduct = {
        name: "Widget",
        description: "A widget",
        company_ID: "COMPANY-1",
        price: 10,
        stock_min: 1,
        stock: 5
    };

    await ProductService.create(this.oController, oProduct);

    assert.strictEqual(this.oODataModel.bindList.callCount, 1, "bindList was called once");
    assert.strictEqual(this.oODataModel.bindList.firstCall.args[0], "/Products", "bindList was called with the Products entity set");
    assert.ok(this.oListBinding.create.calledWith(oProduct), "the product payload was passed to create()");
    assert.strictEqual(this.oCreatedContext.created.callCount, 1, "the created() promise was awaited");
    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.strictEqual(this.aMessages[0].type, "Success", "a success message was added");
    assert.deepEqual(this.oGlobalModel.getProperty("/product"), {}, "the transient product was reset");
    assert.strictEqual(this.oDialogHandler._closeAddProductDialog.callCount, 1, "the add product dialog was closed");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 1, "loadByCompany was triggered");
});

QUnit.test("create() adds an error message when creation fails", async function (this: any, assert) {
    this.oCreatedContext.created.returns(Promise.reject(new Error("boom")));

    const oProduct = {
        name: "Broken",
        description: "",
        company_ID: "COMPANY-1",
        price: 1,
        stock_min: 0,
        stock: 0
    };

    await ProductService.create(this.oController, oProduct);

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
    assert.strictEqual(this.aMessages[0].subtitle, "create_product_error:Broken", "the failing product name is part of the message");
    assert.strictEqual(this.oDialogHandler._closeAddProductDialog.callCount, 0, "the dialog stays open on failure");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 0, "loadByCompany is not triggered on failure");
});

QUnit.test("createBatch() creates every product with the selected company and submits the batch", async function (this: any, assert) {
    const aProducts: Record<string, unknown>[] = [
        { name: "A", price: 1 },
        { name: "B", price: 2 }
    ];

    await ProductService.createBatch(this.oController, aProducts);

    assert.strictEqual(this.oListBinding.create.callCount, 2, "one create per uploaded row");
    assert.strictEqual(aProducts[0].company_ID, "COMPANY-1", "the first row got the selected company");
    assert.strictEqual(aProducts[1].company_ID, "COMPANY-1", "the second row got the selected company");
    assert.ok(this.oODataModel.submitBatch.calledWith("editProducts"), "the editProducts batch group was submitted");
    assert.strictEqual(this.aMessages.length, 2, "one success message per product");
    assert.strictEqual(this.aMessages[0].type, "Success", "the messages are success messages");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 1, "loadByCompany was triggered");
});

QUnit.test("createBatch() adds an error message when the batch fails", async function (this: any, assert) {
    this.oODataModel.submitBatch.returns(Promise.reject(new Error("batch failed")));

    await ProductService.createBatch(this.oController, [{ name: "A" }]);

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
    assert.strictEqual(this.aMessages[0].subtitle, "create_product_error", "the generic create error text was used");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 0, "loadByCompany is not triggered on failure");
});

QUnit.test("edit() writes every property to the context and submits the update batch", async function (this: any, assert) {
    const oSetProperty = this.oSandbox.stub();
    const oProduct = {
        metadata: { setProperty: oSetProperty } as never,
        name: "Widget",
        description: "Updated",
        price: 42,
        stock: 7,
        stock_min: 2
    };

    await ProductService.edit(this.oController, oProduct);

    assert.strictEqual(oSetProperty.callCount, 5, "all five editable properties were written");
    assert.ok(oSetProperty.calledWith("name", "Widget"), "name was written");
    assert.ok(oSetProperty.calledWith("price", 42), "price was written");
    assert.ok(oSetProperty.calledWith("stock_min", 2), "stock_min was written");
    assert.ok(this.oODataModel.submitBatch.calledWith("updateProducts"), "the updateProducts batch group was submitted");
    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.strictEqual(this.aMessages[0].type, "Success", "a success message was added");
});

QUnit.test("edit() adds an error message when the update batch fails", async function (this: any, assert) {
    this.oODataModel.submitBatch.returns(Promise.reject(new Error("update failed")));

    await ProductService.edit(this.oController, {
        metadata: { setProperty: this.oSandbox.stub() } as never,
        name: "Widget",
        description: "Updated",
        price: 42,
        stock: 7,
        stock_min: 2
    });

    assert.strictEqual(this.aMessages.length, 1, "exactly one message was added");
    assert.strictEqual(this.aMessages[0].type, "Error", "an error message was added");
    assert.strictEqual(this.aMessages[0].subtitle, "edit_product_error:Widget", "the failing product name is part of the message");
});

QUnit.test("delete() removes a single context and reloads the company", async function (this: any, assert) {
    const oDelete = this.oSandbox.stub().returns(Promise.resolve());
    const oContext = {
        getObject: this.oSandbox.stub().returns({ name: "Widget" }),
        delete: oDelete
    };

    await ProductService.delete(this.oController, oContext as never);

    assert.strictEqual(oDelete.callCount, 1, "the context was deleted once");
    assert.strictEqual(oDelete.firstCall.args[0], "$auto", "the $auto group was used");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 1, "loadByCompany was triggered");
});

QUnit.test("delete() removes every context of an array", async function (this: any, assert) {
    const oDeleteA = this.oSandbox.stub().returns(Promise.resolve());
    const oDeleteB = this.oSandbox.stub().returns(Promise.resolve());
    const aContexts = [
        { getObject: this.oSandbox.stub().returns({ name: "A" }), delete: oDeleteA },
        { getObject: this.oSandbox.stub().returns({ name: "B" }), delete: oDeleteB }
    ];

    await ProductService.delete(this.oController, aContexts as never);

    assert.strictEqual(oDeleteA.callCount, 1, "the first context was deleted");
    assert.strictEqual(oDeleteB.callCount, 1, "the second context was deleted");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 1, "loadByCompany was triggered once");
});

QUnit.test("delete() does nothing when no context is supplied", async function (this: any, assert) {
    await ProductService.delete(this.oController, null as never);

    assert.strictEqual(this.oLoadByCompanySpy.callCount, 0, "loadByCompany was not triggered");
    assert.strictEqual(this.oViewSetBusyStub.callCount, 0, "the view busy state was left untouched");
});

QUnit.test("delete() releases the busy state when deletion fails", async function (this: any, assert) {
    const oContext = {
        getObject: this.oSandbox.stub().returns({ name: "Widget" }),
        delete: this.oSandbox.stub().returns(Promise.reject(new Error("delete failed")))
    };

    await ProductService.delete(this.oController, oContext as never);

    assert.strictEqual(this.oViewSetBusyStub.callCount, 1, "setBusy was called once");
    assert.strictEqual(this.oViewSetBusyStub.firstCall.args[0], false, "the view was set to not busy");
    assert.strictEqual(this.oLoadByCompanySpy.callCount, 0, "loadByCompany is not triggered on failure");
});

QUnit.test("loadByCompany() binds the view to the selected company and clears busy", function (this: any, assert) {
    ProductService.loadByCompany(this.oController);

    assert.strictEqual(this.oViewBindElementStub.callCount, 1, "bindElement was called once");
    assert.deepEqual(
        this.oViewBindElementStub.firstCall.args[0],
        { path: "/Company('COMPANY-1')" },
        "the view was bound to the selected company"
    );
    assert.strictEqual(this.oViewSetBusyStub.callCount, 1, "setBusy was called once");
    assert.strictEqual(this.oViewSetBusyStub.firstCall.args[0], false, "the view was set to not busy");
});
