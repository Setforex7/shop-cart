import Controller from "sap/ui/core/mvc/Controller";
import DialogHandler from "cap_try_ts/controller/DialogHandler";
import MessageService from "cap_try_ts/service/MessageService";
import JSONModel from "sap/ui/model/json/JSONModel";
import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import MessageBox from "sap/m/MessageBox";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Router from "sap/ui/core/routing/Router";
import Model from "sap/ui/model/Model";
import Event from "sap/ui/base/Event";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Control from "sap/ui/core/Control";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import UIComponent from "sap/ui/core/UIComponent";

const sFunctionGetUserInfoPath = "/getUserInfo(...)";

type MessageServiceInstance = ReturnType<typeof MessageService.init>;

/**
 * @namespace cap_try_ts.controller
 */
export default class BaseController extends Controller {
    private _i18n!: ResourceBundle;
    private _oDialogHandler!: DialogHandler;
    private _oRouter!: Router;
    private _messageService!: MessageServiceInstance;
    private _oGlobalMenu!: Menu;

    async _onControllerLoad(): Promise<void> {
        this._i18n = (this.getOwnerComponent()!.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
        this._oDialogHandler = new DialogHandler(this);
        this._oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this._messageService = (MessageService.init as (oController: BaseController) => MessageServiceInstance)(this);

        this.getView()!.setModel(this.getModel());

        await this._getUserInfo();
    }

    _onObjectMatched(): void {
        this.getModel().refresh();
        this.setProp("globalModel", "/selectedCompany", {});
        this.setProp("globalModel", "/selectedCart", {});
        (this.getModel("globalModel") as JSONModel).refresh(true);
    }

    async _getUserInfo(): Promise<void> {
        const oView = this.getView()!;
        oView.setBusy(true);
        try {
            const oUserContext = (this.getModel() as ODataModel).bindContext(sFunctionGetUserInfoPath);
            await oUserContext.invoke();
            const oUserInfo = oUserContext.getBoundContext();
            const { id, roles } = oUserInfo.getObject() as { id: string; roles: string[] };
            this.setProp("globalModel", "/userInfo", { id, roles });
            (this.getModel("globalModel") as JSONModel).refresh(true);
        } catch {
            MessageBox.error(this.getI18nText("user_info_error"));
        } finally {
            oView.setBusy(false);
        }
    }

    getRouter(): Router {
        return this._oRouter;
    }

    getDialogHandler(): DialogHandler {
        return this._oDialogHandler;
    }

    getI18n(): ResourceBundle {
        return this._i18n;
    }

    getI18nText(sValue: string, aParameters?: unknown[]): string {
        return this.getI18n().getText(sValue, aParameters) as string;
    }

    getModel(alias?: string): Model {
        return this.getOwnerComponent()!.getModel(alias) as Model;
    }

    setProp(sAlias: string, sProperty: string, uValue: unknown): void {
        (this.getOwnerComponent()!.getModel(sAlias) as JSONModel).setProperty(sProperty, uValue);
    }

    getProp(sAlias: string, sProperty: string) {
        return (this.getOwnerComponent()!.getModel(sAlias) as JSONModel).getProperty(sProperty);
    }

    initializeMenu(oEvent: Event): void {
        if (!this._oGlobalMenu)
            this._oGlobalMenu = new Menu({ items: [ new MenuItem({ text: this.getI18nText("menu_start"),
                                                                   icon: "sap-icon://home" }),
                                                    new MenuItem({ text: this.getI18nText("menu_reports"),
                                                                   icon: "sap-icon://product" }),
                                                    new MenuItem({ text: this.getI18nText("menu_settings"),
                                                                   icon: "sap-icon://action-settings",
                                                                   visible: this.getProp("globalModel", "/userInfo/roles").includes("admin") }) ],
                                           itemSelected: function(this: BaseController, oEvent: Event) {
                                               const sSelectedAction = ((oEvent.getParameter as (sName: string) => MenuItem)("item")).getText() || "";
                                               const menuMap: Record<string, string> = {};
                                               menuMap[this.getI18nText("menu_start")] = "Shop";
                                               menuMap[this.getI18nText("menu_reports")] = "Reports";
                                               menuMap[this.getI18nText("menu_settings")] = "Settings";
                                               const sRoute = menuMap[sSelectedAction];
                                               if (sRoute) this.getRouter().navTo(sRoute);
                                           }.bind(this) });

        (this._oGlobalMenu.openBy as (oControl: Control) => void)(oEvent.getSource() as Control);
    }

    _addMessage(oMessage: object): void {
        this._messageService.addMessage(oMessage);
    }

    _deleteMessages(): void {
        this._messageService.deleteMessages();
    }

    toggleMessageView(oEvent: Event): void {
        this._messageService.toggleMessageView(oEvent);
    }

    async _getEntityContexts(sEntity: string, sKey: string) {
        return await (this.getOwnerComponent()!.getModel() as ODataModel).bindContext(sEntity + `('${sKey}')`).requestObject();
    }

    async _getEntitySetContexts(sPath: string, oContext?: Context, aSorters?: Sorter | Sorter[], aFilters?: Filter | Filter[], oParameters?: object): Promise<Context[]> {
        const aEntity = await (this.getOwnerComponent()!.getModel() as ODataModel).bindList(sPath,
                                                                           oContext || undefined,
                                                                           aSorters || undefined,
                                                                           aFilters || undefined,
                                                                           oParameters || undefined).requestContexts();
        return aEntity;
    }
}
