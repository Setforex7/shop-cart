import QUnit from "sap/ui/thirdparty/qunit-2";
// @ts-ignore - sap/ui/thirdparty/sinon (sinon 1.17) ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import ProductService from "cap_try_ts/service/ProductService";

let oSandbox: any;
let oController: any;
let oModel: any;
let oListBinding: any;
let oCreatedContext: any;
let oView: any;
let oDialogHandler: any;
let oMessageBoxSuccess: any;
let oMessageBoxError: any;
let oMessageToastShow: any;

QUnit.module("cap_try_ts/service/ProductService", {
  beforeEach: function () {
    oSandbox = sinon.sandbox.create();
    oMessageBoxSuccess = oSandbox.stub(MessageBox, "success");
    oMessageBoxError = oSandbox.stub(MessageBox, "error");
    oMessageToastShow = oSandbox.stub(MessageToast, "show");

    oCreatedContext = {
      getObject: sinon.stub().returns({ name: "Widget" }),
      created: sinon.stub().returns(Promise.resolve())
    };
    oListBinding = {
      create: sinon.stub().returns(oCreatedContext)
    };
    oModel = {
      bindList: sinon.stub().returns(oListBinding),
      submitBatch: sinon.stub().returns(Promise.resolve())
    };
    oView = {
      bindElement: sinon.stub(),
      setBusy: sinon.stub()
    };
    oDialogHandler = {
      _closeAddProductDialog: sinon.stub()
    };
    oController = {
      getModel: sinon.stub().returns(oModel),
      getView: sinon.stub().returns(oView),
      getProp: sinon.stub().returns({ ID: "C1" }),
      setProp: sinon.stub(),
      getI18nText: sinon.stub().returns("text"),
      _addMessage: sinon.stub(),
      getDialogHandler: sinon.stub().returns(oDialogHandler)
    };
  },
  afterEach: function () {
    oSandbox.restore();
  }
});

QUnit.test("create() creates a product, notifies and reloads", async function (assert) {
  const oProduct: any = {
    name: "Widget",
    description: "A widget",
    company_ID: "C1",
    price: 10,
    stock_min: 1,
    stock: 5
  };

  await ProductService.create(oController, oProduct);

  assert.ok(oModel.bindList.calledWith("/Products"), "bindList was called for /Products");
  assert.ok(oListBinding.create.calledWith(oProduct), "the product was created on the list binding");
  assert.ok(oCreatedContext.created.calledOnce, "created() was awaited");
  assert.ok(oController._addMessage.calledOnce, "a success message was added");
  assert.ok(oMessageBoxSuccess.calledOnce, "MessageBox.success was shown");
  assert.ok(oController.setProp.calledWith("globalModel", "/product"), "the product draft was reset");
  assert.ok(oDialogHandler._closeAddProductDialog.calledOnce, "the add product dialog was closed");
  assert.ok(oView.bindElement.called, "the company element was rebound (loadByCompany)");
});

QUnit.test("createBatch() creates every product in one batch and reloads", async function (assert) {
  const aProducts: any[] = [{ name: "A" }, { name: "B" }];

  await ProductService.createBatch(oController, aProducts);

  assert.ok(oModel.bindList.calledWith("/Products"), "bindList was called for /Products");
  assert.strictEqual(oListBinding.create.callCount, 2, "create() was called once per product");
  assert.strictEqual(aProducts[0].company_ID, "C1", "the selected company ID was assigned to each product");
  assert.ok(oModel.submitBatch.calledWith("editProducts"), "the editProducts batch was submitted");
  assert.ok(oMessageToastShow.calledOnce, "an upload success toast was shown");
  assert.ok(oView.bindElement.called, "the company element was rebound (loadByCompany)");
});

QUnit.test("edit() writes every property and submits the update batch", async function (assert) {
  const oMetadata: any = { setProperty: sinon.stub() };
  const oProduct: any = {
    metadata: oMetadata,
    name: "Name",
    description: "Desc",
    price: 9,
    stock: 3,
    stock_min: 1
  };

  await ProductService.edit(oController, oProduct);

  assert.strictEqual(oMetadata.setProperty.callCount, 5, "all five editable properties were set");
  assert.ok(oMetadata.setProperty.calledWith("name", "Name"), "the name property was updated");
  assert.ok(oModel.submitBatch.calledWith("updateProducts"), "the updateProducts batch was submitted");
  assert.ok(oController._addMessage.calledOnce, "a success message was added");
});

QUnit.test("delete() removes a single product and reloads", async function (assert) {
  const oProduct: any = {
    getObject: sinon.stub().returns({ name: "X" }),
    delete: sinon.stub().returns(Promise.resolve())
  };

  await ProductService.delete(oController, oProduct);

  assert.ok(oProduct.delete.calledWith("$auto"), "the product was deleted with the $auto group");
  assert.ok(oMessageToastShow.calledOnce, "a delete success toast was shown");
  assert.ok(oView.bindElement.called, "the company element was rebound (loadByCompany)");
});

QUnit.test("loadByCompany() binds the selected company and clears busy state", function (assert) {
  ProductService.loadByCompany(oController);

  assert.ok(oController.getProp.calledWith("globalModel", "/selectedCompany"), "the selected company was read");
  assert.ok(oView.bindElement.calledWith({ path: "/Company('C1')" }), "the company element path was bound");
  assert.ok(oView.setBusy.calledWith(false), "the busy state was cleared");
});
