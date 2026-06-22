import BaseController from "cap_try_ts/controller/BaseController";
import CompanyService from "cap_try_ts/service/CompanyService";
import Formatter from "cap_try_ts/formatters/formatter";
import Fragment from "sap/ui/core/Fragment";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Event from "sap/ui/base/Event";
import Table from "sap/ui/table/Table";
import ListBinding from "sap/ui/model/ListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace cap_try_ts.controller
 */
export default class Settings extends BaseController {
    public onInit(): void {
        this._onControllerLoad();
        this.getRouter().getRoute("Settings")!.attachPatternMatched(this._onObjectMatched, this);
    }

    public onExit(): void {
        this.getRouter().getRoute("Settings")!.detachPatternMatched(this._onObjectMatched, this);
    }

    public async onCreateCompany(): Promise<void> {
        const oCompanyData = this.getProp("globalModel", "/selectedCompany");
        const { name, description, capital, currency_code } = oCompanyData;
        await CompanyService.create(this, { name, description, capital, currency_code });
        this.onCompaniesTableRefresh();
        this.onClearSelectedCompanyData();
    }

    public async onEditCompany(): Promise<void> {
        const oSelectedCompany = this.getProp("globalModel", "/selectedCompany");
        if (!oSelectedCompany?.metadata) return;
        await CompanyService.edit(this, oSelectedCompany);
        this.onCompaniesTableRefresh();
    }

    public onCompanyTabSelect(oEvent: Event<Record<string, any>>): void {
        CompanyService.clearSelected(this);
        const oCompaniesTable = this.getView()!.byId("companiesTable") as Table;
        const oCompanySeletedTab = oEvent.getParameter("key");
        if (oCompanySeletedTab === "create") oCompaniesTable.setSelectionMode("None");
        else oCompaniesTable.setSelectionMode("Single");
    }

    public onCompaniesSelectedCancelPress(): void { CompanyService.clearSelected(this); }

    public onCompaniesTableRefresh(): void {
        const oCompaniesTable = this.getView()!.byId("companiesTable") as Table;
        (oCompaniesTable.getBinding("rows") as ListBinding).refresh();
    }

    public async onCompaniesTableSelection(oEvent: Event<Record<string, any>>): Promise<void> {
        const oCompaniesSelected = oEvent.getParameter("rowContext");
        if (!oCompaniesSelected) return;
        const oCompanyBinding = (this.getModel() as ODataModel).bindContext(oCompaniesSelected.getPath());
        const oCompanyContext = await oCompanyBinding.requestObject();

        Object.assign(oCompanyContext, { metadata: oCompanyBinding.getBoundContext() });

        this.setProp("globalModel", "/selectedCompany", oCompanyContext);
        (this.getModel("globalModel") as JSONModel).refresh(true);
    }

    public onClearSelectedCompanyData(): void {
        this.setProp("globalModel", "/selectedCompany", {});
        (this.getModel("globalModel") as JSONModel).refresh(true);
    }

    public onCreateCompanyNameChange(oEvent: Event<Record<string, any>>): void {
        const sName = oEvent.getParameter("value");
        this.setProp("globalModel", "/selectedCompany/name", sName);
    }

    public onCreateCompanyDescriptionChange(oEvent: Event<Record<string, any>>): void {
        const sDescription = oEvent.getParameter("value");
        this.setProp("globalModel", "/selectedCompany/description", sDescription);
    }

    public onCreateCompanyCapitalChange(oEvent: Event<Record<string, any>>): void {
        const iCapital = oEvent.getParameter("value");
        this.setProp("globalModel", "/selectedCompany/capital", iCapital);
    }

    public onCreateCompanyCurrencyChange(oEvent: Event<Record<string, any>>): void {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        if (!oSelectedItem) return;
        this.setProp("globalModel", "/selectedCompany/currency_code", oSelectedItem.getKey());
    }

    public onSideBarItemSelect(oEvent: Event<Record<string, any>>): void {
        const sSelectedItem = oEvent.getParameter("item").getKey();

        switch (sSelectedItem) {
            case "carts": this.getDialogHandler()._openCartsFragment();
                break;
            case "companies": this.getDialogHandler()._openCompaniesFragment();
                break;
        }
    }

    public onCompanyChange(oEvent: Event<Record<string, any>>): void {
        const oView = this.getView()!;
        const sCompanyID = oEvent.getParameter("selectedItem")?.getKey();
        const oCartsTable = Fragment.byId(oView.getId(), "cartsFragmentTable") as Table;
        const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable") as Table;

        if (!oCartItemsTable || !oCartsTable) return;

        oCartItemsTable.unbindRows();

        if (!sCompanyID) {
            (oCartsTable.getBinding("rows") as ListBinding).filter([]);
            return;
        }

        (oCartsTable.getBinding("rows") as ListBinding).filter([
            new Filter("company_ID", FilterOperator.EQ, sCompanyID)
        ]);
    }

    public onCartAdminTableSelection(oEvent: Event<Record<string, any>>): void {
        const oView = this.getView()!;
        const oRowContext = oEvent.getParameter("rowContext");
        const oCartItemsTable = Fragment.byId(oView.getId(), "cartItemsFragmentTable") as Table;

        if (!oCartItemsTable) return;

        if (!oRowContext) {
            oCartItemsTable.unbindRows();
            return;
        }

        oCartItemsTable.bindRows({
            path: oRowContext.getPath() + "/items",
            parameters: { $expand: "product" }
        });
    }

    public onExportExcel(): void {
        const oCompaniesTable = this.getView()!.byId("companiesTable") as Table;
        const oRowBinding = oCompaniesTable.getBinding("rows") as ListBinding;

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
            fileName: this.getI18nText("excel_companies_report_filename"),
            worker: false
        };

        const oExcelSheet = new Spreadsheet(oExcelSettings);
        oExcelSheet.build().finally(function() { oExcelSheet.destroy(); });
    }
}
