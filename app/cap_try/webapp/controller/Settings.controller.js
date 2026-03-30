sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(
	BaseController,
	Formatter,
    Fragment,
    Spreadsheet,
    Filter,
    FilterOperator
) {
	"use strict";

    const sEntityCompany = "/Company";
    const sEntityProducts = "/Products";
    const sEntityCart = "/Cart";

	return BaseController.extend("cap_try.controller.Settings", {
        onInit: function() {
            this._onControllerLoad();
            this.getRouter().getRoute("Settings").attachPatternMatched(this._onObjectMatched, this);
        },

        onCreateCompany: function(){
            this._createCompany(this.getProp("globalModel", "/selectedCompany"));
            this.onCompaniesTableRefresh();
            this.onClearSelectedCompanyData();
        },

        onEditCompany: function(){
            this._editCompany(this.getProp("globalModel", "/selectedCompany"));
            this.onCompaniesTableRefresh();
        },

        onCompanyTabSelect: function(oEvent){
            this._clearSelectedCompany();
            const oCompaniesTable = this.getView().byId("companiesTable");
            const oCompanySeletedTab = oEvent.getParameter("key");
            if(oCompanySeletedTab === "create") oCompaniesTable.setSelectionMode("None");
            else oCompaniesTable.setSelectionMode("Single");
        },

        onCompaniesSelectedCancelPress: function(){ this._clearSelectedCompany(); },

        onCompaniesTableRefresh: function(){
            const oCompaniesTable = this.getView().byId("companiesTable");
            oCompaniesTable.getBinding("rows").refresh();
        },

        onCompaniesTableSelection: async function(oEvent){
            const oCompaniesSelected = oEvent.getParameter("rowContext");

            const oCompanyBinding = this.getModel().bindContext(oCompaniesSelected.getPath());
            const oCompanyContext = await oCompanyBinding.requestObject();

            Object.assign(oCompanyContext, { metadata: oCompanyBinding.getBoundContext() });

            this.setProp("globalModel", "/selectedCompany", oCompanyContext);
            this.getModel("globalModel").refresh(true);
        },

        onClearSelectedCompanyData: function(){
            this.setProp("globalModel", "/selectedCompany", {});
            this.getModel("globalModel").refresh(true);
        },

        onCreateCompanyNameChange: function(oEvent){
            const sName = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/name", sName);
        },

        onCreateCompanyDescriptionChange: function(oEvent){
            const sDescription = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/description", sDescription);
        },

        onCreateCompanyCapitalChange: function(oEvent){
            const iCapital = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/capital", iCapital);
        },

        onCreateCompanyCurrencyChange: function(oEvent){
            const sCurrencyCode = oEvent.getParameter("selectedItem").getKey();
            this.setProp("globalModel", "/selectedCompany/currency_code", sCurrencyCode);
        },

        onSideBarItemSelect: function(oEvent) {
            const sSelectedItem = oEvent.getParameter("item").getKey();

            switch (sSelectedItem) {
                case "carts": this.getDialogHandler()._openCartsFragment();
                    break;
                case "companies": this.getDialogHandler()._openCompaniesFragment();
                    break;
            }
        },

        onCompanyChange: function(oEvent){
            const oView = this.getView();
            const sCompanyID = oEvent.getParameter("selectedItem")?.getKey();
            const oCartsTable = Fragment.byId(oView.getId(), "cartsFragmentTable");
            const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable");

            oCartItemsTable.unbindRows();

            if (!sCompanyID) {
                oCartsTable.getBinding("rows").filter([]);
                return;
            }

            oCartsTable.getBinding("rows").filter([
                new Filter("company_ID", FilterOperator.EQ, sCompanyID)
            ]);
        },

        onCartAdminTableSelection: function(oEvent){
            const oView = this.getView();
            const oRowContext = oEvent.getParameter("rowContext");
            const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable");

            if (!oRowContext) {
                oCartItemsTable.unbindRows();
                return;
            }

            oCartItemsTable.bindRows({
                path: oRowContext.getPath() + "/items",
                parameters: { $expand: "product" }
            });
        },

        onExportExcel: function(){
            const oCompaniesTable = this.getView().byId("companiesTable");
            const oRowBinding = oCompaniesTable.getBinding("rows");

            const oExcelSettings = {
                workbook: {
                    columns: [
                        { label: this.getI18nText("company_id"), property: "ID", type: "string", width: 30 },
                        { label: this.getI18nText("name"), property: "name", type: "string", width: 25 },
                        { label: this.getI18nText("description"), property: "description", type: "string", width: 35 },
                        { label: this.getI18nText("capital"), property: "capital", type: "number", scale: 2, delimiter: true }
                    ]
                },
                dataSource: oRowBinding,
                fileName: "Companies_Report.xlsx",
                worker: false
            };

            const oExcelSheet = new Spreadsheet(oExcelSettings);
            oExcelSheet.build().finally(function() { oExcelSheet.destroy(); });
        }

    })
});