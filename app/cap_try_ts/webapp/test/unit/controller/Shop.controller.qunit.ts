import Shop from "cap_try_ts/controller/Shop.controller";
import ProductService from "cap_try_ts/service/ProductService";
import CartService from "cap_try_ts/service/CartService";
import FileService from "cap_try_ts/service/FileService";
import Fragment from "sap/ui/core/Fragment";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import { URLHelper } from "sap/m/library";
import JSONModel from "sap/ui/model/json/JSONModel";
import View from "sap/ui/core/mvc/View";
import Table from "sap/m/Table";
import ComboBox from "sap/m/ComboBox";
import SearchField from "sap/m/SearchField";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - UI5 ships sinon 1.17 as a plain AMD module without type declarations
import sinon from "sap/ui/thirdparty/sinon";

type AnyObject = Record<string, unknown>;

interface StubLike {
	callCount: number;
	firstCall: { args: unknown[] };
	secondCall: { args: unknown[] };
	calledWith(...args: unknown[]): boolean;
	returns(vValue: unknown): StubLike;
	withArgs(...args: unknown[]): StubLike;
}

interface SandboxLike {
	stub(...args: unknown[]): StubLike;
	restore(): void;
}

interface TestShop extends Shop {
	[key: string]: unknown;
}

QUnit.module("Shop.controller", {
	beforeEach: function (this: AnyObject): void {
		const oSandbox = sinon.sandbox.create() as SandboxLike;
		this.sandbox = oSandbox;

		// --- global model state used by the controller -------------------
		const oGlobalModel = new JSONModel({
			selectedCart: {},
			selectedCompany: {},
			selectedProduct: {},
			cart: [],
			cartItemsQuantity: 0,
			product: {}
		});
		this.globalModel = oGlobalModel;

		// --- odata model double --------------------------------------------
		const oODataModel = {
			getServiceUrl: oSandbox.stub().returns("/shop/")
		};
		this.odataModel = oODataModel;

		// --- real controls (destroyed in afterEach) ----------------------
		const oProductsTable = new Table();
		const oCompanyComboBox = new ComboBox();
		const oSearchField = new SearchField();
		this.productsTable = oProductsTable;
		this.companyComboBox = oCompanyComboBox;
		this.searchField = oSearchField;

		// --- view double (View itself is abstract, so a plain double is used)
		const oView = {
			byId: function (sId: string): unknown {
				if (sId === "productsWorklist") {
					return oProductsTable;
				}
				if (sId === "companyComboBox") {
					return oCompanyComboBox;
				}
				return null;
			},
			getId: function (): string {
				return "shopView";
			},
			getModel: function (sName?: string): unknown {
				return sName === "globalModel" ? oGlobalModel : oODataModel;
			},
			setModel: function (): void {
				/* no-op */
			},
			getBindingContext: function (): unknown {
				return null;
			},
			bindElement: function (): void {
				/* no-op */
			},
			unbindElement: function (): void {
				/* no-op */
			},
			addDependent: function (): void {
				/* no-op */
			},
			removeDependent: function (): void {
				/* no-op */
			},
			setBusy: function (): void {
				/* no-op */
			},
			destroy: function (): void {
				/* no-op */
			}
		};
		this.view = oView;

		// --- dialog handler double ---------------------------------------
		const oDialogHandler = {
			_openAddProductDialog: oSandbox.stub(),
			_closeAddProductDialog: oSandbox.stub(),
			_openEditProductDialog: oSandbox.stub(),
			_closeEditProductDialog: oSandbox.stub(),
			_openCartDialog: oSandbox.stub().returns(Promise.resolve()),
			_closeCartDialog: oSandbox.stub()
		};
		this.dialogHandler = oDialogHandler;

		// --- router double -------------------------------------------------
		const oRoute = {
			attachPatternMatched: oSandbox.stub(),
			detachPatternMatched: oSandbox.stub()
		};
		const oRouter = {
			getRoute: oSandbox.stub().returns(oRoute)
		};
		this.route = oRoute;
		this.router = oRouter;

		// --- controller under test ------------------------------------------
		const oController = new Shop("cap_try_ts.controller.Shop") as TestShop;
		this.controller = oController;

		oSandbox.stub(oController, "getView").returns(oView as unknown as View);
		oSandbox.stub(oController, "getRouter").returns(oRouter);
		oSandbox.stub(oController, "getDialogHandler").returns(oDialogHandler);
		oSandbox.stub(oController, "getI18nText", function (sKey: string): string {
			return sKey;
		});
		oSandbox.stub(oController, "getModel", function (sName?: string): unknown {
			return sName === "globalModel" ? oGlobalModel : oODataModel;
		});
		oSandbox.stub(oController, "getProp", function (sModel: string, sPath: string): unknown {
			return oGlobalModel.getProperty(sPath);
		});
		oSandbox.stub(oController, "setProp", function (sModel: string, sPath: string, vValue: unknown): void {
			oGlobalModel.setProperty(sPath, vValue);
		});
		oSandbox.stub(oController, "_addMessage");

		// --- collaborators ----------------------------------------------------
		oSandbox.stub(ProductService, "create").returns(Promise.resolve());
		oSandbox.stub(ProductService, "edit");
		oSandbox.stub(ProductService, "delete").returns(Promise.resolve());
		oSandbox.stub(ProductService, "loadByCompany");
		oSandbox.stub(ProductService, "createBatch");
		oSandbox.stub(CartService, "finalize");
		oSandbox.stub(CartService, "create").returns(Promise.resolve());
		oSandbox.stub(CartService, "delete").returns(Promise.resolve());
		oSandbox.stub(CartService, "addProducts").returns(Promise.resolve());
		oSandbox.stub(CartService, "deleteItem").returns(Promise.resolve());
		oSandbox.stub(CartService, "assignOnCompanyLoad");
		oSandbox.stub(CartService, "bindDataToFragment");
		oSandbox.stub(FileService, "read");
		oSandbox.stub(MessageToast, "show");
		oSandbox.stub(MessageBox, "confirm");
		oSandbox.stub(URLHelper, "redirect");
		oSandbox.stub(Fragment, "byId").returns(null);
	},

	afterEach: function (this: AnyObject): void {
		(this.sandbox as SandboxLike).restore();
		(this.productsTable as Table).destroy();
		(this.companyComboBox as ComboBox).destroy();
		(this.searchField as SearchField).destroy();
		(this.globalModel as JSONModel).destroy();
		this.controller = null;
	}
});

