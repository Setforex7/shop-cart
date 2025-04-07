const cds = require('@sap/cds')
class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  console.log(db.entities);
  const { Products, Company } = db.entities      
  
  this.on('CREATE', Products, async req => {
  
  });

  this.on('createProduct', async req => {
    //? Gets the request data from the frontend
    const { product } = req.data;

    if(!product) return req.error(400, 'Something went wrong creating the product');
    if(!product.name) return req.error(400, 'Please insert a valid name');
    if(!product.price || parseFloat(product.price) < 0) return req.error(400, 'Please insert a valid price');
    if(parseFloat(product.stock_min) < 0) return req.error(400, 'Please insert a valid value for stock minimum');
    if(parseFloat(product.stock_max) < 0) return req.error(400, 'Please insert a valid value for stock maximum');
    if(product.currency !== "EUR" && product.currency !== "USD") return req.error(400, 'Please insert a valid currency (EUR or USD)');

    const duplicateProduct = await SELECT.from(Products).where({ name: product.name, price: product.price, currency: product.currency });
    if(duplicateProduct.length !== 0) return req.error(400, 'Product already exists in the database!');

    //? Makes the action in the database
    const createdProducts = await INSERT.into(Products).entries(product);
    if(createdProducts.length !== 0) return product;
  });

  return super.init()
}}
module.exports = ShopCartService