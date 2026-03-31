sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(MessageBox, MessageToast) {
    "use strict";

    const sEntityProducts = "/Products";

    return {
        create: async function(oController, oProduct) {
            try {
                const oProductsList = oController.getModel().bindList(sEntityProducts);
                const oCreatedContext = oProductsList.create(oProduct);
                await oCreatedContext.created();
                const { name } = oCreatedContext.getObject();
                oController._addMessage({ type: "Success",
                                          title: oController.getI18nText("success"),
                                          subtitle: oController.getI18nText("product_created_success", [name]) });
                MessageBox.success(oController.getI18nText("product_created_success", [name]));
                oController.setProp("globalModel", "/product", {});
                oController.getDialogHandler()._closeAddProductDialog();
                this.loadByCompany(oController);
            } catch {
                oController._addMessage({ type: "Error",
                                          title: oController.getI18nText("error"),
                                          subtitle: oController.getI18nText("create_product_error", [oProduct.name]) });
                MessageBox.error(oController.getI18nText("create_product_error", [oProduct.name]));
            }
        },

        createBatch: async function(oController, aProducts) {
            const { ID } = oController.getProp("globalModel", "/selectedCompany");
            try {
                const oProductsList = oController.getModel().bindList(sEntityProducts,
                                                                      undefined,
                                                                      undefined,
                                                                      undefined,
                                                                      { batchGroupId: "editProducts" });

                aProducts.forEach(oProduct => { Object.assign(oProduct, { company_ID: ID });
                                                oProductsList.create(oProduct); });
                await oController.getModel().submitBatch("editProducts");

                aProducts.forEach(oProduct => {
                    oController._addMessage({ type: "Success",
                                              title: oController.getI18nText("success"),
                                              subtitle: oController.getI18nText("product_created_success", [oProduct.name]) });
                });

                MessageToast.show(oController.getI18nText("excel_upload_success"));
                this.loadByCompany(oController);
            } catch {
                oController._addMessage({ type: "Error",
                                          title: oController.getI18nText("error"),
                                          subtitle: oController.getI18nText("create_product_error") });
                MessageBox.error(oController.getI18nText("create_product_error"));
            }
        },

        edit: async function(oController, oProduct) {
            const { metadata, name, description, price, stock, stock_min } = oProduct;

            const oNewProductData = { name, description, price, stock, stock_min };

            for (const [sKey, sValue] of Object.entries(oNewProductData))
                metadata.setProperty(sKey, sValue);

            try {
                await oController.getModel().submitBatch("updateProducts");
                oController._addMessage({ type: "Success",
                                          title: oController.getI18nText("success"),
                                          subtitle: oController.getI18nText("edit_product_success", [name]) });
            } catch {
                oController._addMessage({ type: "Error",
                                          title: oController.getI18nText("error"),
                                          subtitle: oController.getI18nText("edit_product_error", [name]) });
                MessageBox.error(oController.getI18nText("edit_product_error", [name]));
            }
        },

        delete: async function(oController, aProducts) {
            if(!aProducts) return;

            try {
                if(!Array.isArray(aProducts)) {
                    const { name } = aProducts.getObject();
                    await aProducts.delete("$auto");
                    MessageToast.show(oController.getI18nText("delete_product_success", [name]));
                } else {
                    for (const oProduct of aProducts) {
                        const { name } = oProduct.getObject();
                        await oProduct.delete("$auto");
                        MessageToast.show(oController.getI18nText("delete_product_success", [name]));
                    }
                }
                this.loadByCompany(oController);
            } catch {
                oController.getView().setBusy(false);
                MessageBox.error(oController.getI18nText("delete_product_error"));
            }
        },

        loadByCompany: function(oController) {
            const oView = oController.getView();
            const { ID } = oController.getProp("globalModel", "/selectedCompany");
            oView.bindElement({ path: "/Company('" + ID + "')" });
            oView.setBusy(false);
        }
    };
});
