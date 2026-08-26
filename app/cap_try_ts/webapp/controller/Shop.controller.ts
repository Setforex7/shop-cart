import BaseController from "cap_try_ts/controller/BaseController";
import ProductService from "cap_try_ts/service/ProductService";
import CartService from "cap_try_ts/service/CartService";
import FileService from "cap_try_ts/service/FileService";
import Formatter from "cap_try_ts/formatters/formatter";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import { URLHelper } from "sap/m/library";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/m/Table";
import ColumnListItem from "sap/m/ColumnListItem";
import ComboBox from "sap/m/ComboBox";
import Control from "sap/ui/core/Control";
import ManagedObject from "sap/ui/base/ManagedObject";

const sEntityCompany = "/Company";

/**
 * @namespace cap_try_ts.controller
 */
export default class Shop extends BaseController {
    public formatter = Formatter;

    onInit(): void {
        this._onControllerLoad();
        this.getRouter().getRoute("Shop")!.attachPatternMatched(this._onObjectMatched, this);
    }

    onExit(): void {
        this.getRouter().getRoute("Shop")!.detachPatternMatched(this._onObjectMatched, this);
    }

    onDownloadTemplatePress(): void {
        const sUrl = (this.getModel() as ODataModel).getServiceUrl() + "downloadExcelTemplate()/$value";
        URLHelper.redirect(sUrl, true);
    }

    onUploadTemplatePress(oEvent: Event): void {
        FileService.read(this, oEvent, ProductService.createBatch.bind(ProductService, this));
    }

    onFinalizePurchasePress(): void | undefined {
        const oSelectedCart = this.getProp("globalModel", "/selectedCart");

        if (!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("finalize_cart_selection_missing"));

        const { ID } = (oSelectedCart as Context).getObject() as { ID: string };
        CartService.finalize(this, ID);
    }

    onAddCartButtonPress(): void {
        const { ID } = this.getProp("globalModel", "/selectedCompany") as { ID: string };
        CartService.create(this, ID);
    }

    onEditProductPress(oEvent: Event): void {
        const oSource = oEvent.getSource() as Control;
        const oSelectedProduct = oSource.getBindingContext()!.getObject() as Record<string, unknown>;
        oSelectedProduct.metadata = oSource.getBindingContext();

        this.setProp("globalModel", "/selectedProduct", oSelectedProduct);
        (this.getModel("globalModel") as JSONModel).refresh(true);

        this.getDialogHandler()._openEditProductDialog();
    }

    onEditProduct(): void {
        const oSelectedProduct = this.getProp("globalModel", "/selectedProduct");
        ProductService.edit(this, oSelectedProduct);
        this.getDialogHandler()._closeEditProductDialog();
    }

    async onDeleteProductPress(oEvent: Event): Promise<void> {
        const oView = this.getView()!;
        const oCurrentProductBinding = (oEvent.getSource() as Control).getBindingContext() as Context;
        const oCurrentProduct = oCurrentProductBinding.getObject() as { name: string };

        MessageBox.confirm(this.getI18nText("delete_product", [oCurrentProduct.name]), {
            title: this.getI18nText("confirmation_needed"),
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: async function(this: Shop, oAction: string): Promise<void> { if (oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                       await ProductService.delete(this, oCurrentProductBinding);
                                                                                       oView.setBusy(false); } }.bind(this) });
    }

