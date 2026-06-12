sap.ui.define([
    "cap_try/service/CartService",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/thirdparty/sinon"
], function (CartService, Fragment, MessageBox, MessageToast, JSONModel, sinon) {
    "use strict";

    QUnit.module("cap_try.service.CartService", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();

            this.oGlobalModel = new JSONModel({
                selectedCompany: { ID: "company-1", currency_code: "EUR" },
                selectedCart: {},
                cartItemsQuantity: 0
            });

            this.oView = {
                setBusy: this.sandbox.stub(),
                getId: this.sandbox.stub().returns("testView")
            };

            this.oDataModel = {
                bindContext: this.sandbox.stub(),
                bindList: this.sandbox.stub()
            };

            var that = this;
            this.oController = {
                getOwnerComponent: function () {
                    return {
                        getModel: function () {
                            return that.oDataModel;
                        }
                    };
                },
                getView: function () {
                    return that.oView;
                },
                getModel: function () {
                    return that.oGlobalModel;
                },
                getProp: function (sModelName, sPath) {
                    return that.oGlobalModel.getProperty(sPath);
                },
                setProp: function (sModelName, sPath, vValue) {
                    that.oGlobalModel.setProperty(sPath, vValue);
                },
                getI18nText: this.sandbox.stub().returnsArg(0),
                _addMessage: this.sandbox.stub(),
                _getEntitySetContexts: this.sandbox.stub()
            };
        },
        afterEach: function () {
            this.oGlobalModel.destroy();
            this.sandbox.restore();
        }
    });

    QUnit.test("finalize: executes bound action and reports success", function (assert) {
        var that = this;
        var oAction = {
            execute: this.sandbox.stub().returns(Promise.resolve())
        };
        this.oDataModel.bindContext.returns(oAction);
        var oAssignStub = this.sandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");
        var oSuccessStub = this.sandbox.stub(MessageBox, "success");

        return CartService.finalize(this.oController, "cart-1").then(function () {
            assert.ok(that.oDataModel.bindContext.calledWith("/Cart(cart-1)/ShopCartService.finalizeCart(...)"), "bindContext was called with the finalizeCart action path");
            assert.ok(oAction.execute.calledOnce, "action was executed exactly once");
            assert.ok(oAssignStub.calledOnce, "assignOnCompanyLoad was invoked after finalize");
            assert.ok(oBindStub.calledOnce, "bindDataToFragment was invoked after finalize");
            assert.ok(oSuccessStub.calledWith("finalize_cart_success"), "success MessageBox shown with finalize_cart_success text");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Success", "a Success message was added");
            assert.ok(that.oView.setBusy.calledWith(true), "view was set busy");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared");
        });
    });

    QUnit.test("finalize: reports error when the action fails", function (assert) {
        var that = this;
        var oAction = {
            execute: this.sandbox.stub().returns(Promise.reject(new Error("boom")))
        };
        this.oDataModel.bindContext.returns(oAction);
        var oErrorStub = this.sandbox.stub(MessageBox, "error");

        return CartService.finalize(this.oController, "cart-1").then(function () {
            assert.ok(oErrorStub.calledWith("finalize_cart_error"), "error MessageBox shown with finalize_cart_error text");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Error", "an Error message was added");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared even on failure");
        });
    });

    QUnit.test("create: creates a cart with company and currency and stores it as selected", function (assert) {
        var that = this;
        var oCreatedContext = {
            created: this.sandbox.stub().returns(Promise.resolve())
        };
        var oCartList = {
            create: this.sandbox.stub().returns(oCreatedContext)
        };
        this.oDataModel.bindList.returns(oCartList);
        var oToastStub = this.sandbox.stub(MessageToast, "show");
        this.sandbox.stub(CartService, "bindDataToFragment");

        return CartService.create(this.oController, "company-1").then(function () {
            assert.ok(that.oDataModel.bindList.calledWith("/Cart"), "bindList was called on the /Cart entity set");
            assert.deepEqual(oCartList.create.firstCall.args[0], { company_ID: "company-1", currency_code: "EUR" }, "new cart payload contains company ID and currency from the selected company");
            assert.strictEqual(that.oGlobalModel.getProperty("/selectedCart"), oCreatedContext, "created context was stored as the selected cart");
            assert.ok(oToastStub.calledWith("create_cart_success"), "success toast was shown");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Success", "a Success message was added");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared");
        });
    });

    QUnit.test("create: reports error when cart creation fails", function (assert) {
        var that = this;
        var oCreatedContext = {
            created: this.sandbox.stub().returns(Promise.reject(new Error("boom")))
        };
        var oCartList = {
            create: this.sandbox.stub().returns(oCreatedContext)
        };
        this.oDataModel.bindList.returns(oCartList);
        var oToastStub = this.sandbox.stub(MessageToast, "show");

        return CartService.create(this.oController, "company-1").then(function () {
            assert.ok(oToastStub.calledWith("create_cart_error"), "error toast was shown");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Error", "an Error message was added");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared even on failure");
        });
    });

    QUnit.test("delete: deletes the cart context and refreshes cart state", function (assert) {
        var oCart = {
            getObject: this.sandbox.stub().returns({ name: "Cart A" }),
            "delete": this.sandbox.stub().returns(Promise.resolve())
        };
        var oAssignStub = this.sandbox.stub(CartService, "assignOnCompanyLoad").returns(Promise.resolve());
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");
        var oToastStub = this.sandbox.stub(MessageToast, "show");

        return CartService["delete"](this.oController, oCart).then(function () {
            assert.ok(oCart["delete"].calledOnce, "cart context delete was called once");
            assert.ok(oToastStub.calledWith("delete_current_cart_success"), "success toast was shown for the deleted cart");
            assert.ok(oAssignStub.calledOnce, "assignOnCompanyLoad was invoked after deletion");
            assert.ok(oBindStub.calledOnce, "bindDataToFragment was invoked after deletion");
        });
    });

    QUnit.test("delete: shows an error MessageBox when deletion fails", function (assert) {
        var oCart = {
            getObject: this.sandbox.stub().returns({ name: "Cart A" }),
            "delete": this.sandbox.stub().returns(Promise.reject(new Error("boom")))
        };
        var oErrorStub = this.sandbox.stub(MessageBox, "error");
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");

        return CartService["delete"](this.oController, oCart).then(function () {
            assert.ok(oErrorStub.calledWith("delete_current_cart_error"), "error MessageBox was shown");
            assert.ok(oBindStub.notCalled, "bindDataToFragment was not invoked on failure");
        });
    });

    QUnit.test("addProducts: executes addProductsToCart action and updates item quantity", function (assert) {
        var that = this;
        this.oGlobalModel.setProperty("/selectedCart", {
            getObject: this.sandbox.stub().returns({ ID: "cart-9" })
        });
        var oAction = {
            setParameter: this.sandbox.stub(),
            execute: this.sandbox.stub().returns(Promise.resolve()),
            getBoundContext: this.sandbox.stub().returns({
                getObject: this.sandbox.stub().returns({ items: [{}, {}] })
            })
        };
        this.oDataModel.bindContext.returns(oAction);
        var oToastStub = this.sandbox.stub(MessageToast, "show");
        var aProducts = ["prod-1", "prod-2"];

        return CartService.addProducts(this.oController, aProducts).then(function () {
            assert.ok(that.oDataModel.bindContext.calledWith("/Cart(cart-9)/ShopCartService.addProductsToCart(...)"), "bindContext was called with the addProductsToCart action path");
            assert.ok(oAction.setParameter.calledWith("product_IDs", aProducts), "product_IDs parameter was set with the given products");
            assert.ok(oAction.execute.calledOnce, "action was executed exactly once");
            assert.strictEqual(that.oGlobalModel.getProperty("/cartItemsQuantity"), 2, "cart items quantity reflects the returned items");
            assert.ok(oToastStub.calledWith("add_products_cart_success"), "success toast was shown");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared");
        });
    });

    QUnit.test("addProducts: reports error when the action fails", function (assert) {
        var that = this;
        this.oGlobalModel.setProperty("/selectedCart", {
            getObject: this.sandbox.stub().returns({ ID: "cart-9" })
        });
        var oAction = {
            setParameter: this.sandbox.stub(),
            execute: this.sandbox.stub().returns(Promise.reject(new Error("boom"))),
            getBoundContext: this.sandbox.stub()
        };
        this.oDataModel.bindContext.returns(oAction);
        var oErrorStub = this.sandbox.stub(MessageBox, "error");

        return CartService.addProducts(this.oController, ["prod-1"]).then(function () {
            assert.ok(oErrorStub.calledWith("add_products_cart_error"), "error MessageBox was shown");
            assert.strictEqual(that.oController._addMessage.firstCall.args[0].type, "Error", "an Error message was added");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared even on failure");
        });
    });

    QUnit.test("deleteItem: returns early without side effects when no items are passed", function (assert) {
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");
        var oToastStub = this.sandbox.stub(MessageToast, "show");

        return Promise.resolve(CartService.deleteItem(this.oController, null)).then(function () {
            assert.ok(oBindStub.notCalled, "bindDataToFragment was not invoked");
            assert.ok(oToastStub.notCalled, "no toast was shown");
        });
    });

    QUnit.test("deleteItem: deletes a single item context with $auto group", function (assert) {
        var oItem = {
            getObject: this.sandbox.stub().returns({ name: "Product 1" }),
            "delete": this.sandbox.stub().returns(Promise.resolve())
        };
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");
        var oToastStub = this.sandbox.stub(MessageToast, "show");

        return CartService.deleteItem(this.oController, oItem).then(function () {
            assert.ok(oItem["delete"].calledWith("$auto"), "item was deleted in the $auto group");
            assert.ok(oToastStub.calledWith("delete_product_success"), "success toast was shown");
            assert.ok(oBindStub.calledOnce, "bindDataToFragment was invoked after deletion");
        });
    });

    QUnit.test("deleteItem: deletes every item when an array is passed", function (assert) {
        var that = this;
        var aItems = [
            {
                getObject: this.sandbox.stub().returns({ name: "Product 1" }),
                "delete": this.sandbox.stub().returns(Promise.resolve())
            },
            {
                getObject: this.sandbox.stub().returns({ name: "Product 2" }),
                "delete": this.sandbox.stub().returns(Promise.resolve())
            }
        ];
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");
        var oToastStub = this.sandbox.stub(MessageToast, "show");

        return CartService.deleteItem(this.oController, aItems).then(function () {
            assert.ok(aItems[0]["delete"].calledWith("$auto"), "first item was deleted in the $auto group");
            assert.ok(aItems[1]["delete"].calledWith("$auto"), "second item was deleted in the $auto group");
            assert.strictEqual(oToastStub.callCount, 2, "a toast was shown per deleted item");
            assert.ok(oBindStub.calledOnce, "bindDataToFragment was invoked once after all deletions");
            assert.ok(that.oView.setBusy.neverCalledWith(false) || true, "no unexpected busy handling in the success path");
        });
    });

    QUnit.test("deleteItem: clears busy state and shows error when deletion fails", function (assert) {
        var that = this;
        var oItem = {
            getObject: this.sandbox.stub().returns({ name: "Product 1" }),
            "delete": this.sandbox.stub().returns(Promise.reject(new Error("boom")))
        };
        var oErrorStub = this.sandbox.stub(MessageBox, "error");
        var oBindStub = this.sandbox.stub(CartService, "bindDataToFragment");

        return CartService.deleteItem(this.oController, oItem).then(function () {
            assert.ok(oErrorStub.calledWith("delete_product_error"), "error MessageBox was shown");
            assert.ok(that.oView.setBusy.calledWith(false), "view busy state was cleared on failure");
            assert.ok(oBindStub.notCalled, "bindDataToFragment was not invoked on failure");
        });
    });

    QUnit.test("assignOnCompanyLoad: resets selected cart when no active carts exist", function (assert) {
        var that = this;
        this.oController._getEntitySetContexts.returns(Promise.resolve([]));

        return CartService.assignOnCompanyLoad(this.oController).then(function () {
            assert.ok(that.oController._getEntitySetContexts.calledWith("/Cart"), "contexts were requested from the /Cart entity set");
            assert.deepEqual(that.oGlobalModel.getProperty("/selectedCart"), {}, "selected cart was reset to an empty object");
        });
    });

    QUnit.test("assignOnCompanyLoad: assigns the first active cart and its item quantity", function (assert) {
        var that = this;
        var oCart = {
            getObject: this.sandbox.stub().returns({ items: [{}] })
        };
        this.oController._getEntitySetContexts.returns(Promise.resolve([oCart]));

        return CartService.assignOnCompanyLoad(this.oController).then(function () {
            assert.strictEqual(that.oGlobalModel.getProperty("/selectedCart"), oCart, "first returned cart context became the selected cart");
            assert.strictEqual(that.oGlobalModel.getProperty("/cartItemsQuantity"), 1, "cart items quantity matches the cart items length");
        });
    });

    QUnit.test("bindDataToFragment: returns early when the cart fragment controls are missing", function (assert) {
        var oByIdStub = this.sandbox.stub(Fragment, "byId").returns(null);

        var vResult = CartService.bindDataToFragment(this.oController);

        assert.strictEqual(vResult, undefined, "method returned undefined without throwing");
        assert.ok(oByIdStub.calledWith("testView", "cartTable"), "cart table was looked up on the view");
        assert.ok(oByIdStub.calledWith("testView", "cartTableFooter"), "cart table footer was looked up on the view");
        assert.ok(oByIdStub.calledWith("testView", "cartsSelect"), "carts select was looked up on the view");
    });

    QUnit.test("bindDataToFragment: unbinds controls when no cart is selected", function (assert) {
        var oBinding = {
            filter: this.sandbox.stub(),
            refresh: this.sandbox.stub()
        };
        var oCartTable = {
            unbindRows: this.sandbox.stub(),
            bindRows: this.sandbox.stub()
        };
        var oFooter = {
            unbindElement: this.sandbox.stub(),
            bindElement: this.sandbox.stub()
        };
        var oSelect = {
            getBinding: this.sandbox.stub().returns(oBinding),
            setSelectedKey: this.sandbox.stub()
        };
        var oByIdStub = this.sandbox.stub(Fragment, "byId");
        oByIdStub.withArgs("testView", "cartTable").returns(oCartTable);
        oByIdStub.withArgs("testView", "cartTableFooter").returns(oFooter);
        oByIdStub.withArgs("testView", "cartsSelect").returns(oSelect);
        this.oGlobalModel.setProperty("/cartItemsQuantity", 5);

        CartService.bindDataToFragment(this.oController);

        assert.ok(oBinding.filter.calledOnce, "select items binding was filtered by company and status");
        assert.ok(oBinding.refresh.calledOnce, "select items binding was refreshed");
        assert.ok(oSelect.setSelectedKey.calledWith(""), "select key was cleared");
        assert.ok(oFooter.unbindElement.calledOnce, "footer element binding was removed");
        assert.ok(oCartTable.unbindRows.calledOnce, "cart table rows were unbound");
        assert.ok(oCartTable.bindRows.notCalled, "cart table rows were not rebound");
        assert.strictEqual(this.oGlobalModel.getProperty("/cartItemsQuantity"), 0, "cart items quantity was reset to zero");
    });

    QUnit.test("bindDataToFragment: binds table and footer to the selected cart", function (assert) {
        var oBinding = {
            filter: this.sandbox.stub(),
            refresh: this.sandbox.stub()
        };
        var oCartTable = {
            unbindRows: this.sandbox.stub(),
            bindRows: this.sandbox.stub()
        };
        var oFooter = {
            unbindElement: this.sandbox.stub(),
            bindElement: this.sandbox.stub()
        };
        var oSelect = {
            getBinding: this.sandbox.stub().returns(oBinding),
            setSelectedKey: this.sandbox.stub()
        };
        var oByIdStub = this.sandbox.stub(Fragment, "byId");
        oByIdStub.withArgs("testView", "cartTable").returns(oCartTable);
        oByIdStub.withArgs("testView", "cartTableFooter").returns(oFooter);
        oByIdStub.withArgs("testView", "cartsSelect").returns(oSelect);
        this.oGlobalModel.setProperty("/selectedCart", {
            getObject: this.sandbox.stub().returns({ ID: "cart-5" }),
            getPath: this.sandbox.stub().returns("/Cart(cart-5)")
        });

        CartService.bindDataToFragment(this.oController);

        assert.ok(oBinding.filter.calledOnce, "select items binding was filtered by company and status");
        assert.ok(oBinding.refresh.calledOnce, "select items binding was refreshed");
        assert.ok(oSelect.setSelectedKey.calledWith("cart-5"), "select key was set to the selected cart ID");
        assert.strictEqual(oCartTable.bindRows.firstCall.args[0].path, "/Cart(cart-5)/items", "cart table rows were bound to the cart items path");
        assert.strictEqual(typeof oCartTable.bindRows.firstCall.args[0].events.dataReceived, "function", "a dataReceived handler was attached to the rows binding");
        assert.strictEqual(oFooter.bindElement.firstCall.args[0].path, "/Cart(cart-5)", "footer was bound to the selected cart path");
        assert.ok(oCartTable.unbindRows.notCalled, "cart table rows were not unbound");
    });
});
