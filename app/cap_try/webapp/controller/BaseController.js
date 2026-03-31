sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "cap_try/controller/DialogHandler",
    "cap_try/service/MessageService",
    "sap/ui/model/json/JSONModel",
    "sap/m/Menu",
    "sap/m/MenuItem",
    "sap/m/MessageBox"
], (
    Controller,
    DialogHandler,
    MessageService,
    JSONModel,
    Menu,
    MenuItem,
    MessageBox
) => {
    "use strict";

    const sFunctionGetUserInfoPath = "/getUserInfo(...)";

    return Controller.extend("cap_try.controller.BaseController", {
        _onControllerLoad: async function() {
            this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this._oDialogHandler = new DialogHandler(this);
            this._oRouter = this.getOwnerComponent().getRouter();
            this._messageService = MessageService.init(this);

            this.getView().setModel(this.getModel());

            await this._getUserInfo();
        },

        _onObjectMatched: function() {
            this.getModel().refresh();
            this.setProp("globalModel", "/selectedCompany", {});
            this.setProp("globalModel", "/selectedCart", {});
            this.getModel("globalModel").refresh(true);
        },

        _getUserInfo: async function() {
            const oView = this.getView();
            oView.setBusy(true);
            try {
                const oUserContext = this.getModel().bindContext(sFunctionGetUserInfoPath);
                await oUserContext.execute();
                const oUserInfo = oUserContext.getBoundContext();
                const { id, roles } = oUserInfo.getObject();
                this.setProp("globalModel", "/userInfo", { id, roles });
                this.getModel("globalModel").refresh(true);
            } catch {
                MessageBox.error(this.getI18nText("user_info_error"));
            } finally {
                oView.setBusy(false);
            }
        },

        getRouter: function() {
            return this._oRouter;
        },

        getDialogHandler: function() {
            return this._oDialogHandler;
        },

        getI18n: function() {
            return this._i18n;
        },

        getI18nText: function(sValue, aParameters) {
            return this.getI18n().getText(sValue, aParameters);
        },

        getModel: function(alias) {
            return this.getOwnerComponent().getModel(alias);
        },

        setProp: function(sAlias, sProperty, uValue) {
            this.getOwnerComponent().getModel(sAlias).setProperty(sProperty, uValue);
        },

        getProp: function(sAlias, sProperty) {
            return this.getOwnerComponent().getModel(sAlias).getProperty(sProperty);
        },

        initializeMenu: function(oEvent) {
            if (!this._oGlobalMenu)
                this._oGlobalMenu = new Menu({ items: [ new MenuItem({ text: this.getI18nText("menu_start"),
                                                                       icon: "sap-icon://home" }),
                                                        new MenuItem({ text: this.getI18nText("menu_reports"),
                                                                       icon: "sap-icon://product" }),
                                                        new MenuItem({ text: this.getI18nText("menu_settings"),
                                                                       icon: "sap-icon://action-settings",
                                                                       visible: this.getProp("globalModel", "/userInfo/roles").includes("admin") }) ],
                                               itemSelected: function(oEvent) {
                                                   const sSelectedAction = oEvent.getParameter("item").getText() || "";
                                                   const menuMap = {};
                                                   menuMap[this.getI18nText("menu_start")] = "Shop";
                                                   menuMap[this.getI18nText("menu_reports")] = "Reports";
                                                   menuMap[this.getI18nText("menu_settings")] = "Settings";
                                                   const sRoute = menuMap[sSelectedAction];
                                                   if (sRoute) this.getRouter().navTo(sRoute);
                                               }.bind(this) });

            this._oGlobalMenu.openBy(oEvent.getSource());
        },

        _addMessage: function(oMessage) {
            this._messageService.addMessage(oMessage);
        },

        _deleteMessages: function() {
            this._messageService.deleteMessages();
        },

        toggleMessageView: function(oEvent) {
            this._messageService.toggleMessageView(oEvent);
        },

        _getEntityContexts: async function(sEntity, sKey) {
            return await this.getOwnerComponent().getModel().bindContext(sEntity + `('${sKey}')`).requestObject();
        },

        _getEntitySetContexts: async function(sPath, oContext, aSorters, aFilters, oParameters) {
            const aEntity = await this.getOwnerComponent().getModel().bindList(sPath,
                                                                               oContext || undefined,
                                                                               aSorters || undefined,
                                                                               aFilters || undefined,
                                                                               oParameters || undefined).requestContexts();
            return aEntity;
        }
    });
});
