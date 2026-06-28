import Fragment from "sap/ui/core/Fragment";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import type BaseController from "cap_try_ts/controller/BaseController";
import type Component from "sap/ui/core/Component";
import type View from "sap/ui/core/mvc/View";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type Context from "sap/ui/model/odata/v4/Context";
import type JSONModel from "sap/ui/model/json/JSONModel";
import type Select from "sap/m/Select";
import type Table from "sap/ui/table/Table";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";

const sEntityCart = "/Cart";

/**
 * @namespace cap_try_ts.service
 */
export default {
    async finalize(oController: BaseController, sCartID: string): Promise<void> {
        const oDataModel = (oController.getOwnerComponent() as Component).getModel() as ODataModel;
        const oView = oController.getView() as View;
        oView.setBusy(true);

        try {
            const oFinalizeCartAction = oDataModel.bindContext(sEntityCart + `(${sCartID})/ShopCartService.finalizeCart(...)`) as ODataContextBinding;
            await oFinalizeCartAction.invoke();

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

    async create(oController: BaseController, sCompanyID: string): Promise<void> {
        const { currency_code } = oController.getProp("globalModel", "/selectedCompany");
        const oView = oController.getView() as View;
        oView.setBusy(true);

        try {
            const oCartList = ((oController.getOwnerComponent() as Component).getModel() as ODataModel).bindList(sEntityCart);
            const oNewCart = { company_ID: sCompanyID, currency_code: currency_code };
            const oCreateCart = oCartList.create(oNewCart);
            await oCreateCart.created();

            oController.setProp("globalModel", "/selectedCart", oCreateCart);
            (oController.getModel("globalModel") as JSONModel).refresh(true);

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

    async delete(oController: BaseController, oCart: Context): Promise<void> {
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

    async addProducts(oController: BaseController, aProducts: string[]): Promise<void> {
        const oDataModel = (oController.getOwnerComponent() as Component).getModel() as ODataModel;
        const { ID } = (oController.getProp("globalModel", "/selectedCart") as Context).getObject();
        const oView = oController.getView() as View;
        oView.setBusy(true);

        try {
            const oAddManyToCartAction = oDataModel.bindContext(sEntityCart + `(${ID})/ShopCartService.addProductsToCart(...)`) as ODataContextBinding;
            oAddManyToCartAction.setParameter("product_IDs", aProducts);
            await oAddManyToCartAction.invoke();
            const oReturnedResponse = oAddManyToCartAction.getBoundContext();
            const { items } = oReturnedResponse.getObject();

            oController.setProp("globalModel", "/cartItemsQuantity", items.length);
            (oController.getModel("globalModel") as JSONModel).refresh(true);

            MessageToast.show(oController.getI18nText("add_products_cart_success"));
        } catch {
            oController._addMessage({ type: "Error", title: oController.getI18nText("error"), subtitle: oController.getI18nText("add_products_cart_error") });
            MessageBox.error(oController.getI18nText("add_products_cart_error"));
        } finally {
            oView.setBusy(false);
        }
    },

    async deleteItem(oController: BaseController, aCartItems: Context | Context[]): Promise<void> {
        if (!aCartItems) return;

        try {
            if (!Array.isArray(aCartItems)) {
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
            (oController.getView() as View).setBusy(false);
            MessageBox.error(oController.getI18nText("delete_product_error"));
        }
    },

    async assignOnCompanyLoad(oController: BaseController): Promise<void> {
        const aCarts = await oController._getEntitySetContexts(sEntityCart,
            undefined,
            new Sorter("createdAt", false),
            [new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
            new Filter("status", FilterOperator.EQ, "Active")],
            { '$expand': 'items' });

        if (!aCarts || !aCarts.length) return oController.setProp("globalModel", "/selectedCart", {});

        const [oCart] = aCarts;
        const { items } = oCart.getObject();

        oController.setProp("globalModel", "/selectedCart", oCart);
        oController.setProp("globalModel", "/cartItemsQuantity", items.length);
        (oController.getModel("globalModel") as JSONModel).refresh(true);
    },

    bindDataToFragment(oController: BaseController): void {
        const oSelectedCart = oController.getProp("globalModel", "/selectedCart");
        const sViewId = (oController.getView() as View).getId();
        const oCartTable = Fragment.byId(sViewId, "cartTable") as Table;
        const oCartTableFooter = Fragment.byId(sViewId, "cartTableFooter") as Control;
        const oCartSelect = Fragment.byId(sViewId, "cartsSelect") as Select;

        if (!oCartTable || !oCartTableFooter || !oCartSelect) return;

        const oCartSelectBinding = oCartSelect.getBinding("items") as ODataListBinding;

        if (!Object.keys(oSelectedCart).length) {
            oCartSelectBinding.filter([new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
            new Filter("status", FilterOperator.EQ, "Active")]);
            oCartSelectBinding.refresh();
            oController.setProp("globalModel", "/cartItemsQuantity", 0);
            (oController.getModel("globalModel") as JSONModel).refresh(true);
            oCartSelect.setSelectedKey("");
            (oCartTableFooter.unbindElement as unknown as () => void)();
            oCartTable.unbindRows();
            return;
        }

        const { ID } = (oSelectedCart as Context).getObject();
        const sCartPath = (oSelectedCart as Context).getPath();

        oCartSelectBinding.filter([new Filter("company_ID", FilterOperator.EQ, oController.getProp("globalModel", "/selectedCompany/ID")),
        new Filter("status", FilterOperator.EQ, "Active")]);
        oCartSelectBinding.refresh();

        oCartSelect.setSelectedKey(ID);
        oCartTable.bindRows({
            path: sCartPath + "/items",
            events: {
                dataReceived: function (oEvent: Event) {
                    const aItems = (oEvent.getSource() as ODataListBinding).getContexts();
                    oController.setProp("globalModel", "/cartItemsQuantity", aItems.length);
                    (oController.getModel("globalModel") as JSONModel).refresh(true);
                    oCartTable.setBusy(false);
                }
            }
        });
        oCartTableFooter.bindElement({ path: sCartPath });
    }
};