function makeEvent(oSource: unknown, oParams?: AnyObject): unknown {
	return {
		getSource: function (): unknown {
			return oSource;
		},
		getParameter: function (sName: string): unknown {
			return oParams ? oParams[sName] : undefined;
		}
	};
}

function makeContext(oData: AnyObject, oExtra?: AnyObject): unknown {
	return Object.assign({
		getObject: function (): AnyObject {
			return oData;
		},
		setProperty: sinon.stub(),
		refresh: sinon.stub()
	}, oExtra || {});
}

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */
/* ------------------------------------------------------------------ */

QUnit.test("onInit attaches the Shop route pattern matched handler", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oLoadStub = (this.sandbox as SandboxLike).stub(oController, "_onControllerLoad");

	oController.onInit();

	assert.strictEqual(oLoadStub.callCount, 1, "_onControllerLoad was called once");
	assert.ok((this.router as AnyObject & { getRoute: StubLike }).getRoute.calledWith("Shop"), "the Shop route was requested");
	assert.strictEqual((this.route as AnyObject & { attachPatternMatched: StubLike }).attachPatternMatched.callCount, 1, "attachPatternMatched was called once");
});

QUnit.test("onExit detaches the Shop route pattern matched handler", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;

	oController.onExit();

	assert.ok((this.router as AnyObject & { getRoute: StubLike }).getRoute.calledWith("Shop"), "the Shop route was requested");
	assert.strictEqual((this.route as AnyObject & { detachPatternMatched: StubLike }).detachPatternMatched.callCount, 1, "detachPatternMatched was called once");
});

/* ------------------------------------------------------------------ */
/* excel template                                                      */
/* ------------------------------------------------------------------ */

