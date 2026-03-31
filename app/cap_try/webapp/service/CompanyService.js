sap.ui.define([
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(MessageBox, MessageToast) {
    "use strict";

    const sEntityCompany = "/Company";

    return {
        create: async function(oController, oCompany) {
            try {
                const oCompanyList = oController.getModel().bindList(sEntityCompany);
                const oNewCompany = oCompanyList.create(oCompany);
                await oNewCompany.created();
                const { name } = oNewCompany.getObject();
                oController._addMessage({ type: "Success",
                                          title: oController.getI18nText("success"),
                                          subtitle: oController.getI18nText("create_company_success", [name]) });
                MessageToast.show(oController.getI18nText("create_company_success", [name]));
            } catch {
                oController._addMessage({ type: "Error",
                                          title: oController.getI18nText("error"),
                                          subtitle: oController.getI18nText("create_company_error") });
                MessageBox.error(oController.getI18nText("create_company_error"));
            }
        },

        edit: async function(oController, oCompany) {
            const { metadata, name, description, capital } = oCompany;

            if (!metadata) {
                MessageBox.error(oController.getI18nText("edit_company_no_selection"));
                return;
            }

            const oFormatedCapital = parseFloat(capital);
            const oNewCompanyData = { name, description, capital: oFormatedCapital };

            for (const [sKey, sValue] of Object.entries(oNewCompanyData))
                metadata.setProperty(sKey, sValue);

            try {
                await oController.getModel().submitBatch("updateCompanies");
                oController._addMessage({ type: "Success",
                                          title: oController.getI18nText("success"),
                                          subtitle: oController.getI18nText("edit_company_success", [name]) });
                MessageToast.show(oController.getI18nText("edit_company_success", [name]));
            } catch {
                oController._addMessage({ type: "Error",
                                          title: oController.getI18nText("error"),
                                          subtitle: oController.getI18nText("edit_company_error", [name]) });
                MessageBox.error(oController.getI18nText("edit_company_error", [name]));
            }
        },

        clearSelected: function(oController) {
            oController.setProp("globalModel", "/selectedCompany", {});
            oController.getModel("globalModel").refresh(true);
        }
    };
});
