sap.ui.define([
    "cap_try/controller/BaseController",
    "sap/ui/export/Spreadsheet",
    "cap_try/formatters/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(
	BaseController,
    Spreadsheet,
	Formatter,
    Filter,
    FilterOperator
) {
	"use strict";

    const sEntityCompany = "/Company";

	return BaseController.extend("cap_try.controller.Reports", {
        onInit: function() { 
            this._onControllerLoad();
            this.getRouter().getRoute("Reports").attachPatternMatched(this._onObjectMatched, this);
        },

        _getOrdersExcelFieldsConfig: function(){
            return [ { label: this.getI18nText("order_id"), property: 'ID', type: 'string', width: 20 },
                     { label: this.getI18nText("created_at"), property: 'createdAt', type: 'date', format: 'dd-mm-yyyy HH:mm' },
                     { label: this.getI18nText("company"), property: 'company/name', type: 'string', width: 25 },
                     { label: this.getI18nText("company_description"), property: 'company/description', type: 'string', width: 35 },
                     { label: this.getI18nText("type"), property: 'type', type: 'string' },
                     { label: this.getI18nText("status"), property: 'status', type: 'string' },
                     { label: this.getI18nText("total_price"), property: 'total_price', type: 'number', scale: 2, delimiter: true, suffix: '' },
                     { label: this.getI18nText("currency"), property: 'currency', type: 'string', width: 5 },
                     { label: this.getI18nText("created_by"), property: 'createdBy', type: 'string' } ];
        },

        onCompanyChange: async function(oEvent){
            const oView = this.getView();
            oView.setBusy(true);

            const oSelectedCompany = await this._getEntityContexts(sEntityCompany, oEvent.getSource().getSelectedKey());
            this.setProp("globalModel", "/selectedCompany", oSelectedCompany);
            this.getModel("globalModel").refresh(true);

            this._setOrderTableBinding();
            oView.setBusy(false);
        },

        _setOrderTableBinding: function(){
            const oOrdersTable = this.getView().byId("ordersTable");
            const { ID } = this.getProp("globalModel", "/selectedCompany");

            oOrdersTable.bindRows({ path: "/Orders",
                                    parameters: { $expand: "company,items" },
                                    filters: new Filter("company_ID", FilterOperator.EQ, ID), 
                                    events: { dataReceived: function(oEvent) { console.log(oEvent); } } })
        },

        onOrdersTableRefresh: function(){
            const oOrdersTable = this.getView().byId("ordersTable");
            oOrdersTable.getBinding("rows").refresh();
            console.log("atualizei");
        },

        onExportExcel: function(){
            const oOrdersTable = this.byId("ordersTable"); 
            const oRowBinding = oOrdersTable.getBinding("rows"); 

            const oExcelSettings = { workbook: { columns: this._getOrdersExcelFieldsConfig(),
                                                 context: { application: 'My Shopping App',
                                                            version: '1.0',
                                                            title: 'Orders Report' } },
                                dataSource: oRowBinding, 
                                fileName: 'Orders_Report.xlsx',
                                worker: false };

            const oExcelSheet = new Spreadsheet(oExcelSettings);
            oExcelSheet.build().finally(function() { oExcelSheet.destroy(); });
        },

        onOrderPress: function (oEvent) {

            const oOrderContext = oEvent.getParameter("rowBindingContext");
            if (!oOrderContext) return;

            const sOrderPath = oOrderContext.getPath();
            const oFCL = this.getView().byId("fcl");
            const oOrderItemsTable = this.getView().byId("itemsTable");

            oOrderItemsTable.bindRows({ path: sOrderPath + "/items" });

            oFCL.setLayout(sap.f.LayoutType.TwoColumnsMidExpanded);
        },

        onCloseDetail: function () { this.getView().byId("fcl").setLayout(sap.f.LayoutType.OneColumn); },
	});
});