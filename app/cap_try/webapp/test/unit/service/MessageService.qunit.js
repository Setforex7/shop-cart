sap.ui.define([
    "cap_try/service/MessageService",
    "sap/ui/model/json/JSONModel",
    "sap/ui/thirdparty/sinon"
], function (MessageService, JSONModel, sinon) {
    "use strict";

    QUnit.module("cap_try.service.MessageService", {
        beforeEach: function () {
            var that = this;

            this.sandbox = sinon.sandbox.create();

            this.oMessageModel = new JSONModel([]);

            this.oControllerMock = {
                getOwnerComponent: function () {
                    return {
                        getModel: function (sName) {
                            return sName === "messageModel" ? that.oMessageModel : null;
                        }
                    };
                },
                getI18nText: function (sKey) {
                    return sKey;
                }
            };

            this.oService = MessageService.init(this.oControllerMock);
        },
        afterEach: function () {
            if (this.oService && this.oService._oPopover) {
                // Destroys the Popover and all aggregated content (MessageView, Bars, Buttons, Title)
                this.oService._oPopover.destroy();
            }
            if (this.oMessageModel) {
                this.oMessageModel.destroy();
            }
            this.sandbox.restore();
            this.oService = null;
            this.oMessageModel = null;
            this.oControllerMock = null;
        }
    });

    QUnit.test("init creates a configured instance wired to the messageModel", function (assert) {
        assert.ok(this.oService, "init returned an instance");
        assert.deepEqual(this.oService._aMessages, [], "instance starts with an empty message array");
        assert.strictEqual(this.oService._oController, this.oControllerMock, "controller reference is stored on the instance");
        assert.ok(this.oService._oMessageView, "a MessageView was created");
        assert.ok(this.oService._oMessageView.isA("sap.m.MessageView"), "_oMessageView is a sap.m.MessageView");
        assert.strictEqual(this.oService._oMessageView.getModel(), this.oMessageModel, "the messageModel from the owner component is set on the MessageView");
        assert.deepEqual(this.oMessageModel.getData(), [], "model data is initialized to the empty message array");
        assert.ok(this.oService._oPopover, "a Popover was created");
        assert.ok(this.oService._oPopover.isA("sap.m.Popover"), "_oPopover is a sap.m.Popover");
        assert.strictEqual(this.oService._oPopover.getModal(), true, "popover is modal");
        assert.strictEqual(this.oService._oPopover.getContent()[0], this.oService._oMessageView, "the MessageView is the popover content");
    });

    QUnit.test("addMessage pushes the message and updates the model", function (assert) {
        var oRefreshSpy = this.sandbox.spy(this.oMessageModel, "refresh");
        var oMessage = {
            type: "Error",
            title: "Something failed",
            description: "A backend error occurred",
            subtitle: "Backend",
            counter: 1
        };

        this.oService.addMessage(oMessage);

        assert.strictEqual(this.oService._aMessages.length, 1, "internal message array contains one message");
        assert.strictEqual(this.oService._aMessages[0], oMessage, "the exact message object was stored");
        assert.deepEqual(this.oMessageModel.getData(), [oMessage], "model data reflects the added message");
        assert.ok(oRefreshSpy.calledWith(true), "model refresh(true) was triggered");

        var oSecondMessage = { type: "Warning", title: "Heads up" };
        this.oService.addMessage(oSecondMessage);

        assert.strictEqual(this.oService._aMessages.length, 2, "second message was appended");
        assert.deepEqual(this.oMessageModel.getData(), [oMessage, oSecondMessage], "model data contains both messages in order");
    });

    QUnit.test("deleteMessages clears all messages and updates the model", function (assert) {
        this.oService.addMessage({ type: "Error", title: "First" });
        this.oService.addMessage({ type: "Information", title: "Second" });
        assert.strictEqual(this.oService._aMessages.length, 2, "precondition: two messages exist");

        var oRefreshSpy = this.sandbox.spy(this.oMessageModel, "refresh");

        this.oService.deleteMessages();

        assert.deepEqual(this.oService._aMessages, [], "internal message array is empty after deleteMessages");
        assert.deepEqual(this.oMessageModel.getData(), [], "model data is empty after deleteMessages");
        assert.ok(oRefreshSpy.calledWith(true), "model refresh(true) was triggered");
    });

    QUnit.test("toggleMessageView navigates back and opens the popover by the event source", function (assert) {
        var oNavigateBackStub = this.sandbox.stub(this.oService._oMessageView, "navigateBack");
        var oOpenByStub = this.sandbox.stub(this.oService._oPopover, "openBy");
        var oSource = { id: "fakeOpener" };
        var oEvent = {
            getSource: function () {
                return oSource;
            }
        };

        this.oService.toggleMessageView(oEvent);

        assert.strictEqual(oNavigateBackStub.callCount, 1, "navigateBack was called exactly once on the MessageView");
        assert.strictEqual(oOpenByStub.callCount, 1, "openBy was called exactly once on the Popover");
        assert.ok(oOpenByStub.calledWith(oSource), "popover is opened by the source control of the event");
    });
});
