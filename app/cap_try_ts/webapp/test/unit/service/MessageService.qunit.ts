// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageView from "sap/m/MessageView";
import Popover from "sap/m/Popover";
import Button from "sap/m/Button";
import type Event from "sap/ui/base/Event";
import type BaseController from "cap_try_ts/controller/BaseController";
import MessageServiceModule from "cap_try_ts/service/MessageService";

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

const MessageService = MessageServiceModule as unknown as MessageServiceInstance;

QUnit.module("service/MessageService", {
    beforeEach: function (this: any) {
        this.sandbox = sinon.sandbox.create();

        this.oMessageModel = new JSONModel();

        this.oOwnerComponent = {
            getModel: this.sandbox.stub().returns(this.oMessageModel)
        };

        this.oFakeController = {
            getOwnerComponent: this.sandbox.stub().returns(this.oOwnerComponent),
            getI18nText: this.sandbox.stub().returns("Text")
        };

        this.oInstance = MessageService.init(this.oFakeController as unknown as BaseController);
    },
    afterEach: function (this: any) {
        this.sandbox.restore();
        this.oInstance._oPopover.destroy();
        this.oMessageModel.destroy();
    }
});

QUnit.test("init should build a message view and popover bound to an empty message list", function (this: any, assert: any) {
    assert.ok(this.oInstance._oMessageView instanceof MessageView, "MessageView instance was created");
    assert.ok(this.oInstance._oPopover instanceof Popover, "Popover instance was created");
    assert.strictEqual(this.oInstance._oController, this.oFakeController, "Controller reference was stored");
    assert.deepEqual(this.oInstance._aMessages, [], "Message array starts empty");
    assert.deepEqual(this.oMessageModel.getData(), [], "Message model data starts empty");
    assert.strictEqual(this.oInstance._oMessageView.getModel(), this.oMessageModel, "Message model was set on the MessageView");
});

QUnit.test("addMessage should append the message and refresh the message model", function (this: any, assert: any) {
    const oRefreshSpy = this.sandbox.spy(this.oMessageModel, "refresh");
    const oMessage = { type: "Error", title: "Something failed" };

    this.oInstance.addMessage(oMessage);

    assert.strictEqual(this.oInstance._aMessages.length, 1, "Message array has one entry");
    assert.strictEqual(this.oInstance._aMessages[0], oMessage, "Pushed message is stored");
    assert.deepEqual(this.oMessageModel.getData(), [oMessage], "Model data reflects the new message");
    assert.ok(oRefreshSpy.calledWith(true), "Model refresh was called with forced update");
});

QUnit.test("deleteMessages should clear all stored messages and refresh the message model", function (this: any, assert: any) {
    this.oInstance.addMessage({ type: "Error", title: "First" });
    this.oInstance.addMessage({ type: "Warning", title: "Second" });

    this.oInstance.deleteMessages();

    assert.strictEqual(this.oInstance._aMessages.length, 0, "Message array is empty after deletion");
    assert.deepEqual(this.oMessageModel.getData(), [], "Model data is empty after deletion");
});

QUnit.test("toggleMessageView should navigate the message view back and open the popover by the event source", function (this: any, assert: any) {
    const oNavigateBackStub = this.sandbox.stub(this.oInstance._oMessageView, "navigateBack");
    const oOpenByStub = this.sandbox.stub(this.oInstance._oPopover, "openBy");
    const oSourceButton = new Button();
    const oFakeEvent = {
        getSource: function () {
            return oSourceButton;
        }
    } as unknown as Event;

    this.oInstance.toggleMessageView(oFakeEvent);

    assert.ok(oNavigateBackStub.calledOnce, "MessageView navigateBack was called");
    assert.ok(oOpenByStub.calledOnce, "Popover openBy was called");
    assert.ok(oOpenByStub.calledWith(oSourceButton), "Popover openBy was called with the event source control");

    oSourceButton.destroy();
});