QUnit.test("onDownloadTemplatePress redirects to the excel template service url", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;

	oController.onDownloadTemplatePress();

	const oRedirect = URLHelper.redirect as unknown as StubLike;
	assert.strictEqual(oRedirect.callCount, 1, "URLHelper.redirect was called once");
	assert.strictEqual(oRedirect.firstCall.args[0], "/shop/downloadExcelTemplate()/$value", "the download url is built from the service url");
	assert.strictEqual(oRedirect.firstCall.args[1], true, "the redirect opens in a new window");
});

QUnit.test("onUploadTemplatePress delegates the file to FileService.read", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oEvent = makeEvent(null);

	oController.onUploadTemplatePress(oEvent as never);

	const oRead = FileService.read as unknown as StubLike;
	assert.strictEqual(oRead.callCount, 1, "FileService.read was called once");
	assert.strictEqual(oRead.firstCall.args[0], oController, "the controller was passed through");
	assert.strictEqual(oRead.firstCall.args[1], oEvent, "the event was passed through");
	assert.strictEqual(typeof oRead.firstCall.args[2], "function", "a bound createBatch callback was passed");
});

/* ------------------------------------------------------------------ */
/* cart lifecycle                                                      */
/* ------------------------------------------------------------------ */

QUnit.test("onFinalizePurchasePress shows a toast when no cart is selected", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;

	oController.onFinalizePurchasePress();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "finalize_cart_selection_missing", "the missing selection text was used");
	assert.strictEqual((CartService.finalize as unknown as StubLike).callCount, 0, "CartService.finalize was not called");
});

QUnit.test("onFinalizePurchasePress finalizes the selected cart", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/selectedCart", makeContext({ ID: "cart-1" }));

	oController.onFinalizePurchasePress();

	const oFinalize = CartService.finalize as unknown as StubLike;
	assert.strictEqual(oFinalize.callCount, 1, "CartService.finalize was called once");
	assert.strictEqual(oFinalize.firstCall.args[1], "cart-1", "the selected cart ID was forwarded");
});

QUnit.test("onAddCartButtonPress creates a cart for the selected company", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1" });

	oController.onAddCartButtonPress();

	const oCreate = CartService.create as unknown as StubLike;
	assert.strictEqual(oCreate.callCount, 1, "CartService.create was called once");
	assert.strictEqual(oCreate.firstCall.args[1], "company-1", "the selected company ID was forwarded");
});

/* ------------------------------------------------------------------ */
/* product editing                                                     */
/* ------------------------------------------------------------------ */

QUnit.test("onEditProductPress stores the bound product and opens the edit dialog", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oProduct = { ID: "p-1", name: "Chair" };
	const oContext = makeContext(oProduct);
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	});

	oController.onEditProductPress(oEvent as never);

	const oSelected = (this.globalModel as JSONModel).getProperty("/selectedProduct") as AnyObject;
	assert.strictEqual(oSelected.name, "Chair", "the selected product was stored in the global model");
	assert.strictEqual(oSelected.metadata, oContext, "the binding context was kept as metadata");
	assert.strictEqual((this.dialogHandler as AnyObject & { _openEditProductDialog: StubLike })._openEditProductDialog.callCount, 1, "the edit product dialog was opened");
});

QUnit.test("onEditProduct saves the selected product and closes the dialog", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oProduct = { ID: "p-1", name: "Table" };
	(this.globalModel as JSONModel).setProperty("/selectedProduct", oProduct);

	oController.onEditProduct();

	const oEdit = ProductService.edit as unknown as StubLike;
	assert.strictEqual(oEdit.callCount, 1, "ProductService.edit was called once");
	assert.deepEqual(oEdit.firstCall.args[1], oProduct, "the selected product was forwarded");
	assert.strictEqual((this.dialogHandler as AnyObject & { _closeEditProductDialog: StubLike })._closeEditProductDialog.callCount, 1, "the edit product dialog was closed");
});

/* ------------------------------------------------------------------ */
/* product deletion                                                    */
/* ------------------------------------------------------------------ */

