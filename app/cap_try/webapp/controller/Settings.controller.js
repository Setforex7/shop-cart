sap.ui.define([
    "cap_try/controller/BaseController",
    "cap_try/formatters/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function(
	BaseController,
	Formatter,
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

        onSideBarItemSelect: function(oEvent) {
            const sSelectedItem = oEvent.getParameter("item").getKey();

            switch (sSelectedItem) {
                case "carts": this.getDialogHandler()._openCartsFragment();
                    break;
                case "companies": this.getDialogHandler()._openCompaniesFragment(); 
                    break;
                
            }
        },

    })
});