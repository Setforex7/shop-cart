sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function(Fragment, MessageBox, MessageToast, Filter, FilterOperator, Sorter) {
    "use strict";

    const sEntityCart = "/Cart";

    return {
        finalize: async function(oController, sCartID) {
            const oDataModel = oController.getOwnerComponent().getModel();
            const oView = oController.getView();
            oView.setBusy(true);

            try {
                const oFinalizeCartAction = oDataModel.bindContext(sEntityCart + `(${sCartID})/ShopCartService.finalizeCart(...)`);
                await oFinalizeCartAction.execute();
                
                await this.assignOnCompanyLoad(oController);
                this.bindDataToFragment(oController);

                oController._addMessage({ type: "Success", title: oController.getI18nText("success"), subtitle: oController.getI18nText("finalize_cart_success") });
                MessageBox.success(oController.getI18nText("finalize_cart_success"));
            } catch {
                oController._addMessage({ type: "Error", title: oController.getI18nText("error"), subtitle: oController.getI18nText("finalize_cart_error") });
                MessageBox.error(oController.getI18nText("finalize_cart_error"));
            } finally {
                oView.setBusy(false);
            }
        },

        create: async function(oController, sCompanyID) {
            const { currency_code } = oController.getProp("globalModel", "/selectedCompany");
            const oView = oController.getView();
            oView.setBusy(true);

            try {
                const oCartList = oController.getOwnerComponent().getModel().bindList(sEntityCart);
                const oNewCart = { company_ID: sCompanyID, currency_code: currency_code };
                const oCreateCart = oCartList.create(oNewCart);
                await oCreateCart.created();

                oController.setProp("globalModel", "/selectedCart", oCreateCart);
                oController.getModel("globalModel").refresh(true);

                this.bindDataToFragment(oController);

                MessageToast.show(oController.getI18nText("create_cart_success"));
                oController._addMessage({ type: "Success", title: oController.getI18nText("success"), subtitle: oController.getI18nText("create_cart_success") });
            } catch {
                MessageToast.show(oController.getI18nText("create_cart_error"));
                oController._addMessage({ type: "Error", title: oController.getI18nText("error"), subtitle: oController.getI18nText("create_cart_error") });
            } finally {
                oView.setBusy(false);
            }
        },

        delete: async function(oController, oCart) {
            const { name } = oCart.getObject();

            try {
                await oCart.delete();
                MessageToast.show(oController.getI18nText("delete_current_cart_success", [name]));

                await this.assignOnCompanyLoad(oController);
                this.bindDataToFragment(oController);
            } catch {
                MessageBox.error(oController.getI18nText("delete_current_cart_error"));
            }
        },

        addProducts: async function(oController, aProducts) {
            const oDataModel = oController.getOwnerComponent().getModel();
            const { ID } = oController.getProp("globalModel", "/selectedCart").getObject();
            const oView = oController.getView();
            oView.setBusy(true);

            try {
                const oAddManyToCartAction = oDataModel.bindContext(sEntityCart + `(${ID})/ShopCartService.addProductsToCart(...)`);
                oAddManyToCartAction.setParameter("product_IDs", aProducts);
                await oAddManyToCartAction.execute();
                const oReturnedResponse = oAddManyToCartAction.getBoundContext();
                const { items } = oReturnedResponse.getObject();

                oController.setProp("globalModel", "/cartItemsQuantity", items.length);
                oController.getModel("globalModel").refresh(true);

                MessageToast.show(oController.getI18nText("add_products_cart_success"));
            } catch {
                oController._addMessage({ type: "Error", title: oController.getI18nText("error"), subtitle: oController.getI18nText("add_products_cart_error") });
                MessageBox.error(oController.getI18nText("add_products_cart_error"));
            } finally {
                oView.setBusy(false);
            }
        },

        deleteItem: async function(oController, aCartItems) {
            if(!aCartItems) return;

            try {
                if(!Array.isArray(aCartItems)) {
                    const { name } = aCartItems.getObject();
                    await aCartItems.delete("$auto");
                    MessageToast.show(oController.getI18nText("delete_product_success", [name]));
                } else {
                    for (const oItem of aCartItems) {
                        const { name } = oItem.getObject();
                        await oItem.delete("$auto");
                        MessageToast.show(oController.getI18nText("delete_product_success", [name]));
                    }
                }
                this.bindDataToFragment(oController);
            } catch {
                oController.getView().setBusy(false);
                MessageBox.error(oController.getI18nText("delete_product_error"));
            }
        },

        assignOnCompanyLoad: async function(oController) {
            const aCarts = await oController._getEntitySetContexts(sEntityCart,
                                                                    undefined,
                                                                    new Sorter("createdAt", false),
                                                                    [ new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
                                                                      new Filter("status", FilterOperator.EQ, "Active") ],
                                                                    { '$expand': 'items' });

            if(!aCarts || !aCarts.length) return oController.setProp("globalModel", "/selectedCart", {});

            const [ oCart ] = aCarts;
            const { items } = oCart.getObject();

            oController.setProp("globalModel", "/selectedCart", oCart);
            oController.setProp("globalModel", "/cartItemsQuantity", items.length);
            oController.getModel("globalModel").refresh(true);
        },

        bindDataToFragment: function(oController) {
            const oSelectedCart = oController.getProp("globalModel", "/selectedCart");
            const sViewId = oController.getView().getId();
            const oCartTable = Fragment.byId(sViewId, "cartTable");
            const oCartTableFooter = Fragment.byId(sViewId, "cartTableFooter");
            const oCartSelect = Fragment.byId(sViewId, "cartsSelect");

            if (!oCartTable || !oCartTableFooter || !oCartSelect) return;

            const oCartSelectBinding = oCartSelect.getBinding("items");

            if(!Object.keys(oSelectedCart).length) {
                oCartSelectBinding.filter([ new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
                                            new Filter("status", FilterOperator.EQ, "Active")]);
                oCartSelectBinding.refresh();
                oController.setProp("globalModel", "/cartItemsQuantity", 0);
                oController.getModel("globalModel").refresh(true);
                oCartSelect.setSelectedKey("");
                oCartTableFooter.unbindElement();
                return oCartTable.unbindRows();
            }

            const { ID } = oSelectedCart.getObject();
            const sCartPath = oSelectedCart.getPath();

            oCartSelectBinding.filter([ new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
                                        new Filter("status", FilterOperator.EQ, "Active")]);
            oCartSelectBinding.refresh();

            oCartSelect.setSelectedKey(ID);
            oCartTable.bindRows({ path: sCartPath + "/items",
                                  events: { dataReceived: function(oEvent) {
                                                const aItems = oEvent.getSource().getContexts();
                                                oController.setProp("globalModel", "/cartItemsQuantity", aItems.length);
                                                oController.getModel("globalModel").refresh(true);
                                                oCartTable.setBusy(false); } } });
            oCartTableFooter.bindElement({ path: sCartPath });
        }
    };
});