    async onDeleteMultiplesProductsPress(): Promise<void | undefined> {
        const oView = this.getView()!;
        const oProductsTable = this.getView()!.byId("productsWorklist") as Table;
        const aSelectedProductsContexts = oProductsTable.getSelectedContexts() as unknown as Context[];

        if (!aSelectedProductsContexts.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

        MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
            title: this.getI18nText("confirmation_needed"),
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: async function(this: Shop, oAction: string): Promise<void> { if (oAction === MessageBox.Action.YES) { oView.setBusy(true);
                                                                                       await ProductService.delete(this, aSelectedProductsContexts);
                                                                                       oView.setBusy(false); } }.bind(this) });
    }

    async onDeleteCartItemPress(oEvent: Event): Promise<void> {
        const oSelectedItemBinding = (oEvent.getSource() as Control).getBindingContext() as Context;
        const { name } = oSelectedItemBinding.getObject() as { name: string };

        MessageBox.confirm(this.getI18nText("delete_product", [name]), {
            title: this.getI18nText("confirmation_needed"),
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: async function(this: Shop, oAction: string): Promise<void> { if (oAction === MessageBox.Action.YES) { await CartService.deleteItem(this, oSelectedItemBinding); } }.bind(this) });
    }

    async onDeleteMultipleCartItemPress(): Promise<void | undefined> {
        const oCartTable = Fragment.byId(this.getView()!.getId(), "cartTable") as Table & { getSelectedIndices(): number[]; getContextByIndex(iIndex: number): Context };
        if (!oCartTable) return;
        const aSelectedItemsIndices = oCartTable.getSelectedIndices();

        if (!aSelectedItemsIndices.length) return MessageToast.show(this.getI18nText("delete_product_null_selection"));

        const aSelectedItems = aSelectedItemsIndices.map(iIndex => { return oCartTable.getContextByIndex(iIndex); });

        MessageBox.confirm(this.getI18nText("delete_multiple_products"), {
            title: this.getI18nText("confirmation_needed"),
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: async function(this: Shop, oAction: string): Promise<void> { if (oAction === MessageBox.Action.YES) { await CartService.deleteItem(this, aSelectedItems); } }.bind(this) });
    }

    async onDeleteSelectedCartPress(): Promise<void | undefined> {
        const oSelectedCart = this.getProp("globalModel", "/selectedCart");

        if (!Object.keys(oSelectedCart).length) return MessageToast.show(this.getI18nText("delete_current_cart_selection_missing"));

        MessageBox.confirm(this.getI18nText("delete_current_cart_message", [oSelectedCart.name]), {
            title: this.getI18nText("confirmation_needed"),
            actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.YES,
            onClose: async function(this: Shop, oAction: string): Promise<void> {
                if (oAction === MessageBox.Action.YES) { await CartService.delete(this, oSelectedCart); }
            }.bind(this)
        });
    }

    async addProductCart(): Promise<void | undefined> {
        const oSelectedCart = this.getProp("globalModel", "/selectedCart");
        const oTable = this.getView()!.byId("productsWorklist") as Table;
        const { ID } = this.getProp("globalModel", "/selectedCompany") as { ID: string };
        const aSelectedProducts = oTable.getSelectedItems();

        if (!aSelectedProducts.length) {
            this._addMessage({ type: "Warning", title: this.getI18nText("warning"), subtitle: this.getI18nText("add_product_null_selection") });
            return MessageToast.show(this.getI18nText("add_product_null_selection"));
        }

        const aSelectedProductsContexts = aSelectedProducts.map(oProduct => { return ((oProduct as ColumnListItem).getBindingContext()!.getObject() as { ID: string }).ID; });

        if (!this._validateCompanieselection()) return;

        if (!Object.keys(oSelectedCart).length)
            MessageBox.confirm(this.getI18nText("create_cart_confirm_message"), {
                title: this.getI18nText("confirmation_needed"),
                actions: [MessageBox.Action.YES, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.YES,
                onClose: async function(this: Shop, oAction: string): Promise<void> {
                    if (oAction === MessageBox.Action.YES) { await this.openCartDialog();
                                                             await CartService.create(this, ID);
                                                             await CartService.addProducts(this, aSelectedProductsContexts);
                                                             oTable.removeSelections(); }
                }.bind(this)
            });
        else {
            await CartService.addProducts(this, aSelectedProductsContexts);
            oTable.removeSelections();
        }
    }

    _validateCompanieselection(): boolean {
        const cCompanyComboBox = this.getView()!.byId("companyComboBox") as ComboBox;
        const { name } = this.getProp("globalModel", "/selectedCompany") as { name?: string };

        if (!name) {
            cCompanyComboBox.setValueState("Error");
            cCompanyComboBox.setValueStateText(this.getI18nText("add_product_error_company"));
            MessageToast.show(this.getI18nText("add_product_error_company"));
            this._addMessage({ type: "Error", title: this.getI18nText("error"), subtitle: this.getI18nText("add_product_error_company") });
            return false;
        }

        cCompanyComboBox.setValueState("None");
        cCompanyComboBox.setValueStateText("");
        return true;
    }

    onCartsSelectChange(oEvent: Event<Record<string, unknown>>): void {
        const oSelectedItem = oEvent.getParameter("selectedItem") as ManagedObject | null;
        if (!oSelectedItem) return;

        const oSelectedCart = (oSelectedItem as Control).getBindingContext();

        this.setProp("globalModel", "/selectedCart", oSelectedCart);
        (this.getModel("globalModel") as JSONModel).refresh(true);

        CartService.bindDataToFragment(this);
    }

    async onCreateButtonPress(): Promise<void | undefined> {
        const { name, description, price, stock_min, stock } = this.getProp("globalModel", "/product");
        const { ID } = this.getProp("globalModel", "/selectedCompany") as { ID: string };

        if (!name || !description || !price || !stock_min || !stock)
            return MessageToast.show(this.getI18nText("add_product_error_fields"));

        this.getView()!.setBusy(true);
        await ProductService.create(this, { name, description, company_ID: ID, price, stock_min, stock });
        this.getView()!.setBusy(false);
    }

    onCompanyCancelPress(): void {
        this.setProp("globalModel", "/selectedCompany", {});
        this.getView()!.unbindElement("/Company");
        (this.getModel("globalModel") as JSONModel).refresh(true);
    }

    async onCompanyChange(oEvent: Event): Promise<void> {
        const oView = this.getView()!;
        oView.setBusy(true);

        const oSource = oEvent.getSource() as ComboBox;
        oSource.setValueState("None");

        const oSelectedCompany = await this._getEntityContexts(sEntityCompany, oSource.getSelectedKey());
        this.setProp("globalModel", "/selectedCompany", oSelectedCompany);
        this.setProp("globalModel", "/selectedCart", {});
        this.setProp("globalModel", "/cartItemsQuantity", 0);
        this.setProp("globalModel", "/cart", []);
        (this.getModel("globalModel") as JSONModel).refresh(true);
        ProductService.loadByCompany(this);
        CartService.assignOnCompanyLoad(this);
    }

    onProductCartQuantityChangePress(oEvent: Event<Record<string, unknown>>): void {
        const iNewQuantity = oEvent.getParameter("value") as number;
        const oContext = (oEvent.getSource() as Control).getBindingContext() as Context | null;

        if (!oContext || iNewQuantity < 1) return;

        oContext.setProperty("quantity", iNewQuantity);

        const oFooterTable = Fragment.byId(this.getView()!.getId(), "cartTableFooter") as Control;
        if (oFooterTable) {
            const oFooterContext = oFooterTable.getBindingContext() as Context | null;
            if (oFooterContext) oFooterContext.refresh();
        }
    }

    onSearch(oEvent: Event<Record<string, unknown>>): void {
        const sQuery = oEvent.getParameter("newValue") as string;
        const oProductsTable = this.getView()!.byId("productsWorklist") as Table;
        const oBinding = oProductsTable.getBinding("items") as ReturnType<Table["getBinding"]> & { filter(aFilters: Filter[]): void };

        if (sQuery) {
            oBinding.filter([new Filter("name", FilterOperator.Contains, sQuery)]);
        } else {
            oBinding.filter([]);
        }
    }

    //#region Dialog OPEN/CLOSE

    openAddProductDialog(): void { this.getDialogHandler()._openAddProductDialog(); }

    closeAddProductDialog(): void { this.getDialogHandler()._closeAddProductDialog(); }

    openEditProductDialog(): void { this.getDialogHandler()._openEditProductDialog(); }

    closeEditProductDialog(): void { this.getDialogHandler()._closeEditProductDialog(); }

    async openCartDialog(): Promise<void | undefined> { if (!this._validateCompanieselection()) return;
                                                         await this.getDialogHandler()._openCartDialog(); }

    closeCartDialog(): void { this.getDialogHandler()._closeCartDialog(); }

    //#endregion
}
