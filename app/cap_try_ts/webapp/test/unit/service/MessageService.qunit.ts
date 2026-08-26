// @ts-ignore - the bundled UI5 sinon ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import JSONModel from "sap/ui/model/json/JSONModel";
import Button from "sap/m/Button";
import MessageView from "sap/m/MessageView";
import Popover from "sap/m/Popover";
import MessageService from "cap_try_ts/service/MessageService";

type ControllerLike = Parameters<typeof MessageService.init>[0];
type ServiceInstance = ReturnType<typeof MessageService.init>;
type EventLike = Parameters<typeof MessageService.toggleMessageView>[0];

// The module object is the factory itself, but its `init` declares a `this` of the
// instance type. Calling it through this alias keeps the runtime receiver identical
// (it is the very same object) while satisfying the compiler.
interface IMessageServiceModule {
    init(oController: ControllerLike): ServiceInstance;
}

const oMessageServiceModule: IMessageServiceModule = MessageService as unknown as IMessageServiceModule;

interface StubCall {
    args: unknown[];
}

interface Stub {
    (...args: unknown[]): unknown;
    callCount: number;
    args: unknown[][];
    firstCall: StubCall;
    returns(vValue: unknown): Stub;
    withArgs(...args: unknown[]): Stub;
}

interface Sandbox {
    restore(): void;
    stub(oObject: object, sMethod: string): Stub;
    spy(oObject: object, sMethod: string): Stub;
}

interface RawController {
    getOwnerComponent(): { getModel(sName: string): JSONModel };
    getI18nText(sKey: string): string;
}

interface TestContext {
    oSandbox: Sandbox;
    oMessageModel: JSONModel;
    oRawController: RawController;
    oController: ControllerLike;
    oService: ServiceInstance;
}

QUnit.module("cap_try_ts.service.MessageService", {
    beforeEach: function (this: TestContext): void {
        this.oSandbox = sinon.sandbox.create() as Sandbox;
        this.oMessageModel = new JSONModel([]);

        const oMessageModel: JSONModel = this.oMessageModel;

        this.oRawController = {
            getOwnerComponent: function (): { getModel(sName: string): JSONModel } {
                return {
                    getModel: function (): JSONModel {
                        return oMessageModel;
                    }
                };
            },
            getI18nText: function (sKey: string): string {
                return "i18n:" + sKey;
            }
        };
        this.oController = this.oRawController as unknown as ControllerLike;

        this.oService = oMessageServiceModule.init(this.oController);
    },
    afterEach: function (this: TestContext): void {
        this.oSandbox.restore();

        if (this.oService) {
            const oPopover: Popover = this.oService._oPopover;
            if (oPopover && !oPopover.isDestroyed()) {
                oPopover.destroy();
            }
            const oMessageView: MessageView = this.oService._oMessageView;
            if (oMessageView && !oMessageView.isDestroyed()) {
                oMessageView.destroy();
            }
        }

        this.oMessageModel.destroy();
    }
});

QUnit.test("init - returns a new instance wired to the controller", function (this: TestContext, assert: Assert) {
    assert.ok(this.oService, "init returned an instance");
    assert.notStrictEqual(this.oService as unknown, MessageService as unknown, "the instance is not the module singleton itself");
    assert.strictEqual(this.oService._oController as unknown, this.oController as unknown, "the controller is stored on the instance");
    assert.deepEqual(this.oService._aMessages, [] as object[], "the message buffer starts empty");
});

QUnit.test("init - creates the MessageView and the Popover controls", function (this: TestContext, assert: Assert) {
    const oMessageView: MessageView = this.oService._oMessageView;
    const oPopover: Popover = this.oService._oPopover;

    assert.ok(oMessageView instanceof MessageView, "a MessageView was created");
    assert.ok(oPopover instanceof Popover, "a Popover was created");
    assert.strictEqual(oMessageView.getShowDetailsPageHeader(), false, "the details page header is hidden");
    assert.strictEqual(oPopover.getContentWidth(), "440px", "the popover width is configured");
    assert.strictEqual(oPopover.getContentHeight(), "440px", "the popover height is configured");
    assert.strictEqual(oPopover.getModal(), true, "the popover is modal");
    assert.strictEqual(oPopover.getVerticalScrolling(), false, "vertical scrolling is switched off");
    assert.strictEqual(oPopover.getContent()[0] as unknown, oMessageView as unknown, "the MessageView is the popover content");
    assert.ok(oPopover.getCustomHeader(), "the popover has a custom header");
    assert.ok(oPopover.getFooter(), "the popover has a footer");
});

