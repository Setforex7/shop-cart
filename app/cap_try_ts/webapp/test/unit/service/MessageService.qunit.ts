import QUnit from "sap/ui/thirdparty/qunit-2";
// @ts-ignore - sap/ui/thirdparty/sinon (sinon 1.17) ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageView from "sap/m/MessageView";
import Popover from "sap/m/Popover";
import Button from "sap/m/Button";
import MessageService from "cap_try_ts/service/MessageService";

QUnit.module("cap_try_ts/service/MessageService", {
	beforeEach: function (this: any) {
		const oModel = new JSONModel();
		this.oModel = oModel;
		this.oController = {
			getOwnerComponent: () => ({
				getModel: (sName: string) => (sName === "messageModel" ? oModel : null)
			}),
			getI18nText: (sKey: string) => sKey
		};
		this.oService = (MessageService as any).init(this.oController);
	},
	afterEach: function (this: any) {
		if (this.oService && this.oService._oPopover) {
			this.oService._oPopover.destroy();
		}
		if (this.oModel) {
			this.oModel.destroy();
		}
		if (this.oSandbox) {
			this.oSandbox.restore();
		}
	}
});

QUnit.test("init builds the service instance and its controls", function (this: any, assert: any) {
	assert.ok(this.oService, "init returns an instance");
	assert.notStrictEqual(this.oService, MessageService, "instance is created via Object.create");
	assert.deepEqual(this.oService._aMessages, [], "message buffer starts empty");
	assert.strictEqual(this.oService._oController, this.oController, "controller reference is stored");
	assert.ok(this.oService._oMessageView instanceof MessageView, "a MessageView is created");
	assert.ok(this.oService._oPopover instanceof Popover, "a Popover is created");
});

QUnit.test("addMessage appends a message and syncs the model", function (this: any, assert: any) {
	const oMessage = { type: "Error", title: "Something failed" };
	this.oService.addMessage(oMessage);
	assert.strictEqual(this.oService._aMessages.length, 1, "one message is buffered");
	assert.strictEqual(this.oService._aMessages[0], oMessage, "the pushed message is stored");
	assert.deepEqual(this.oModel.getData(), this.oService._aMessages, "model data mirrors the buffer");
});

QUnit.test("deleteMessages clears the buffer and the model", function (this: any, assert: any) {
	this.oService.addMessage({ title: "first" });
	this.oService.addMessage({ title: "second" });
	assert.strictEqual(this.oService._aMessages.length, 2, "two messages buffered before delete");
	this.oService.deleteMessages();
	assert.strictEqual(this.oService._aMessages.length, 0, "buffer is emptied");
	assert.deepEqual(this.oModel.getData(), [], "model data is emptied");
});

QUnit.test("toggleMessageView navigates back and opens the popover by the event source", function (this: any, assert: any) {
	this.oSandbox = sinon.sandbox.create();
	const oNavStub = this.oSandbox.stub(this.oService._oMessageView, "navigateBack");
	const oOpenStub = this.oSandbox.stub(this.oService._oPopover, "openBy");
	const oButton = new Button();
	const oEvent = { getSource: () => oButton };
	this.oService.toggleMessageView(oEvent as any);
	assert.ok(oNavStub.calledOnce, "navigateBack is invoked once");
	assert.ok(oOpenStub.calledOnce, "openBy is invoked once");
	assert.strictEqual(oOpenStub.firstCall.args[0], oButton, "popover opens by the event source");
	oButton.destroy();
});
