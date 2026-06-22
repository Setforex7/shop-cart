import BaseController from "cap_try_ts/controller/BaseController";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import Formatter from "cap_try_ts/formatters/formatter";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { LayoutType } from "sap/f/library";
import Event from "sap/ui/base/Event";
import Table from "sap/ui/table/Table";
import Select from "sap/m/Select";
import FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import ListBinding from "sap/ui/model/ListBinding";

const sEntityCompany = "/Company";

/**
 * @namespace cap_try_ts.controller
 */
export default class Reports extends BaseController {
    public onInit(): void {
        this._onControllerLoad();
        this.getRouter().getRoute("Reports")!.attachPatternMatched(this._onObjectMatched, this);
    }

    public onExit(): void {
        this.getRouter().getRoute("Reports")!.detachPatternMatched(this._onObjectMatched, this);
    }

    private _getOrdersExcelFieldsConfig(): object[] {
        return [ { label: this.getI18nText("order_id"), property: 'ID', type: 'string', width: 20 },
                 { label: this.getI18nText("created_at"), property: 'createdAt', type: 'date', format: 'dd-mm-yyyy HH:mm' },
                 { label: this.getI18nText("company"), property: 'company/name', type: 'string', width: 25 },
                 { label: this.getI18nText("company_description"), property: 'company/description', type: 'string', width: 35 },
                 { label: this.getI18nText("type"), property: 'type', type: 'string' },
                 { label: this.getI18nText("status"), property: 'status', type: 'string' },
                 { label: this.getI18nText("total_price"), property: 'total_price', type: 'number', scale: 2, delimiter: true, suffix: '' },
                 { label: this.getI18nText("currency"), property: 'currency', type: 'string', width: 5 },
                 { label: this.getI18nText("created_by"), property: 'createdBy', type: 'string' } ];
    }

    public async onCompanyChange(oEvent: Event<Record<string, any>>): Promise<void> {
        const oView = this.getView()!;
        oView.setBusy(true);

        const oSelectedCompany = await this._getEntityContexts(sEntityCompany, (oEvent.getSource() as Select).getSelectedKey());
        this.setProp("globalModel", "/selectedCompany", oSelectedCompany);
        this.getModel("globalModel").refresh(true);

        this._setOrderTableBinding();
        oView.setBusy(false);
    }

    private _setOrderTableBinding(): void {
        const oOrdersTable = this.getView()!.byId("ordersTable") as Table;
        const { ID } = this.getProp("globalModel", "/selectedCompany");

        oOrdersTable.bindRows({ path: "/Orders",
                                parameters: { $expand: "company,items" },
                                filters: new Filter("company_ID", FilterOperator.EQ, ID) })
    }

    public onOrdersTableRefresh(): void {
        const oOrdersTable = this.getView()!.byId("ordersTable") as Table;
        (oOrdersTable.getBinding("rows") as ListBinding).refresh();
    }

    public onExportExcel(): void {
        const oOrdersTable = this.byId("ordersTable") as Table;
        const oRowBinding = oOrdersTable.getBinding("rows") as ListBinding;

        const oExcelSettings = { workbook: { columns: this._getOrdersExcelFieldsConfig(),
                                             context: { application: this.getI18nText("excel_app_name"),
                                                        version: this.getI18nText("excel_app_version"),
                                                        title: this.getI18nText("excel_orders_report_title") } },
                            dataSource: oRowBinding,
                            fileName: this.getI18nText("excel_orders_report_filename"),
                            worker: false };

        const oExcelSheet = new Spreadsheet(oExcelSettings);
        oExcelSheet.build().finally(function() { oExcelSheet.destroy(); });
    }

    public onOrderPress(oEvent: Event<Record<string, any>>): void {
        const oOrderContext = oEvent.getParameter("rowBindingContext");
        if (!oOrderContext) return;

        const sOrderPath = oOrderContext.getPath();
        const oFCL = this.getView()!.byId("fcl") as FlexibleColumnLayout;
        const oOrderItemsTable = this.getView()!.byId("itemsTable") as Table;

        oOrderItemsTable.bindRows({ path: sOrderPath + "/items" });

        oFCL.setLayout(LayoutType.TwoColumnsMidExpanded);
    }

    public onCloseDetail(): void { (this.getView()!.byId("fcl") as FlexibleColumnLayout).setLayout(LayoutType.OneColumn); }
}