QUnit.test("onDeleteProductPress confirms and deletes the bound product on YES", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ name: "Lamp" });
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	});

	await oController.onDeleteProductPress(oEvent as never);

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a confirmation was requested");
	assert.strictEqual(oConfirm.firstCall.args[0], "delete_product", "the delete product text was used");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	const oDelete = ProductService.delete as unknown as StubLike;
	assert.strictEqual(oDelete.callCount, 1, "ProductService.delete was called after confirming");
	assert.strictEqual(oDelete.firstCall.args[1], oContext, "the product binding context was forwarded");
});

QUnit.test("onDeleteProductPress does not delete when the dialog is cancelled", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ name: "Lamp" });
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	});

	await oController.onDeleteProductPress(oEvent as never);

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.CANCEL as unknown as string);

	assert.strictEqual((ProductService.delete as unknown as StubLike).callCount, 0, "nothing was deleted on cancel");
});

QUnit.test("onDeleteMultiplesProductsPress warns when nothing is selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getSelectedContexts").returns([]);

	await oController.onDeleteMultiplesProductsPress();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "delete_product_null_selection", "the null selection text was used");
	assert.strictEqual((MessageBox.confirm as unknown as StubLike).callCount, 0, "no confirmation dialog was opened");
});

QUnit.test("onDeleteMultiplesProductsPress deletes all selected contexts on YES", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const aContexts = [makeContext({ ID: "p-1" }), makeContext({ ID: "p-2" })];
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getSelectedContexts").returns(aContexts);

	await oController.onDeleteMultiplesProductsPress();

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a confirmation was requested");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	const oDelete = ProductService.delete as unknown as StubLike;
	assert.strictEqual(oDelete.callCount, 1, "ProductService.delete was called once");
	assert.strictEqual((oDelete.firstCall.args[1] as unknown[]).length, 2, "both selected contexts were forwarded");
});

/* ------------------------------------------------------------------ */
/* cart item deletion                                                  */
/* ------------------------------------------------------------------ */

QUnit.test("onDeleteCartItemPress deletes the bound cart item on YES", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ name: "Desk" });
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	});

	await oController.onDeleteCartItemPress(oEvent as never);

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a confirmation was requested");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	const oDeleteItem = CartService.deleteItem as unknown as StubLike;
	assert.strictEqual(oDeleteItem.callCount, 1, "CartService.deleteItem was called once");
	assert.strictEqual(oDeleteItem.firstCall.args[1], oContext, "the cart item context was forwarded");
});

QUnit.test("onDeleteMultipleCartItemPress returns early when the cart table is missing", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;

	const vResult = await oController.onDeleteMultipleCartItemPress();

	assert.strictEqual(vResult, undefined, "the handler returned undefined");
	assert.strictEqual((MessageBox.confirm as unknown as StubLike).callCount, 0, "no confirmation dialog was opened");
	assert.strictEqual((MessageToast.show as unknown as StubLike).callCount, 0, "no toast was shown");
});

QUnit.test("onDeleteMultipleCartItemPress warns when no cart rows are selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oCartTable = {
		getSelectedIndices: function (): number[] {
			return [];
		},
		getContextByIndex: function (): unknown {
			return null;
		}
	};
	(Fragment.byId as unknown as StubLike).returns(oCartTable);

	await oController.onDeleteMultipleCartItemPress();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "delete_product_null_selection", "the null selection text was used");
});

QUnit.test("onDeleteMultipleCartItemPress deletes the selected cart rows on YES", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const aContexts = [makeContext({ ID: "ci-1" }), makeContext({ ID: "ci-2" })];
	const oCartTable = {
		getSelectedIndices: function (): number[] {
			return [0, 1];
		},
		getContextByIndex: function (iIndex: number): unknown {
			return aContexts[iIndex];
		}
	};
	(Fragment.byId as unknown as StubLike).returns(oCartTable);

	await oController.onDeleteMultipleCartItemPress();

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a confirmation was requested");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	const oDeleteItem = CartService.deleteItem as unknown as StubLike;
	assert.strictEqual(oDeleteItem.callCount, 1, "CartService.deleteItem was called once");
	assert.deepEqual(oDeleteItem.firstCall.args[1], aContexts, "both selected row contexts were forwarded");
});

QUnit.test("onDeleteSelectedCartPress warns when no cart is selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;

	await oController.onDeleteSelectedCartPress();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "delete_current_cart_selection_missing", "the missing selection text was used");
	assert.strictEqual((CartService.delete as unknown as StubLike).callCount, 0, "no cart was deleted");
});

