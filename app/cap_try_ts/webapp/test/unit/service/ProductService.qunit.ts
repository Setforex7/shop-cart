// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import ProductService from "cap_try_ts/service/ProductService";
import type BaseController from "cap_try_ts/controller/BaseController";
import type Context from "sap/ui/model/odata/v4/Context";

function createFakeContext(oSandbox: any, oData: any, sPath?: string): any {
    return {
        getObject: oSandbox.stub().returns(oData),
        getPath: oSandbox.stub().returns(sPath),
        delete: oSandbox.stub().returns(Promise.resolve()),
        created: oSandbox.stub().returns(Promise.resolve()),
        setProperty: oSandbox.stub()
    };
}

QUnit.module("service/ProductService", {
    beforeEach: function (this: any) {
        this.oSandbox = sinon.sandbox.create();

        this.oView = {
            setBusy: this.oSandbox.stub(),
            bindElement: this.oSandbox.stub()
        };

        this.oDataModel = {
            bindList: this.oSandbox.stub(),
            submitBatch: this.oSandbox.stub().returns(Promise.resolve())
        };

        this.oDialogHandler = {
            _closeAddProductDialog: this.oSandbox.stub()
        };

        this.oController = {
            getModel: this.oSandbox.stub().returns(this.oDataModel),
            getView: this.oSandbox.stub().returns(this.oView),
            getProp: this.oSandbox.stub(),
            setProp: this.oSandbox.stub(),
            _addMessage: this.oSandbox.stub(),
            getI18nText: this.oSandbox.stub().returnsArg(0),
            getDialogHandler: this.oSandbox.stub().returns(this.oDialogHandler)
        };

        this.oMessageBoxSuccess = this.oSandbox.stub(MessageBox, "success");
        this.oMessageBoxError = this.oSandbox.stub(MessageBox, "error");
        this.oMessageToastShow = this.oSandbox.stub(MessageToast, "show");
    },

    afterEach: function (this: any) {
        this.oSandbox.restore();
    }
});

QUnit.test("create: creates a product, reports success and reloads the product list", function (this: any, assert) {
    const oProduct = { name: "Widget", description: "desc", company_ID: "c1", price: 10, stock_min: 1, stock: 5 };
    const oCreatedContext = createFakeContext(this.oSandbox, { name: "Widget" });
    const oProductsList = { create: this.oSandbox.stub().returns(oCreatedContext) };
    this.oDataModel.bindList.returns(oProductsList);

    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.create(this.oController as unknown as BaseController, oProduct).then(() => {
        assert.ok(this.oDataModel.bindList.calledWith("/Products"), "product list bound on /Products");
        assert.ok(oProductsList.create.calledWith(oProduct), "product created with given data");
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Success", "success message added");
        assert.ok(this.oMessageBoxSuccess.called, "MessageBox.success shown");
        assert.ok(this.oController.setProp.calledWith("globalModel", "/product", {}), "product form state cleared");
        assert.ok(this.oDialogHandler._closeAddProductDialog.called, "add product dialog closed");
        assert.ok(oLoadStub.calledWith(this.oController), "product list reloaded");
    });
});

QUnit.test("create: reports an error message when creation fails", function (this: any, assert) {
    const oProduct = { name: "Widget", description: "desc", company_ID: "c1", price: 10, stock_min: 1, stock: 5 };
    const oCreatedContext = createFakeContext(this.oSandbox, { name: "Widget" });
    oCreatedContext.created.returns(Promise.reject(new Error("fail")));
    const oProductsList = { create: this.oSandbox.stub().returns(oCreatedContext) };
    this.oDataModel.bindList.returns(oProductsList);

    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.create(this.oController as unknown as BaseController, oProduct).then(() => {
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
        assert.notOk(oLoadStub.called, "product list not reloaded after failure");
    });
});

QUnit.test("createBatch: creates every product in the batch group and reports success", function (this: any, assert) {
    this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "c1" });

    const aProducts: unknown[] = [{ name: "P1" }, { name: "P2" }];
    const oProductsList = { create: this.oSandbox.stub() };
    this.oDataModel.bindList.returns(oProductsList);

    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.createBatch(this.oController as unknown as BaseController, aProducts).then(() => {
        assert.ok(
            this.oDataModel.bindList.calledWith("/Products", undefined, undefined, undefined, { batchGroupId: "editProducts" }),
            "product list bound with the editProducts batch group"
        );
        assert.equal(oProductsList.create.callCount, 2, "each row was created");
        assert.equal((aProducts[0] as { company_ID?: string }).company_ID, "c1", "company ID assigned to first row");
        assert.equal((aProducts[1] as { company_ID?: string }).company_ID, "c1", "company ID assigned to second row");
        assert.ok(this.oDataModel.submitBatch.calledWith("editProducts"), "editProducts batch submitted");
        assert.equal(this.oController._addMessage.callCount, 2, "a success message added for each product");
        assert.ok(this.oMessageToastShow.calledWith("excel_upload_success"), "success toast shown");
        assert.ok(oLoadStub.calledWith(this.oController), "product list reloaded");
    });
});

