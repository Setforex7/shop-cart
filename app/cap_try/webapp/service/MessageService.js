sap.ui.define([
    "sap/ui/core/IconPool",
    "sap/m/Link",
    "sap/m/MessageItem",
    "sap/m/MessageView",
    "sap/m/Button",
    "sap/m/Bar",
    "sap/m/Title",
    "sap/m/Popover"
], function(IconPool, Link, MessageItem, MessageView, Button, Bar, Title, Popover) {
    "use strict";

    return {
        init: function(oController) {
            const oInstance = Object.create(this);
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

            oInstance._oMessageView.setModel(oController.getOwnerComponent().getModel("messageModel"));
            oInstance._oMessageView.getModel().setData(oInstance._aMessages);

            const oBackButton = new Button({ icon: IconPool.getIconURI("nav-back"),
                                              visible: false,
                                              press: function () {
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

        addMessage: function(oMessage) {
            this._aMessages.push(oMessage);
            this._oMessageView.getModel().setData(this._aMessages);
            this._oMessageView.getModel().refresh(true);
        },

        deleteMessages: function() {
            this._aMessages = [];
            this._oMessageView.getModel().setData(this._aMessages);
            this._oMessageView.getModel().refresh(true);
        },

        toggleMessageView: function(oEvent) {
            this._oMessageView.navigateBack();
            this._oPopover.openBy(oEvent.getSource());
        }
    };
});
