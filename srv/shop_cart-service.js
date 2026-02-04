const cds = require('@sap/cds');
const { SELECT, CREATE, UPDATE, SUM } = cds.ql;
const { errors } = require('@sap/cds');
const userHandler = require('./handlers/User.js');
const ordersHandler = require('./handlers/orders.js');
const cartHandler = require('./handlers/cart.js');
const productsHandler = require('./handlers/products.js');
const jobsHandler = require('./handlers/jobs.js');
const excelHandler = require('./handlers/excel.js');

class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  const { Products, Company, Cart, CartItem, Orders } = db.entities

  cds.on('served', jobsHandler.onCdsServer);

  this.on('getUserInfo', userHandler.getUserInfo);

  this.after('READ', 'Products', productsHandler.afterReadProducts);

  this.before('READ', 'Cart', cartHandler.beforeReadCart);

  this.after('READ', 'Cart', cartHandler.afterReadCart);

  this.before('CREATE', 'Products', productsHandler.beforeCreateProducts);

  this.before("DELETE", "Products", productsHandler.beforeDeleteProducts);

  this.before('CREATE', 'Cart', cartHandler.beforeCreateCart);

  this.on('finalizeCart', cartHandler.finalizeCart);

  this.on('addProductsToCart', cartHandler.addProductToCart);

  this.on('downloadExcelTemplate', excelHandler.excelProductTemplate);

  return super.init()
}}
module.exports = ShopCartService