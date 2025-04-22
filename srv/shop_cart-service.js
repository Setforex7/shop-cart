const cds = require('@sap/cds');
const { errors } = require('@sap/cds');
const validations = require('./handlers/validations');
class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  const { Products, Company, Cart } = db.entities      
  
  this.before('CREATE', 'Products', async req => {
    const product = req.data;
    console.log(product);
    console.log("Before Create: " + product);
    const validateEntity = validations.validateProduct(product);
    if(!validateEntity.status) return req.reject(400, validateEntity.message);
    return product;
  });

  this.after('CREATE', 'Products', async (data, req) => {
    console.log("FINAL DO PROCESSO DE ADD");
    console.log("eu estou aqui: ", data);
    return data;
  });

  this.before('CREATE', 'Carts', async (data, req) => {
    console.log(req.data);
  })

  // this.on('getLastId', async req => {
  //   const { ID, entityName }= req.data;
  //   console.log(await SELECT.from(entityName).where({ ID: ID }));
  //   return [await SELECT.from(entityName).where({ ID })] 
  // }),

  this.on('createProduct', async req => {
    //? Gets the request data from the frontend
    const { product } = req.data;
    console.log("Producto", product);
    if(!validations.validateProduct(product).state) return req.error(400, 'Something went wrong creating the product');

    // if(!product) return req.error(400, 'Something went wrong creating the product');
    // if(!product.name) return req.error(400, 'Please insert a valid name');
    // if(!product.price || parseFloat(product.price) < 0) return req.error(400, 'Please insert a valid price');
    // if(parseFloat(product.stock_min) < 0) return req.error(400, 'Please insert a valid value for stock minimum');
    // if(parseFloat(product.stock_max) < 0) return req.error(400, 'Please insert a valid value for stock maximum');
    // if(product.currency !== "EUR" && product.currency !== "USD") return req.error(400, 'Please insert a valid currency (EUR or USD)');

    const duplicateProduct = await SELECT.from(Products).where({ name: product.name, price: product.price, currency: product.currency });
    console.log(duplicateProduct);
    // if(duplicateProduct.length !== 0) return req.error(400, 'Product already exists in the database!');

    //? Makes the action in the database
    const createdProducts = await INSERT.into(Products).entries(product);
    if(createdProducts.length !== 0) return product;
  });

  return super.init()
}}
module.exports = ShopCartService