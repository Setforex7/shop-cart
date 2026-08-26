import models from "cap_try_ts/model/models";
import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

QUnit.module("cap_try_ts/model/models", {
	beforeEach(this: { oModel: JSONModel | null }) {
		this.oModel = null;
	},
	afterEach(this: { oModel: JSONModel | null }) {
		if (this.oModel) {
			this.oModel.destroy();
			this.oModel = null;
		}
	}
});

QUnit.test("createDeviceModel returns a JSONModel instance", function (this: { oModel: JSONModel | null }, assert: Assert) {
	// Act
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	// Assert
	assert.ok(oModel, "A model was returned");
	assert.ok(oModel instanceof JSONModel, "The returned model is a JSONModel");
});

QUnit.test("createDeviceModel uses OneWay as default binding mode", function (this: { oModel: JSONModel | null }, assert: Assert) {
	// Act
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	// Assert
	assert.strictEqual(oModel.getDefaultBindingMode(), "OneWay", "The default binding mode is OneWay");
});

QUnit.test("createDeviceModel exposes the Device data", function (this: { oModel: JSONModel | null }, assert: Assert) {
	// Act
	const oModel = models.createDeviceModel();
	this.oModel = oModel;

	// Assert
	assert.strictEqual(oModel.getData(), Device, "The model data is the sap/ui/Device object");
	assert.deepEqual(oModel.getProperty("/support"), Device.support, "Device support information is readable via the model");
});

QUnit.test("createDeviceModel returns a new model on every call", function (this: { oModel: JSONModel | null }, assert: Assert) {
	// Act
	const oFirstModel = models.createDeviceModel();
	const oSecondModel = models.createDeviceModel();
	this.oModel = oFirstModel;

	// Assert
	assert.notStrictEqual(oFirstModel, oSecondModel, "Two separate model instances are created");
	assert.strictEqual(oSecondModel.getDefaultBindingMode(), "OneWay", "The second model also uses OneWay binding mode");

	// Cleanup of the additional instance
	oSecondModel.destroy();
});
