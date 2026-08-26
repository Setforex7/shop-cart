/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore -- "sap/ui/thirdparty/sinon" is a real runtime module but ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";
import MessageService from "cap_try_ts/service/MessageService";
import JSONModel from "sap/ui/model/json/JSONModel";
import Button from "sap/m/Button";
import MessageView from "sap/m/MessageView";
import Popover from "sap/m/Popover";

interface SpyCall {
    args: unknown[];
}

interface Spy {
    calledOnce: boolean;
    firstCall: SpyCall;
    calledWith(...aArgs: unknown[]): boolean;
}

interface Sandbox {
    spy(oObject: object, sMethod: string): Spy;
    stub(oObject: object, sMethod: string): Spy;
    restore(): void;
}

interface MessageServiceInstance {
    _aMessages: object[];
    _oController: unknown;
    _oMessageView: MessageView;
    _oPopover: Popover;
    init(oController: unknown): MessageServiceInstance;
    addMessage(oMessage: object): void;
    deleteMessages(): void;
    toggleMessageView(oEvent: unknown): void;
}

QUnit.module("cap_try_ts/service/MessageService", {
    beforeEach: function (this: {
        sandbox: Sandbox;
        oMessageModel: JSONModel;
        oComponent: { getModel: (sName?: string) => JSONModel };
        oController: unknown;
        oService: MessageServiceInstance;
        oSourceButton: Button;
    }) {
        this.sandbox = sinon.sandbox.create() as Sandbox;

        this.oMessageModel = new JSONModel([]);

        const oMessageModel = this.oMessageModel;
        this.oComponent = {
            getModel: function (): JSONModel {
                return oMessageModel;
            }
        };

        const oComponent = this.oComponent;
        this.oController = {
            getOwnerComponent: function (): unknown {
                return oComponent;
            },
            getI18nText: function (sKey: string): string {
                return "i18n:" + sKey;
            }
        };

        this.oService = (MessageService as unknown as MessageServiceInstance).init(this.oController);
        this.oSourceButton = new Button({ text: "source" });
    },
    afterEach: function (this: {
        sandbox: Sandbox;
        oMessageModel: JSONModel;
        oService: MessageServiceInstance;
        oSourceButton: Button;
    }) {
        if (this.oService) {
            if (this.oService._oPopover) {
                this.oService._oPopover.destroy();
            }
            if (this.oService._oMessageView) {
                this.oService._oMessageView.destroy();
            }
        }
        if (this.oSourceButton) {
            this.oSourceButton.destroy();
        }
        if (this.oMessageModel) {
            this.oMessageModel.destroy();
        }
        this.sandbox.restore();
    }
});

QUnit.test("init creates an instance with its own state and controls", function (this: {
    oService: MessageServiceInstance;
    oController: unknown;
    oMessageModel: JSONModel;
}, assert: Assert) {
    assert.ok(this.oService, "init returned an instance");
    assert.notStrictEqual(this.oService, MessageService, "the instance is not the module singleton itself");
    assert.deepEqual(this.oService._aMessages, [], "the message buffer starts empty");
    assert.strictEqual(this.oService._oController, this.oController, "the controller reference is stored");
    assert.ok(this.oService._oMessageView instanceof MessageView, "a MessageView was created");
    assert.ok(this.oService._oPopover instanceof Popover, "a Popover was created");
    assert.strictEqual(this.oService._oMessageView.getModel(), this.oMessageModel, "the messageModel is set on the MessageView");
    assert.strictEqual(this.oService._oPopover.getContent()[0], this.oService._oMessageView, "the MessageView is the popover content");
});

QUnit.test("init produces independent instances", function (this: {
    oService: MessageServiceInstance;
    oController: unknown;
}, assert: Assert) {
    const oOther: MessageServiceInstance = (MessageService as unknown as MessageServiceInstance).init(this.oController);

    this.oService.addMessage({ title: "only on first" });

    assert.strictEqual(this.oService._aMessages.length, 1, "the first instance holds one message");
    assert.strictEqual(oOther._aMessages.length, 0, "the second instance is unaffected");

    oOther._oPopover.destroy();
    oOther._oMessageView.destroy();
});

QUnit.test("addMessage appends the message and refreshes the model", function (this: {
    sandbox: Sandbox;
    oService: MessageServiceInstance;
    oMessageModel: JSONModel;
}, assert: Assert) {
    const oSetData: Spy = this.sandbox.spy(this.oMessageModel, "setData");
    const oRefresh: Spy = this.sandbox.spy(this.oMessageModel, "refresh");
    const oMessage = { type: "Error", title: "Boom" };

    this.oService.addMessage(oMessage);

    assert.strictEqual(this.oService._aMessages.length, 1, "one message is buffered");
    assert.strictEqual(this.oService._aMessages[0], oMessage, "the given message object is stored");
    assert.ok(oSetData.calledOnce, "setData was called once");
    assert.strictEqual(oSetData.firstCall.args[0], this.oService._aMessages, "setData received the message buffer");
    assert.ok(oRefresh.calledWith(true), "refresh(true) was called");
});

QUnit.test("addMessage keeps previously added messages in order", function (this: {
    oService: MessageServiceInstance;
}, assert: Assert) {
    const oFirst = { title: "first" };
    const oSecond = { title: "second" };

    this.oService.addMessage(oFirst);
    this.oService.addMessage(oSecond);

    assert.strictEqual(this.oService._aMessages.length, 2, "both messages are buffered");
    assert.deepEqual(this.oService._aMessages, [oFirst, oSecond], "insertion order is preserved");
});

QUnit.test("deleteMessages clears the buffer and refreshes the model", function (this: {
    sandbox: Sandbox;
    oService: MessageServiceInstance;
    oMessageModel: JSONModel;
}, assert: Assert) {
    this.oService.addMessage({ title: "one" });
    this.oService.addMessage({ title: "two" });

    const oSetData: Spy = this.sandbox.spy(this.oMessageModel, "setData");
    const oRefresh: Spy = this.sandbox.spy(this.oMessageModel, "refresh");

    this.oService.deleteMessages();

    assert.deepEqual(this.oService._aMessages, [], "the message buffer is empty");
    assert.ok(oSetData.calledOnce, "setData was called once");
    assert.deepEqual(oSetData.firstCall.args[0], [], "setData received an empty array");
    assert.ok(oRefresh.calledWith(true), "refresh(true) was called");
});

QUnit.test("toggleMessageView navigates back and opens the popover by the event source", function (this: {
    sandbox: Sandbox;
    oService: MessageServiceInstance;
    oSourceButton: Button;
}, assert: Assert) {
    const oNavigateBack: Spy = this.sandbox.stub(this.oService._oMessageView, "navigateBack");
    const oOpenBy: Spy = this.sandbox.stub(this.oService._oPopover, "openBy");

    const oSourceButton = this.oSourceButton;
    const oEvent = {
        getSource: function (): Button {
            return oSourceButton;
        }
    };

    this.oService.toggleMessageView(oEvent);

    assert.ok(oNavigateBack.calledOnce, "navigateBack was called once");
    assert.ok(oOpenBy.calledOnce, "openBy was called once");
    assert.strictEqual(oOpenBy.firstCall.args[0], oSourceButton, "openBy received the event source control");
});
