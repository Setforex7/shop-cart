import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type BaseController from "cap_try_ts/controller/BaseController";
import type View from "sap/ui/core/mvc/View";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type Context from "sap/ui/model/odata/v4/Context";

const sEntityProducts = "/Products";

interface ProductCreateData {
    name: string;
    description: string;
    company_ID: string;
    price: number;
    stock_min: number;
    stock: number;
}

interface ProductEditData {
    metadata: Context;
    name: string;
    description: string;
    price: number;
    stock: number;
    stock_min: number;
}

/**
 * @namespace cap_try_ts.service
 */
export default {
    async create(oController: BaseController, oProduct: ProductCreateData): Promise<void> {
        try {
            const oProductsList = (oController.getModel() as ODataModel).bindList(sEntityProducts);
            const oCreatedContext = oProductsList.create(oProduct);
            await oCreatedContext.created();
            const { name } = oCreatedContext.getObject();
            oController._addMessage({
                type: "Success",
                title: oController.getI18nText("success"),
                subtitle: oController.getI18nText("product_created_success", [name])
            });
            MessageBox.success(oController.getI18nText("product_created_success", [name]));
            oController.setProp("globalModel", "/product", {});
            oController.getDialogHandler()._closeAddProductDialog();
            this.loadByCompany(oController);
        } catch {
            oController._addMessage({
                type: "Error",
                title: oController.getI18nText("error"),
                subtitle: oController.getI18nText("create_product_error", [oProduct.name])
            });
            MessageBox.error(oController.getI18nText("create_product_error", [oProduct.name]));
        }
    },

    async createBatch(oController: BaseController, aProducts: unknown[]): Promise<void> {
        const { ID } = oController.getProp("globalModel", "/selectedCompany");
        try {
            const oProductsList = (oController.getModel() as ODataModel).bindList(sEntityProducts,
                undefined,
                undefined,
                undefined,
                { batchGroupId: "editProducts" } as object);

            aProducts.forEach(oProduct => {
                const oRow = oProduct as Record<string, unknown>;
                Object.assign(oRow, { company_ID: ID });
                oProductsList.create(oRow);
            });
            await (oController.getModel() as ODataModel).submitBatch("editProducts");

            aProducts.forEach(oProduct => {
                oController._addMessage({
                    type: "Success",
                    title: oController.getI18nText("success"),
                    subtitle: oController.getI18nText("product_created_success", [(oProduct as { name?: string }).name])
                });
            });

            MessageToast.show(oController.getI18nText("excel_upload_success"));
            this.loadByCompany(oController);
        } catch {
            oController._addMessage({
                type: "Error",
                title: oController.getI18nText("error"),
                subtitle: oController.getI18nText("create_product_error")
            });
            MessageBox.error(oController.getI18nText("create_product_error"));
        }
    },

    async edit(oController: BaseController, oProduct: ProductEditData): Promise<void> {
        const { metadata, name, description, price, stock, stock_min } = oProduct;

        const oNewProductData = { name, description, price, stock, stock_min };

        for (const [sKey, sValue] of Object.entries(oNewProductData))
            metadata.setProperty(sKey, sValue);

        try {
            await (oController.getModel() as ODataModel).submitBatch("updateProducts");
            oController._addMessage({
                type: "Success",
                title: oController.getI18nText("success"),
                subtitle: oController.getI18nText("edit_product_success", [name])
            });
        } catch {
            oController._addMessage({
                type: "Error",
                title: oController.getI18nText("error"),
                subtitle: oController.getI18nText("edit_product_error", [name])
            });
            MessageBox.error(oController.getI18nText("edit_product_error", [name]));
        }
    },

    async delete(oController: BaseController, aProducts: Context | Context[]): Promise<void> {
        if (!aProducts) return;

        try {
            if (!Array.isArray(aProducts)) {
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
            (oController.getView() as View).setBusy(false);
            MessageBox.error(oController.getI18nText("delete_product_error"));
        }
    },

    loadByCompany(oController: BaseController): void {
        const oView = oController.getView() as View;
        const { ID } = oController.getProp("globalModel", "/selectedCompany");
        oView.bindElement({ path: "/Company('" + ID + "')" });
        oView.setBusy(false);
    }
};