QUnit.test("init - assigns the messageModel of the owner component to the MessageView", function (this: TestContext, assert: Assert) {
    const oMessageView: MessageView = this.oService._oMessageView;

    assert.strictEqual(oMessageView.getModel() as unknown, this.oMessageModel as unknown, "the messageModel is set on the MessageView");
    assert.deepEqual((oMessageView.getModel() as JSONModel).getData() as object[], [] as object[], "the model data was initialized with the empty buffer");
});

QUnit.test("init - resolves the header texts through the controller i18n helper", function (this: TestContext, assert: Assert) {
    const oSpy: Stub = this.oSandbox.spy(this.oRawController, "getI18nText");

    const oService: ServiceInstance = oMessageServiceModule.init(this.oController);
    const aKeys: unknown[] = oSpy.args.map(function (aArgs: unknown[]): unknown {
        return aArgs[0];
    });

    assert.ok(aKeys.indexOf("close") > -1, "the close text was requested");
    assert.ok(aKeys.indexOf("messages") > -1, "the messages title was requested");

    oService._oPopover.destroy();
});

QUnit.test("addMessage - appends the message and refreshes the model", function (this: TestContext, assert: Assert) {
    const oModel: JSONModel = this.oService._oMessageView.getModel() as JSONModel;
    const oRefreshSpy: Stub = this.oSandbox.spy(oModel, "refresh");
    const oMessage = { type: "Error", title: "Boom" };

    this.oService.addMessage(oMessage);

    assert.strictEqual(this.oService._aMessages.length, 1, "one message is buffered");
    assert.strictEqual(this.oService._aMessages[0] as unknown, oMessage as unknown, "the buffered message is the one passed in");
    assert.deepEqual(oModel.getData() as object[], [oMessage] as object[], "the model data holds the message");
    assert.strictEqual(oRefreshSpy.callCount, 1, "the model was refreshed once");
    assert.strictEqual(oRefreshSpy.firstCall.args[0], true, "the refresh was forced");
});

QUnit.test("addMessage - keeps previously added messages", function (this: TestContext, assert: Assert) {
    const oFirst = { title: "first" };
    const oSecond = { title: "second" };

    this.oService.addMessage(oFirst);
    this.oService.addMessage(oSecond);

    assert.deepEqual(this.oService._aMessages, [oFirst, oSecond] as object[], "both messages are buffered in order");

    const oModel: JSONModel = this.oService._oMessageView.getModel() as JSONModel;
    assert.strictEqual((oModel.getData() as object[]).length, 2, "the model exposes both messages");
});

QUnit.test("deleteMessages - clears the buffer and the model", function (this: TestContext, assert: Assert) {
    const oModel: JSONModel = this.oService._oMessageView.getModel() as JSONModel;

    this.oService.addMessage({ title: "to be removed" });

    const oRefreshSpy: Stub = this.oSandbox.spy(oModel, "refresh");

    this.oService.deleteMessages();

    assert.strictEqual(this.oService._aMessages.length, 0, "the buffer is empty");
    assert.deepEqual(oModel.getData() as object[], [] as object[], "the model data is empty");
    assert.strictEqual(oRefreshSpy.callCount, 1, "the model was refreshed once");
});

QUnit.test("toggleMessageView - navigates back and opens the popover by the event source", function (this: TestContext, assert: Assert) {
    const oNavigateBackStub: Stub = this.oSandbox.stub(this.oService._oMessageView, "navigateBack");
    const oOpenByStub: Stub = this.oSandbox.stub(this.oService._oPopover, "openBy");
    const oSource = new Button({ text: "trigger" });
    const oEvent = {
        getSource: function (): Button {
            return oSource;
        }
    } as unknown as EventLike;

    this.oService.toggleMessageView(oEvent);

    assert.strictEqual(oNavigateBackStub.callCount, 1, "the MessageView navigated back");
    assert.strictEqual(oOpenByStub.callCount, 1, "the popover was opened once");
    assert.strictEqual(oOpenByStub.firstCall.args[0] as unknown, oSource as unknown, "the popover was opened by the event source");

    oSource.destroy();
});
