const cds = require('@sap/cds');
const { SELECT, CREATE, UPDATE, SUM } = cds.ql;
const { errors } = require('@sap/cds');
const validations = require('./handlers/validations');
const e = require('express');

class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  const { Products, Company, Cart, CartItem } = db.entities

  this.after('READ', 'Cart', async (carts, req) => {
      if (!Array.isArray(carts)) carts = [carts];

      for (const cart of carts) {
        const products = await SELECT.from(CartItem)
          .where({ cart_ID: cart.ID })
          .columns(['quantity', 'price']);

        cart.total_price = products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
      }
      return super.init();
    });

  this.before('CREATE', 'Products', async req => {
    const product = req.data;
    console.log(product);
    console.log("Before Create: " + product);
    const validateEntity = validations.validateProduct(product);
    if(!validateEntity.status) return req.reject(400, validateEntity.message);
    return product;
  });

  this.after('CREATE', 'Products', async (data, req) => {
    const product = data;
    console.log(product);
    return data;
  });


  this.before('CREATE', 'Cart', async req => { 
    const cart = req.data;

    const tx = cds.transaction(req);

    const carts = await tx.run(SELECT.from(Cart).orderBy({ createdAt: 'desc' }));

    console.log(carts);

    cart.name = `Cart - ${carts.length > 0 ? parseInt(carts[0]?.name.split(" - ")[1]) + 1 : 1}`;

    return super.init();
   });

   this.on('addProductsToCart', async req => {
    const { products } = req.data;

    for (const oProductToAdd of products) {
        const product = await SELECT.one.from(Products).where({ ID: oProductToAdd.product_ID });

        if (!product) return req.error(404, `Produto com ID ${product.ID} não encontrado.`);

        if (product.stock < oProductToAdd.quantity) return req.error(400, `Stock insuficiente para o produto ${product.name}. A operação foi cancelada.`);
      console.log("Produto a adicionar ao carrinho:", oProductToAdd);
        const existingCartItem = await SELECT.from(CartItem).where({ cart_ID: oProductToAdd.cart_ID, product_ID: oProductToAdd.product_ID });
        console.log("Item do carrinho existente:", existingCartItem);
        if(existingCartItem.length > 0)
          await UPDATE(CartItem, existingCartItem[0].ID).with({ quantity: { '+=': oProductToAdd.quantity } });
        else
          await INSERT.into(CartItem).entries({ cart: { ID: oProductToAdd.cart_ID },
                                                cart_user_id: oProductToAdd.cart_user_id,
                                                product: { ID: oProductToAdd.product_ID },
                                                quantity: oProductToAdd.quantity,
                                                price: product.price,
                                                currency: product.currency,
                                                // totalLinePrice: product.price * oProductToAdd.quantity
        });
        console.log("cheguei aqui sou um deus");
        await UPDATE(Products, oProductToAdd.product_ID).with({ stock_max: { '-=': oProductToAdd.quantity } });
        
    }

    // No final, busca e retorna o estado completo e atualizado do carrinho
    // const updatedCart = await cds.tx(req).run(
    //     SELECT.one.from(my.Cart)
    //           .where({ ID: cartID })
    //           .columns(c => { c `.*`, c.items(i => { i `.*`, i.product `.*` }) })
    // );
    
    // ... aqui pode recalcular o totalPrice do carrinho ...
   });

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