QUnit.test("onDeleteSelectedCartPress deletes the selected cart on YES", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oCart = { ID: "cart-9", name: "Cart 9" };
	(this.globalModel as JSONModel).setProperty("/selectedCart", oCart);

	await oController.onDeleteSelectedCartPress();

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a confirmation was requested");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	const oDelete = CartService.delete as unknown as StubLike;
	assert.strictEqual(oDelete.callCount, 1, "CartService.delete was called once");
	assert.deepEqual(oDelete.firstCall.args[1], oCart, "the selected cart was forwarded");
});

/* ------------------------------------------------------------------ */
/* add products to cart                                                */
/* ------------------------------------------------------------------ */

QUnit.test("addProductCart warns when no products are selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getSelectedItems").returns([]);

	await oController.addProductCart();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "add_product_null_selection", "the null selection text was used");
	assert.strictEqual((oController._addMessage as unknown as StubLike).callCount, 1, "a warning message was added");
	assert.strictEqual((CartService.addProducts as unknown as StubLike).callCount, 0, "no products were added");
});

QUnit.test("addProductCart adds the selected products to an existing cart", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1", name: "ACME" });
	(this.globalModel as JSONModel).setProperty("/selectedCart", { ID: "cart-1" });

	const aItems = [
		{
			getBindingContext: function (): unknown {
				return makeContext({ ID: "p-1" });
			}
		},
		{
			getBindingContext: function (): unknown {
				return makeContext({ ID: "p-2" });
			}
		}
	];
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getSelectedItems").returns(aItems);
	const oRemoveSelections = (this.sandbox as SandboxLike).stub(this.productsTable as Table, "removeSelections");

	await oController.addProductCart();

	const oAddProducts = CartService.addProducts as unknown as StubLike;
	assert.strictEqual(oAddProducts.callCount, 1, "CartService.addProducts was called once");
	assert.deepEqual(oAddProducts.firstCall.args[1], ["p-1", "p-2"], "the selected product IDs were forwarded");
	assert.strictEqual(oRemoveSelections.callCount, 1, "the table selection was cleared");
});

QUnit.test("addProductCart asks to create a cart when none is selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1", name: "ACME" });

	const aItems = [
		{
			getBindingContext: function (): unknown {
				return makeContext({ ID: "p-1" });
			}
		}
	];
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getSelectedItems").returns(aItems);
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "removeSelections");

	await oController.addProductCart();

	const oConfirm = MessageBox.confirm as unknown as StubLike;
	assert.strictEqual(oConfirm.callCount, 1, "a create-cart confirmation was requested");
	assert.strictEqual(oConfirm.firstCall.args[0], "create_cart_confirm_message", "the create cart text was used");

	const oSettings = oConfirm.firstCall.args[1] as { onClose: (s: string) => Promise<void> };
	await oSettings.onClose(MessageBox.Action.YES as unknown as string);

	assert.strictEqual((CartService.create as unknown as StubLike).callCount, 1, "a cart was created");
	assert.deepEqual((CartService.addProducts as unknown as StubLike).firstCall.args[1], ["p-1"], "the products were added to the new cart");
});

/* ------------------------------------------------------------------ */
/* cart selection / product creation                                   */
/* ------------------------------------------------------------------ */

QUnit.test("onCartsSelectChange ignores an empty selection", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oEvent = makeEvent(null, { selectedItem: null });

	oController.onCartsSelectChange(oEvent as never);

	assert.deepEqual((this.globalModel as JSONModel).getProperty("/selectedCart"), {}, "the selected cart was left untouched");
	assert.strictEqual((CartService.bindDataToFragment as unknown as StubLike).callCount, 0, "the cart fragment was not rebound");
});

QUnit.test("onCartsSelectChange stores the selected cart context and rebinds the fragment", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ ID: "cart-3" });
	const oSelectedItem = {
		getBindingContext: function (): unknown {
			return oContext;
		}
	};
	const oEvent = makeEvent(null, { selectedItem: oSelectedItem });

	oController.onCartsSelectChange(oEvent as never);

	assert.strictEqual((this.globalModel as JSONModel).getProperty("/selectedCart"), oContext, "the cart context was stored");
	assert.strictEqual((CartService.bindDataToFragment as unknown as StubLike).callCount, 1, "the cart fragment was rebound");
});

