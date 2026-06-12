/* global QUnit */
sap.ui.define([
    "cap_try/controller/DialogHandler",
    "sap/ui/core/Fragment",
    "cap_try/service/CartService",
    "sap/base/Log",
    "sap/ui/thirdparty/sinon"
], function (DialogHandler, Fragment, CartService, Log, sinon) {
    "use strict";

    QUnit.module("cap_try.controller.DialogHandler", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();

            this.oMainContainer = {
                addPage: this.sandbox.stub(),
                to: this.sandbox.stub()
            };

            this.oView = {
                getId: this.sandbox.stub().returns("testViewId"),
                byId: this.sandbox.stub().returns(this.oMainContainer),
                addDependent: this.sandbox.stub()
            };

            this.oComponentModel = { isComponentModel: true };
            this.oGlobalModel = { isGlobalModel: true };
            this.oI18nModel = { isI18nModel: true };

            this.oController = {
                getView: this.sandbox.stub().returns(this.oView),
                byId: this.sandbox.stub(),
                getModel: this.sandbox.stub(),
                getOwnerComponent: this.sandbox.stub().returns({
                    getModel: this.sandbox.stub().returns(this.oComponentModel)
                })
            };
            this.oController.getModel.withArgs("globalModel").returns(this.oGlobalModel);
            this.oController.getModel.withArgs("i18n").returns(this.oI18nModel);

            this.oDialogHandler = new DialogHandler(this.oController);
        },
        afterEach: function () {
            this.oDialogHandler.destroy();
            this.oDialogHandler = null;
            this.sandbox.restore();
        }
    });

    QUnit.test("constructor stores the controller reference", function (assert) {
        assert.strictEqual(this.oDialogHandler._oController, this.oController,
            "the controller passed to the constructor is stored in _oController");
        assert.ok(this.oDialogHandler instanceof DialogHandler,
            "an instance of cap_try.controller.DialogHandler is created");
    });

    QUnit.test("constructor initializes all fragment and dialog caches to undefined", function (assert) {
        assert.strictEqual(this.oDialogHandler._oCompaniesFragment, undefined, "_oCompaniesFragment is undefined");
        assert.strictEqual(this.oDialogHandler._oCartsFragment, undefined, "_oCartsFragment is undefined");
        assert.strictEqual(this.oDialogHandler._dDialogCart, undefined, "_dDialogCart is undefined");
        assert.strictEqual(this.oDialogHandler._dDialogAddProduct, undefined, "_dDialogAddProduct is undefined");
        assert.strictEqual(this.oDialogHandler._dDialogEditProduct, undefined, "_dDialogEditProduct is undefined");
    });

    QUnit.test("_openCompaniesFragment loads the fragment once and navigates to it", function (assert) {
        const done = assert.async();
        const oFragment = { fragmentName: "Companies" };
        const oLoadStub = this.sandbox.stub(Fragment, "load").returns(Promise.resolve(oFragment));

        this.oDialogHandler._openCompaniesFragment();

        this.oDialogHandler._oCompaniesFragment.then(function (oResult) {
            assert.strictEqual(oResult, oFragment, "the cached promise resolves with the loaded fragment");
            assert.ok(oLoadStub.calledOnce, "Fragment.load is called exactly once");
            assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try.view.fragments.Companies",
                "the Companies fragment name is requested");
            assert.ok(this.oView.addDependent.calledWith(oFragment), "fragment is added as a view dependent");
            assert.ok(this.oMainContainer.addPage.calledWith(oFragment), "fragment is added as a page");
            assert.ok(this.oMainContainer.to.calledWith(oFragment), "container navigates to the fragment");

            // second call must reuse the cached promise
            this.oDialogHandler._openCompaniesFragment();
            this.oDialogHandler._oCompaniesFragment.then(function () {
                assert.ok(oLoadStub.calledOnce, "Fragment.load is NOT called again on the second open");
                assert.strictEqual(this.oMainContainer.to.callCount, 2, "container navigates to the fragment again");
                done();
            }.bind(this));
        }.bind(this));
    });

    QUnit.test("_openCartsFragment loads the fragment once and navigates to it", function (assert) {
        const done = assert.async();
        const oFragment = { fragmentName: "Carts" };
        const oLoadStub = this.sandbox.stub(Fragment, "load").returns(Promise.resolve(oFragment));

        this.oDialogHandler._openCartsFragment();

        this.oDialogHandler._oCartsFragment.then(function (oResult) {
            assert.strictEqual(oResult, oFragment, "the cached promise resolves with the loaded fragment");
            assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try.view.fragments.Carts",
                "the Carts fragment name is requested");
            assert.ok(this.oView.addDependent.calledWith(oFragment), "fragment is added as a view dependent");
            assert.ok(this.oMainContainer.addPage.calledWith(oFragment), "fragment is added as a page");
            assert.ok(this.oMainContainer.to.calledWith(oFragment), "container navigates to the fragment");
            done();
        }.bind(this));
    });

    QUnit.test("_openAddProductDialog loads the dialog and opens it", function (assert) {
        const done = assert.async();
        const oDialog = { open: this.sandbox.stub() };
        const oLoadStub = this.sandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));

        this.oDialogHandler._openAddProductDialog();

        this.oDialogHandler._dDialogAddProduct.then(function () {
            assert.ok(oLoadStub.calledOnce, "Fragment.load is called exactly once");
            assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try.view.fragments.AddProduct",
                "the AddProduct fragment name is requested");
            assert.ok(this.oView.addDependent.calledWith(oDialog), "dialog is added as a view dependent");
            assert.ok(oDialog.open.calledOnce, "the dialog is opened");

            this.oDialogHandler._openAddProductDialog();
            this.oDialogHandler._dDialogAddProduct.then(function () {
                assert.ok(oLoadStub.calledOnce, "Fragment.load is NOT called again on the second open");
                assert.strictEqual(oDialog.open.callCount, 2, "the cached dialog is opened again");
                done();
            });
        }.bind(this));
    });

    QUnit.test("_closeAddProductDialog closes the AddProduct dialog", function (assert) {
        const oDialog = { close: this.sandbox.stub() };
        this.oController.byId.withArgs("AddProduct").returns(oDialog);

        this.oDialogHandler._closeAddProductDialog();

        assert.ok(this.oController.byId.calledWith("AddProduct"), "the dialog is looked up by id 'AddProduct'");
        assert.ok(oDialog.close.calledOnce, "close() is called on the dialog");
    });

    QUnit.test("_openEditProductDialog loads the dialog and opens it", function (assert) {
        const done = assert.async();
        const oDialog = { open: this.sandbox.stub() };
        const oLoadStub = this.sandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));

        this.oDialogHandler._openEditProductDialog();

        this.oDialogHandler._dDialogEditProduct.then(function () {
            assert.ok(oLoadStub.calledOnce, "Fragment.load is called exactly once");
            assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try.view.fragments.EditProduct",
                "the EditProduct fragment name is requested");
            assert.ok(this.oView.addDependent.calledWith(oDialog), "dialog is added as a view dependent");
            assert.ok(oDialog.open.calledOnce, "the dialog is opened");
            done();
        }.bind(this));
    });

    QUnit.test("_closeEditProductDialog closes the editProduct dialog", function (assert) {
        const oDialog = { close: this.sandbox.stub() };
        this.oController.byId.withArgs("editProduct").returns(oDialog);

        this.oDialogHandler._closeEditProductDialog();

        assert.ok(this.oController.byId.calledWith("editProduct"), "the dialog is looked up by id 'editProduct'");
        assert.ok(oDialog.close.calledOnce, "close() is called on the dialog");
    });

    QUnit.test("_openCartDialog loads the dialog, sets models, opens it and binds cart data", function (assert) {
        const done = assert.async();
        const oDialog = {
            open: this.sandbox.stub(),
            setModel: this.sandbox.stub()
        };
        const oLoadStub = this.sandbox.stub(Fragment, "load").returns(Promise.resolve(oDialog));
        const oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");

        this.oDialogHandler._openCartDialog().then(function () {
            assert.ok(oLoadStub.calledOnce, "Fragment.load is called exactly once");
            assert.strictEqual(oLoadStub.firstCall.args[0].name, "cap_try.view.fragments.Cart",
                "the Cart fragment name is requested");
            assert.strictEqual(this.oDialogHandler._dDialogCart, oDialog, "the dialog is cached");
            assert.ok(oDialog.setModel.calledWith(this.oGlobalModel, "globalModel"), "globalModel is set on the dialog");
            assert.ok(oDialog.setModel.calledWith(this.oI18nModel, "i18n"), "i18n model is set on the dialog");
            assert.ok(oDialog.setModel.calledWith(this.oComponentModel), "default OData model is set on the dialog");
            assert.ok(oDialog.open.calledOnce, "the dialog is opened");
            assert.ok(oBindStub.calledWith(this.oController), "CartService.bindDataToFragment is called with the controller");

            // second call reuses the cached dialog
            this.oDialogHandler._openCartDialog().then(function () {
                assert.ok(oLoadStub.calledOnce, "Fragment.load is NOT called again on the second open");
                assert.strictEqual(oDialog.open.callCount, 2, "the cached dialog is opened again");
                done();
            });
        }.bind(this));
    });

    QUnit.test("_openCartDialog resets the cache when fragment loading fails", function (assert) {
        const done = assert.async();
        this.sandbox.stub(Fragment, "load").returns(Promise.reject(new Error("load failed")));
        this.sandbox.stub(Log, "error");
        const oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");

        this.oDialogHandler._openCartDialog().then(function () {
            assert.strictEqual(this.oDialogHandler._dDialogCart, undefined,
                "_dDialogCart is reset to undefined after a load failure");
            assert.strictEqual(oBindStub.callCount, 0, "bindDataToFragment is not called on failure");
            done();
        }.bind(this));
    });

    QUnit.test("_closeCartDialog closes the Cart dialog", function (assert) {
        const oDialog = { close: this.sandbox.stub() };
        this.oController.byId.withArgs("Cart").returns(oDialog);

        this.oDialogHandler._closeCartDialog();

        assert.ok(this.oController.byId.calledWith("Cart"), "the dialog is looked up by id 'Cart'");
        assert.ok(oDialog.close.calledOnce, "close() is called on the dialog");
    });
});
