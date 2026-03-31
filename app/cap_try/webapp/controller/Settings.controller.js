sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/service/CompanyService",
    "cap_try/formatters/formatter",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(
    BaseController,
    CompanyService,
    Formatter,
    Fragment,
    Spreadsheet,
    Filter,
    FilterOperator
) {
    "use strict";

    return BaseController.extend("cap_try.controller.Settings", {
        onInit: function() {
            this._onControllerLoad();
            this.getRouter().getRoute("Settings").attachPatternMatched(this._onObjectMatched, this);
        },

        onExit: function() {
            this.getRouter().getRoute("Settings").detachPatternMatched(this._onObjectMatched, this);
        },

        onCreateCompany: async function() {
            const oCompanyData = this.getProp("globalModel", "/selectedCompany");
            const { name, description, capital, currency_code } = oCompanyData;
            await CompanyService.create(this, { name, description, capital, currency_code });
            this.onCompaniesTableRefresh();
            this.onClearSelectedCompanyData();
        },

        onEditCompany: async function() {
            const oSelectedCompany = this.getProp("globalModel", "/selectedCompany");
            if (!oSelectedCompany?.metadata) return;
            await CompanyService.edit(this, oSelectedCompany);
            this.onCompaniesTableRefresh();
        },

        onCompanyTabSelect: function(oEvent) {
            CompanyService.clearSelected(this);
            const oCompaniesTable = this.getView().byId("companiesTable");
            const oCompanySeletedTab = oEvent.getParameter("key");
            if(oCompanySeletedTab === "create") oCompaniesTable.setSelectionMode("None");
            else oCompaniesTable.setSelectionMode("Single");
        },

        onCompaniesSelectedCancelPress: function() { CompanyService.clearSelected(this); },

        onCompaniesTableRefresh: function() {
            const oCompaniesTable = this.getView().byId("companiesTable");
            oCompaniesTable.getBinding("rows").refresh();
        },

        onCompaniesTableSelection: async function(oEvent) {
            const oCompaniesSelected = oEvent.getParameter("rowContext");
            if (!oCompaniesSelected) return;
            const oCompanyBinding = this.getModel().bindContext(oCompaniesSelected.getPath());
            const oCompanyContext = await oCompanyBinding.requestObject();

            Object.assign(oCompanyContext, { metadata: oCompanyBinding.getBoundContext() });

            this.setProp("globalModel", "/selectedCompany", oCompanyContext);
            this.getModel("globalModel").refresh(true);
        },

        onClearSelectedCompanyData: function() {
            this.setProp("globalModel", "/selectedCompany", {});
            this.getModel("globalModel").refresh(true);
        },

        onCreateCompanyNameChange: function(oEvent) {
            const sName = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/name", sName);
        },

        onCreateCompanyDescriptionChange: function(oEvent) {
            const sDescription = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/description", sDescription);
        },

        onCreateCompanyCapitalChange: function(oEvent) {
            const iCapital = oEvent.getParameter("value");
            this.setProp("globalModel", "/selectedCompany/capital", iCapital);
        },

        onCreateCompanyCurrencyChange: function(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) return;
            this.setProp("globalModel", "/selectedCompany/currency_code", oSelectedItem.getKey());
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

        onCompanyChange: function(oEvent) {
            const oView = this.getView();
            const sCompanyID = oEvent.getParameter("selectedItem")?.getKey();
            const oCartsTable = Fragment.byId(oView.getId(), "cartsFragmentTable");
            const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable");

            if (!oCartItemsTable || !oCartsTable) return;

            oCartItemsTable.unbindRows();

            if (!sCompanyID) {
                oCartsTable.getBinding("rows").filter([]);
                return;
            }

            oCartsTable.getBinding("rows").filter([
                new Filter("company_ID", FilterOperator.EQ, sCompanyID)
            ]);
        },

        onCartAdminTableSelection: function(oEvent) {
            const oView = this.getView();
            const oRowContext = oEvent.getParameter("rowContext");
            const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable");

            if (!oCartItemsTable) return;

            if (!oRowContext) {
                oCartItemsTable.unbindRows();
                return;
            }

            oCartItemsTable.bindRows({
                path: oRowContext.getPath() + "/items",
                parameters: { $expand: "product" }
            });
        },

        onExportExcel: function() {
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