QUnit.test("onCreateButtonPress rejects incomplete product input", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/product", { name: "Chair" });
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1" });

	await oController.onCreateButtonPress();

	const oShow = MessageToast.show as unknown as StubLike;
	assert.strictEqual(oShow.callCount, 1, "a message toast was shown");
	assert.strictEqual(oShow.firstCall.args[0], "add_product_error_fields", "the missing fields text was used");
	assert.strictEqual((ProductService.create as unknown as StubLike).callCount, 0, "no product was created");
});

QUnit.test("onCreateButtonPress creates the product with the selected company", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/product", {
		name: "Chair",
		description: "A chair",
		price: 10,
		stock_min: 1,
		stock: 5
	});
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1" });

	await oController.onCreateButtonPress();

	const oCreate = ProductService.create as unknown as StubLike;
	assert.strictEqual(oCreate.callCount, 1, "ProductService.create was called once");
	assert.deepEqual(oCreate.firstCall.args[1], {
		name: "Chair",
		description: "A chair",
		company_ID: "company-1",
		price: 10,
		stock_min: 1,
		stock: 5
	}, "the payload carries the product fields and the company ID");
});

/* ------------------------------------------------------------------ */
/* company selection                                                   */
/* ------------------------------------------------------------------ */

QUnit.test("onCompanyCancelPress clears the selected company and unbinds the element", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1" });
	const oUnbind = (this.sandbox as SandboxLike).stub(this.view as View, "unbindElement");

	oController.onCompanyCancelPress();

	assert.deepEqual((this.globalModel as JSONModel).getProperty("/selectedCompany"), {}, "the selected company was cleared");
	assert.strictEqual(oUnbind.callCount, 1, "the view element binding was removed");
	assert.strictEqual(oUnbind.firstCall.args[0], "/Company", "the Company element binding was targeted");
});

QUnit.test("onCompanyChange loads the company and resets the cart state", async function (this: AnyObject, assert: Assert): Promise<void> {
	const oController = this.controller as TestShop;
	const oCompany = { ID: "company-7", name: "Globex" };
	const oGetContexts = (this.sandbox as SandboxLike)
		.stub(oController, "_getEntityContexts")
		.returns(Promise.resolve(oCompany));

	const oComboBox = this.companyComboBox as ComboBox;
	(this.sandbox as SandboxLike).stub(oComboBox, "getSelectedKey").returns("company-7");
	const oEvent = makeEvent(oComboBox);

	await oController.onCompanyChange(oEvent as never);

	assert.strictEqual(oGetContexts.firstCall.args[0], "/Company", "the Company entity was queried");
	assert.deepEqual((this.globalModel as JSONModel).getProperty("/selectedCompany"), oCompany, "the company was stored");
	assert.deepEqual((this.globalModel as JSONModel).getProperty("/selectedCart"), {}, "the selected cart was reset");
	assert.strictEqual((this.globalModel as JSONModel).getProperty("/cartItemsQuantity"), 0, "the cart quantity was reset");
	assert.strictEqual((ProductService.loadByCompany as unknown as StubLike).callCount, 1, "the products were reloaded");
	assert.strictEqual((CartService.assignOnCompanyLoad as unknown as StubLike).callCount, 1, "the carts were reassigned");
});

/* ------------------------------------------------------------------ */
/* cart quantity + search                                              */
/* ------------------------------------------------------------------ */

QUnit.test("onProductCartQuantityChangePress ignores a quantity below one", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ quantity: 3 });
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	}, { value: 0 });

	oController.onProductCartQuantityChangePress(oEvent as never);

	assert.strictEqual(((oContext as AnyObject).setProperty as StubLike).callCount, 0, "the quantity was not written");
});

