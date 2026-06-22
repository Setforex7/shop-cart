import BaseObject from "sap/ui/base/Object";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import CartService from "cap_try_ts/service/CartService";
import Log from "sap/base/Log";
import Control from "sap/ui/core/Control";
import Dialog from "sap/m/Dialog";
import NavContainer from "sap/m/NavContainer";
import Page from "sap/m/Page";
import type BaseController from "cap_try_ts/controller/BaseController";

/**
 * @namespace cap_try_ts.controller
 */
export default class DialogHandler extends BaseObject {
    private _oController: BaseController;
    private _oCompaniesFragment: Promise<Control> | undefined;
    private _oCartsFragment: Promise<Control> | undefined;
    private _dDialogCart: Promise<Dialog> | Dialog | undefined;
    private _dDialogAddProduct: Promise<Dialog> | undefined;
    private _dDialogEditProduct: Promise<Dialog> | undefined;

    constructor(oController: BaseController) {
        super();
        this._oController = oController;
        this._oCompaniesFragment = undefined;
        this._oCartsFragment = undefined;
        this._dDialogCart = undefined;
        this._dDialogAddProduct = undefined;
        this._dDialogEditProduct = undefined;
    }

    _openCompaniesFragment(): void {
        const oView = this._oController.getView()!;
        const oMainContainer = oView.byId("mainContainer") as NavContainer;

        if (!this._oCompaniesFragment) {
            this._oCompaniesFragment = (Fragment.load({
                id: oView.getId(),
                name: "cap_try_ts.view.fragments.Companies",
                controller: this._oController
            }) as Promise<Control>).then(function (this: DialogHandler, oFragment: Control) {
                oView.addDependent(oFragment);
                oMainContainer.addPage(oFragment as Page);
                oMainContainer.to(oFragment as unknown as string);
                return oFragment;
            }.bind(this)).catch(function(this: DialogHandler, oError: Error) {
                Log.error("Failed to load Companies fragment:", oError as unknown as string);
                this._oCompaniesFragment = undefined;
            }.bind(this)) as Promise<Control>;
        } else this._oCompaniesFragment.then(oFragment => oMainContainer.to(oFragment as unknown as string));
    }

    _openCartsFragment(): void {
        const oView = this._oController.getView()!;
        const oMainContainer = oView.byId("mainContainer") as NavContainer;

        if (!this._oCartsFragment) {
            this._oCartsFragment = (Fragment.load({
                id: oView.getId(),
                name: "cap_try_ts.view.fragments.Carts",
                controller: this._oController
            }) as Promise<Control>).then(function (this: DialogHandler, oFragment: Control) {
                oView.addDependent(oFragment);
                oMainContainer.addPage(oFragment as Page);
                oMainContainer.to(oFragment as unknown as string);
                return oFragment;
            }.bind(this)).catch(function(this: DialogHandler, oError: Error) {
                Log.error("Failed to load Carts fragment:", oError as unknown as string);
                this._oCartsFragment = undefined;
            }.bind(this)) as Promise<Control>;
        } else this._oCartsFragment.then(oFragment => oMainContainer.to(oFragment as unknown as string));
    }

    _openAddProductDialog(): void {
        if (!this._dDialogAddProduct) {
            this._dDialogAddProduct = (Fragment.load({ id: this._oController.getView()!.getId(),
                                                      name: "cap_try_ts.view.fragments.AddProduct",
                                                      controller: this._oController }) as Promise<Dialog>)
            .then(function (this: DialogHandler, oDialog: Dialog) {
                this._oController.getView()!.addDependent(oDialog);
                return oDialog;
            }.bind(this)).catch(function(this: DialogHandler, oError: Error) {
                Log.error("Failed to load AddProduct fragment:", oError as unknown as string);
                this._dDialogAddProduct = undefined;
            }.bind(this)) as Promise<Dialog>;
        }

        if (this._dDialogAddProduct) this._dDialogAddProduct.then(oDialog => { if (oDialog) oDialog.open(); });
    }

    _closeAddProductDialog(): void {
        (this._oController.byId("AddProduct") as Dialog).close();
    }

    _openEditProductDialog(): void {
        if (!this._dDialogEditProduct) {
            this._dDialogEditProduct = (Fragment.load({ id: this._oController.getView()!.getId(),
                                             name: "cap_try_ts.view.fragments.EditProduct",
                                             controller: this._oController }) as Promise<Dialog>)
            .then(function (this: DialogHandler, oDialog: Dialog) {
                this._oController.getView()!.addDependent(oDialog);
                return oDialog;
            }.bind(this)).catch(function(this: DialogHandler, oError: Error) {
                Log.error("Failed to load EditProduct fragment:", oError as unknown as string);
                this._dDialogEditProduct = undefined;
            }.bind(this)) as Promise<Dialog>;
        }

        if (this._dDialogEditProduct) this._dDialogEditProduct.then(oDialog => { if (oDialog) oDialog.open(); });
    }

    _closeEditProductDialog(): void {
        (this._oController.byId("editProduct") as Dialog).close();
    }

    async _openCartDialog(): Promise<void> {
        try {
            if (!this._dDialogCart) {
                this._dDialogCart = await (Fragment.load({ id: this._oController.getView()!.getId(),
                                                          name: "cap_try_ts.view.fragments.Cart",
                                                          controller: this._oController }) as Promise<Dialog>);
                this._dDialogCart.setModel(this._oController.getModel("globalModel"), "globalModel");
                this._dDialogCart.setModel(this._oController.getModel("i18n"), "i18n");
                this._dDialogCart.setModel(this._oController.getOwnerComponent()!.getModel());
            }

            const oDialog = await this._dDialogCart;
            oDialog.open();
            CartService.bindDataToFragment(this._oController);
        } catch(oError) {
            Log.error("Failed to load Cart fragment:", oError as string);
            this._dDialogCart = undefined;
        }
    }

    _closeCartDialog(): void {
        (this._oController.byId("Cart") as Dialog).close();
    }
}
