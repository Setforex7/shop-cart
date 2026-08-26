import IconPool from "sap/ui/core/IconPool";
import type Control from "sap/ui/core/Control";
import MessageItem from "sap/m/MessageItem";
import MessageView from "sap/m/MessageView";
import Button from "sap/m/Button";
import Bar from "sap/m/Bar";
import Title from "sap/m/Title";
import Popover from "sap/m/Popover";
import type Event from "sap/ui/base/Event";
import type JSONModel from "sap/ui/model/json/JSONModel";
import type BaseController from "cap_try_ts/controller/BaseController";

// The dynamically created instance (via Object.create) carries these fields.
interface MessageServiceInstance {
    _aMessages: object[];
    _oController: BaseController;
    _oMessageView: MessageView;
    _oPopover: Popover;
    init(oController: BaseController): MessageServiceInstance;
    addMessage(oMessage: object): void;
    deleteMessages(): void;
    toggleMessageView(oEvent: Event): void;
}

/**
 * @namespace cap_try_ts.service
 */
export default {
    init(this: MessageServiceInstance, oController: BaseController): MessageServiceInstance {
        const oInstance: MessageServiceInstance = Object.create(this);
        oInstance._aMessages = [];
        oInstance._oController = oController;

        const oMessageTemplate = new MessageItem({ type: '{type}',
                                                    title: '{title}',
                                                    description: '{description}',
                                                    subtitle: '{subtitle}',
                                                    counter: '{counter}',
                                                    markupDescription: "{markupDescription}" });

        oInstance._oMessageView = new MessageView({ showDetailsPageHeader: false,
                                                     itemSelect: function () {
                                                         oBackButton.setVisible(true);
                                                     },
                                                     items: { path: "/",
                                                              template: oMessageTemplate }
        });

        oInstance._oMessageView.setModel(oController.getOwnerComponent()!.getModel("messageModel") as JSONModel);
        (oInstance._oMessageView.getModel() as JSONModel).setData(oInstance._aMessages);

        const oBackButton = new Button({ icon: IconPool.getIconURI("nav-back"),
                                          visible: false,
                                          press: function (this: Button) {
                                              oInstance._oMessageView.navigateBack();
                                              oInstance._oPopover.focus();
                                              this.setVisible(false);
                                          } });

        const oCloseButton = new Button({ text: oController.getI18nText("close"),
                                           press: function () {
                                               oInstance._oPopover.close();
                                           } }).addStyleClass("sapUiTinyMarginEnd");
        const oPopoverFooter = new Bar({ contentRight: oCloseButton });
        const oPopoverBar = new Bar({ contentLeft: [oBackButton],
                                       contentMiddle: [ new Title({text: oController.getI18nText("messages") })] });

        oInstance._oPopover = new Popover({ customHeader: oPopoverBar,
                                             contentWidth: "440px",
                                             contentHeight: "440px",
                                             verticalScrolling: false,
                                             modal: true,
                                             content: [oInstance._oMessageView],
                                             footer: oPopoverFooter });

        return oInstance;
    },

    addMessage(this: MessageServiceInstance, oMessage: object): void {
        this._aMessages.push(oMessage);
        (this._oMessageView.getModel() as JSONModel).setData(this._aMessages);
        (this._oMessageView.getModel() as JSONModel).refresh(true);
    },

    deleteMessages(this: MessageServiceInstance): void {
        this._aMessages = [];
        (this._oMessageView.getModel() as JSONModel).setData(this._aMessages);
        (this._oMessageView.getModel() as JSONModel).refresh(true);
    },

    toggleMessageView(this: MessageServiceInstance, oEvent: Event): void {
        this._oMessageView.navigateBack();
        this._oPopover.openBy(oEvent.getSource() as Control);
    }
};