QUnit.test("onProductCartQuantityChangePress writes the new quantity to the context", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oContext = makeContext({ quantity: 1 });
	const oEvent = makeEvent({
		getBindingContext: function (): unknown {
			return oContext;
		}
	}, { value: 4 });

	oController.onProductCartQuantityChangePress(oEvent as never);

	const oSetProperty = (oContext as AnyObject).setProperty as StubLike;
	assert.strictEqual(oSetProperty.callCount, 1, "the quantity was written once");
	assert.strictEqual(oSetProperty.firstCall.args[0], "quantity", "the quantity property was targeted");
	assert.strictEqual(oSetProperty.firstCall.args[1], 4, "the new quantity value was written");
});

QUnit.test("onSearch applies a name filter for a query and clears it otherwise", function (this: AnyObject, assert: Assert): void {
	const oController = this.controller as TestShop;
	const oFilterStub = sinon.stub() as StubLike;
	(this.sandbox as SandboxLike).stub(this.productsTable as Table, "getBinding").returns({ filter: oFilterStub });

	oController.onSearch(makeEvent(null, { newValue: "chair" }) as never);

	assert.strictEqual(oFilterStub.callCount, 1, "the binding was filtered");
	const aFilters = oFilterStub.firstCall.args[0] as unknown[];
	assert.strictEqual(aFilters.length, 1, "exactly one filter was applied");

	oController.onSearch(makeEvent(null, { newValue: "" }) as never);

	assert.strictEqual(oFilterStub.callCount, 2, "the binding was filtered again");
	assert.deepEqual(oFilterStub.secondCall.args[0], [], "an empty query clears the filters");
});

/* ------------------------------------------------------------------ */
/* dialog facade                                                       */
/* ------------------------------------------------------------------ */

QUnit.test("openAddProductDialog delegates to the dialog handler", function (this: AnyObject, assert: Assert): void {
	(this.controller as TestShop).openAddProductDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _openAddProductDialog: StubLike })._openAddProductDialog.callCount, 1, "the add product dialog was opened");
});

QUnit.test("closeAddProductDialog delegates to the dialog handler", function (this: AnyObject, assert: Assert): void {
	(this.controller as TestShop).closeAddProductDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _closeAddProductDialog: StubLike })._closeAddProductDialog.callCount, 1, "the add product dialog was closed");
});

QUnit.test("openEditProductDialog delegates to the dialog handler", function (this: AnyObject, assert: Assert): void {
	(this.controller as TestShop).openEditProductDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _openEditProductDialog: StubLike })._openEditProductDialog.callCount, 1, "the edit product dialog was opened");
});

QUnit.test("closeEditProductDialog delegates to the dialog handler", function (this: AnyObject, assert: Assert): void {
	(this.controller as TestShop).closeEditProductDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _closeEditProductDialog: StubLike })._closeEditProductDialog.callCount, 1, "the edit product dialog was closed");
});

QUnit.test("openCartDialog does not open without a selected company", async function (this: AnyObject, assert: Assert): Promise<void> {
	await (this.controller as TestShop).openCartDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _openCartDialog: StubLike })._openCartDialog.callCount, 0, "the cart dialog stayed closed");
	assert.strictEqual((this.companyComboBox as ComboBox).getValueState(), "Error", "the company combo box shows an error state");
});

QUnit.test("openCartDialog opens the dialog when a company is selected", async function (this: AnyObject, assert: Assert): Promise<void> {
	(this.globalModel as JSONModel).setProperty("/selectedCompany", { ID: "company-1", name: "ACME" });

	await (this.controller as TestShop).openCartDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _openCartDialog: StubLike })._openCartDialog.callCount, 1, "the cart dialog was opened");
	assert.strictEqual((this.companyComboBox as ComboBox).getValueState(), "None", "the company combo box has no error state");
});

QUnit.test("closeCartDialog delegates to the dialog handler", function (this: AnyObject, assert: Assert): void {
	(this.controller as TestShop).closeCartDialog();

	assert.strictEqual((this.dialogHandler as AnyObject & { _closeCartDialog: StubLike })._closeCartDialog.callCount, 1, "the cart dialog was closed");
});

QUnit.test("formatter is exposed on the controller for view bindings", function (this: AnyObject, assert: Assert): void {
	assert.ok((this.controller as TestShop).formatter, "the formatter is available");
});
