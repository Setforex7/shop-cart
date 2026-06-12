sap.ui.define([
    "cap_try/service/ProductService",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/thirdparty/sinon"
], function (ProductService, MessageBox, MessageToast, sinon) {
    "use strict";

    var sandbox;

    function createControllerStub() {
        var oModel = {
            bindList: sandbox.stub(),
            submitBatch: sandbox.stub().returns(Promise.resolve())
        };
        var oView = {
            bindElement: sandbox.stub(),
            setBusy: sandbox.stub()
        };
        var oDialogHandler = {
            _closeAddProductDialog: sandbox.stub()
        };
        return {
            getModel: sandbox.stub().returns(oModel),
            getView: sandbox.stub().returns(oView),
            getDialogHandler: sandbox.stub().returns(oDialogHandler),
            getI18nText: sandbox.stub().returnsArg(0),
            getProp: sandbox.stub().returns({ ID: "C1" }),
            setProp: sandbox.stub(),
            _addMessage: sandbox.stub(),
            _model: oModel,
            _view: oView,
            _dialogHandler: oDialogHandler
        };
    }

    QUnit.module("cap_try.service.ProductService", {
        beforeEach: function () {
            sandbox = sinon.sandbox.create();
            sandbox.stub(MessageBox, "success");
            sandbox.stub(MessageBox, "error");
            sandbox.stub(MessageToast, "show");
            this.oController = createControllerStub();
        },
        afterEach: function () {
            sandbox.restore();
            this.oController = null;
        }
    });

    QUnit.test("create: success path creates the product, notifies and reloads", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oCreatedContext = {
            created: sandbox.stub().returns(Promise.resolve()),
            getObject: sandbox.stub().returns({ name: "Widget" })
        };
        var oListBinding = { create: sandbox.stub().returns(oCreatedContext) };
        oController._model.bindList.returns(oListBinding);
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.create(oController, { name: "Widget" }).then(function () {
            assert.ok(oController._model.bindList.calledWith("/Products"), "bindList is called with the /Products entity set");
            assert.ok(oListBinding.create.calledWith({ name: "Widget" }), "create is called with the product payload");
            assert.strictEqual(oController._addMessage.getCall(0).args[0].type, "Success", "a Success message is added");
            assert.ok(MessageBox.success.calledWith("product_created_success"), "MessageBox.success is shown with the i18n text");
            assert.ok(oController.setProp.calledWith("globalModel", "/product"), "the product draft is reset in the global model");
            assert.ok(oController._dialogHandler._closeAddProductDialog.calledOnce, "the add-product dialog is closed");
            assert.ok(oLoadStub.calledWith(oController), "loadByCompany is triggered after creation");
            done();
        });
    });

    QUnit.test("create: error path adds an Error message and shows a MessageBox", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oCreatedContext = {
            created: sandbox.stub().returns(Promise.reject(new Error("backend failure"))),
            getObject: sandbox.stub()
        };
        oController._model.bindList.returns({ create: sandbox.stub().returns(oCreatedContext) });
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.create(oController, { name: "Widget" }).then(function () {
            assert.strictEqual(oController._addMessage.getCall(0).args[0].type, "Error", "an Error message is added");
            assert.ok(MessageBox.error.calledWith("create_product_error"), "MessageBox.error is shown with the i18n text");
            assert.ok(MessageBox.success.notCalled, "no success box on failure");
            assert.ok(oLoadStub.notCalled, "loadByCompany is not triggered on failure");
            done();
        });
    });

    QUnit.test("createBatch: assigns the selected company, submits the batch and notifies per product", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oListBinding = { create: sandbox.stub() };
        oController._model.bindList.returns(oListBinding);
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");
        var aProducts = [{ name: "A" }, { name: "B" }];

        ProductService.createBatch(oController, aProducts).then(function () {
            assert.ok(oController.getProp.calledWith("globalModel", "/selectedCompany"), "the selected company is read from the global model");
            assert.strictEqual(aProducts[0].company_ID, "C1", "company id assigned to the first product");
            assert.strictEqual(aProducts[1].company_ID, "C1", "company id assigned to the second product");
            assert.strictEqual(oListBinding.create.callCount, 2, "one create call per product");
            assert.ok(oController._model.submitBatch.calledWith("editProducts"), "the editProducts batch group is submitted");
            assert.strictEqual(oController._addMessage.callCount, 2, "one Success message per product");
            assert.ok(MessageToast.show.calledWith("excel_upload_success"), "the upload success toast is shown");
            assert.ok(oLoadStub.calledWith(oController), "loadByCompany is triggered after the batch");
            done();
        });
    });

    QUnit.test("createBatch: error path shows a MessageBox and adds an Error message", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        oController._model.bindList.returns({ create: sandbox.stub() });
        oController._model.submitBatch.returns(Promise.reject(new Error("batch failed")));
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.createBatch(oController, [{ name: "A" }]).then(function () {
            assert.strictEqual(oController._addMessage.getCall(0).args[0].type, "Error", "an Error message is added");
            assert.ok(MessageBox.error.calledWith("create_product_error"), "MessageBox.error is shown");
            assert.ok(MessageToast.show.notCalled, "no success toast on failure");
            assert.ok(oLoadStub.notCalled, "loadByCompany is not triggered on failure");
            done();
        });
    });

    QUnit.test("edit: writes all editable properties to the context and submits the update batch", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oMetadata = { setProperty: sandbox.stub() };
        var oProduct = { metadata: oMetadata, name: "Widget", description: "desc", price: 9.5, stock: 10, stock_min: 2 };

        ProductService.edit(oController, oProduct).then(function () {
            assert.strictEqual(oMetadata.setProperty.callCount, 5, "all five properties are written");
            assert.ok(oMetadata.setProperty.calledWith("name", "Widget"), "name is written to the context");
            assert.ok(oMetadata.setProperty.calledWith("price", 9.5), "price is written to the context");
            assert.ok(oController._model.submitBatch.calledWith("updateProducts"), "the updateProducts batch group is submitted");
            assert.strictEqual(oController._addMessage.getCall(0).args[0].type, "Success", "a Success message is added");
            assert.ok(MessageBox.error.notCalled, "no error box on success");
            done();
        });
    });

    QUnit.test("edit: error path adds an Error message and shows a MessageBox", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        oController._model.submitBatch.returns(Promise.reject(new Error("update failed")));
        var oProduct = { metadata: { setProperty: sandbox.stub() }, name: "Widget", description: "d", price: 1, stock: 1, stock_min: 0 };

        ProductService.edit(oController, oProduct).then(function () {
            assert.strictEqual(oController._addMessage.getCall(0).args[0].type, "Error", "an Error message is added");
            assert.ok(MessageBox.error.calledWith("edit_product_error"), "MessageBox.error is shown with the i18n text");
            done();
        });
    });

    QUnit.test("delete: returns early when no products are passed", function (assert) {
        var done = assert.async();
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.delete(this.oController, null).then(function () {
            assert.ok(MessageToast.show.notCalled, "no toast is shown");
            assert.ok(MessageBox.error.notCalled, "no error box is shown");
            assert.ok(oLoadStub.notCalled, "loadByCompany is not triggered");
            done();
        });
    });

    QUnit.test("delete: deletes a single context, shows a toast and reloads", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oContext = {
            getObject: sandbox.stub().returns({ name: "Widget" }),
            delete: sandbox.stub().returns(Promise.resolve())
        };
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.delete(oController, oContext).then(function () {
            assert.ok(oContext.delete.calledWith("$auto"), "the context is deleted via the $auto group");
            assert.ok(MessageToast.show.calledWith("delete_product_success"), "the delete success toast is shown");
            assert.ok(oLoadStub.calledWith(oController), "loadByCompany is triggered after deletion");
            done();
        });
    });

    QUnit.test("delete: deletes every context of an array and reloads once", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oContextA = { getObject: sandbox.stub().returns({ name: "A" }), delete: sandbox.stub().returns(Promise.resolve()) };
        var oContextB = { getObject: sandbox.stub().returns({ name: "B" }), delete: sandbox.stub().returns(Promise.resolve()) };
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.delete(oController, [oContextA, oContextB]).then(function () {
            assert.ok(oContextA.delete.calledWith("$auto"), "first context deleted via $auto");
            assert.ok(oContextB.delete.calledWith("$auto"), "second context deleted via $auto");
            assert.strictEqual(MessageToast.show.callCount, 2, "one toast per deleted product");
            assert.strictEqual(oLoadStub.callCount, 1, "loadByCompany is triggered exactly once");
            done();
        });
    });

    QUnit.test("delete: error path unsets busy and shows an error MessageBox", function (assert) {
        var done = assert.async();
        var oController = this.oController;
        var oContext = {
            getObject: sandbox.stub().returns({ name: "Widget" }),
            delete: sandbox.stub().returns(Promise.reject(new Error("delete failed")))
        };
        var oLoadStub = sandbox.stub(ProductService, "loadByCompany");

        ProductService.delete(oController, oContext).then(function () {
            assert.ok(oController._view.setBusy.calledWith(false), "the view busy state is cleared");
            assert.ok(MessageBox.error.calledWith("delete_product_error"), "MessageBox.error is shown with the i18n text");
            assert.ok(oLoadStub.notCalled, "loadByCompany is not triggered on failure");
            done();
        });
    });

    QUnit.test("loadByCompany: binds the view to the selected company and unsets busy", function (assert) {
        ProductService.loadByCompany(this.oController);

        assert.ok(this.oController.getProp.calledWith("globalModel", "/selectedCompany"), "the selected company is read from the global model");
        assert.deepEqual(this.oController._view.bindElement.getCall(0).args[0], { path: "/Company('C1')" }, "the view is element-bound to the selected company");
        assert.ok(this.oController._view.setBusy.calledWith(false), "the view busy state is cleared");
    });
});
