import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type JSONModel from "sap/ui/model/json/JSONModel";
import type Context from "sap/ui/model/odata/v4/Context";
import type BaseController from "cap_try_ts/controller/BaseController";

const sEntityCompany = "/Company";

/**
 * @namespace cap_try_ts.service
 */
export default {
    async create(oController: BaseController, oCompany: object): Promise<void> {
        try {
            const oCompanyList = (oController.getModel() as ODataModel).bindList(sEntityCompany) as ODataListBinding;
            const oNewCompany = oCompanyList.create(oCompany);
            await oNewCompany.created();
            const { name } = oNewCompany.getObject() as { name: string };
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

    async edit(oController: BaseController, oCompany: { metadata?: Context; name: string; description: string; capital: string }): Promise<void> {
        const { metadata, name, description, capital } = oCompany;

        if (!metadata) {
            MessageBox.error(oController.getI18nText("edit_company_no_selection"));
            return;
        }

        const oFormatedCapital = parseFloat(capital);
        const oNewCompanyData: Record<string, unknown> = { name, description, capital: oFormatedCapital };

        for (const [sKey, sValue] of Object.entries(oNewCompanyData))
            metadata.setProperty(sKey, sValue);

        try {
            await (oController.getModel() as ODataModel).submitBatch("updateCompanies");
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

    clearSelected(oController: BaseController): void {
        oController.setProp("globalModel", "/selectedCompany", {});
        (oController.getModel("globalModel") as JSONModel).refresh(true);
    }
};