QUnit.test("createBatch: reports an error when the batch submission fails", function (this: any, assert) {
    this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "c1" });
    this.oDataModel.submitBatch.returns(Promise.reject(new Error("fail")));

    const aProducts: unknown[] = [{ name: "P1" }];
    const oProductsList = { create: this.oSandbox.stub() };
    this.oDataModel.bindList.returns(oProductsList);

    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.createBatch(this.oController as unknown as BaseController, aProducts).then(() => {
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oMessageBoxError.calledWith("create_product_error"), "MessageBox.error shown");
        assert.notOk(oLoadStub.called, "product list not reloaded after failure");
    });
});

QUnit.test("edit: updates every field on the product metadata and reports success", function (this: any, assert) {
    const oMetadata = createFakeContext(this.oSandbox, {});
    const oProduct = {
        metadata: oMetadata as unknown as Context,
        name: "Widget 2",
        description: "desc2",
        price: 20,
        stock: 3,
        stock_min: 1
    };

    return ProductService.edit(this.oController as unknown as BaseController, oProduct).then(() => {
        assert.equal(oMetadata.setProperty.callCount, 5, "all five fields were updated on the metadata context");
        assert.ok(oMetadata.setProperty.calledWith("name", "Widget 2"), "name property updated");
        assert.ok(oMetadata.setProperty.calledWith("price", 20), "price property updated");
        assert.ok(this.oDataModel.submitBatch.calledWith("updateProducts"), "updateProducts batch submitted");
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Success", "success message added");
        assert.notOk(this.oMessageBoxError.called, "no error shown on success");
    });
});

QUnit.test("edit: reports an error message when the update fails", function (this: any, assert) {
    const oMetadata = createFakeContext(this.oSandbox, {});
    const oProduct = {
        metadata: oMetadata as unknown as Context,
        name: "Widget 2",
        description: "desc2",
        price: 20,
        stock: 3,
        stock_min: 1
    };
    this.oDataModel.submitBatch.returns(Promise.reject(new Error("fail")));

    return ProductService.edit(this.oController as unknown as BaseController, oProduct).then(() => {
        assert.equal(this.oController._addMessage.firstCall.args[0].type, "Error", "error message added");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
    });
});

QUnit.test("delete: returns immediately when no products are given", function (this: any, assert) {
    return ProductService.delete(this.oController as unknown as BaseController, undefined as unknown as Context).then(() => {
        assert.notOk(this.oMessageToastShow.called, "no toast shown");
        assert.notOk(this.oMessageBoxError.called, "no error shown");
    });
});

QUnit.test("delete: deletes a single product and reloads the product list", function (this: any, assert) {
    const oProduct = createFakeContext(this.oSandbox, { name: "Widget" });
    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.delete(this.oController as unknown as BaseController, oProduct as unknown as Context).then(() => {
        assert.ok(oProduct.delete.calledWith("$auto"), "product deleted with $auto group");
        assert.ok(this.oMessageToastShow.called, "toast shown for deleted product");
        assert.ok(oLoadStub.calledWith(this.oController), "product list reloaded");
    });
});

QUnit.test("delete: deletes multiple products in sequence", function (this: any, assert) {
    const oProduct1 = createFakeContext(this.oSandbox, { name: "Widget 1" });
    const oProduct2 = createFakeContext(this.oSandbox, { name: "Widget 2" });
    const oLoadStub = this.oSandbox.stub(ProductService, "loadByCompany");

    return ProductService.delete(this.oController as unknown as BaseController, [oProduct1, oProduct2] as unknown as Context[]).then(() => {
        assert.ok(oProduct1.delete.calledWith("$auto"), "first product deleted");
        assert.ok(oProduct2.delete.calledWith("$auto"), "second product deleted");
        assert.equal(this.oMessageToastShow.callCount, 2, "toast shown for each deleted product");
        assert.ok(oLoadStub.calledOnce, "product list reloaded once after all deletions");
    });
});

QUnit.test("delete: shows an error and resets busy state on failure", function (this: any, assert) {
    const oProduct = createFakeContext(this.oSandbox, { name: "Widget" });
    oProduct.delete.returns(Promise.reject(new Error("fail")));

    return ProductService.delete(this.oController as unknown as BaseController, oProduct as unknown as Context).then(() => {
        assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
        assert.ok(this.oMessageBoxError.called, "MessageBox.error shown");
    });
});

QUnit.test("loadByCompany: binds the view to the selected company and clears the busy state", function (this: any, assert) {
    this.oController.getProp.withArgs("globalModel", "/selectedCompany").returns({ ID: "c1" });

    ProductService.loadByCompany(this.oController as unknown as BaseController);

    assert.ok(this.oView.bindElement.calledWith({ path: "/Company('c1')" }), "view element bound to the selected company");
    assert.ok(this.oView.setBusy.calledWith(false), "view busy reset to false");
});
