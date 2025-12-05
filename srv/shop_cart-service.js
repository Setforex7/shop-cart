const cds = require('@sap/cds');
const { SELECT, CREATE, UPDATE, SUM } = cds.ql;
const { errors } = require('@sap/cds');
const validations = require('./handlers/validations');
const e = require('express');

class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db')
  const { Products, Company, Cart, CartItem, Orders } = db.entities

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

  this.before("DELETE", "Products", async req => {
    const { ID } = req.data;
    await DELETE.from(CartItem).where({ product_ID: ID });
    return super.init();
  });

  this.before('CREATE', 'Cart', async req => { 
    const cart = req.data;

    const tx = cds.transaction(req);

    const carts = await tx.run(SELECT.from(Cart).orderBy({ createdAt: 'desc' }));

    console.log(carts);

    cart.name = `Cart - ${carts.length > 0 ? parseInt(carts[0]?.name.split(" - ")[1]) + 1 : 1}`;

    return super.init();
  });

  this.on('finalizeProcess', async req => {
    const { cart } = req.data;
    const { products } = cart;
    console.log("entity", db.entities);

    const tx = cds.transaction(req);

    console.log("Finalizing process for cart:", cart);

    //? Calculate total price of the cart
    const cartTotalPrice = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

    //? Create an order and his respective items
    await tx.run(INSERT.into(Orders).entries({ company: { ID: cart.company_ID },
                                               items: products.map(p => { return { product: { ID: p.product_ID }, 
                                                                                   price: p.price,
                                                                                   total_price: p.price * p.quantity,
                                                                                   quantity: p.quantity,
                                                                                   currency: p.currency }; }),
                                               type: "S",
                                               total_price: cartTotalPrice,
                                               currency: "EUR" }));

    for (const p of products) {
  await tx.run(
    UPDATE(Products)
      .set`stock_max = stock_max - ${p.quantity}`
      .where({ ID: p.product_ID })
  );
}
    await tx.run(UPDATE(Company, cart.company_ID).with({ capital: { '+=': cartTotalPrice } }));
  });

  this.on('addProductsToCart', async req => {
    const { products } = req.data;

    for (const oProductToAdd of products) {
      const { products } = req.data;
      const tx = cds.transaction(req); 

      const cart_ID = products[0]?.cart_ID;
      if(!cart_ID) return req.error(400, 'ID do carrinho não fornecido.');

      for (const oProductToAdd of products) {
          const product = await SELECT.one.from(Products).where({ ID: oProductToAdd.product_ID });

          if (!product) return req.error(404, `Produto com ID ${oProductToAdd.product_ID} não encontrado.`);

          if (product.stock_max < oProductToAdd.quantity) return req.error(400, `Stock insuficiente para o produto ${product.name}. A operação foi cancelada.`);

          const existingCartItem = await SELECT.one.from(CartItem).where({ cart_ID: oProductToAdd.cart_ID, product_ID: oProductToAdd.product_ID });

          if (existingCartItem) 
              await tx.run(UPDATE(CartItem, existingCartItem.ID).with({ quantity: { '+=': oProductToAdd.quantity } }));
          else 
              await tx.run(INSERT.into(CartItem).entries({ cart: { ID: oProductToAdd.cart_ID },
                                                           cart_user_id: oProductToAdd.cart_user_id,
                                                           product: { ID: oProductToAdd.product_ID },
                                                           quantity: oProductToAdd.quantity,
                                                           price: product.price,
                                                           currency: product.currency }));
          

          // await tx.run(UPDATE(Products, oProductToAdd.product_ID).with({ stock_max: { '-=': oProductToAdd.quantity } }));
      }
      const cartItems = await tx.run(SELECT.from(CartItem).where({ cart_ID: cart_ID }));
      const total_price = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

      await tx.run(UPDATE(Cart, cart_ID).with({ total_price: total_price }));

      const updatedCart = await tx.run(SELECT.one.from(Cart).where({ ID: cart_ID })
                                                            .columns(c => { c `.*`,
                                                                            c.products(i => { i `.*`,
                                                                                              i.product(p => p `.*`)})}));

      return updatedCart;
    }
  });


  this.on('createProduct', async req => {
    //? Gets the request data from the frontend
    const { product } = req.data;
    console.log("Producto", product);
    if(!validations.validateProduct(product).state) return req.error(400, 'Something went wrong creating the product');

    const duplicateProduct = await SELECT.from(Products).where({ name: product.name, price: product.price, currency: product.currency });
    console.log(duplicateProduct);

    //? Makes the action in the database
    const createdProducts = await INSERT.into(Products).entries(product);
    if(createdProducts.length !== 0) return product;
  });

  return super.init()
}}
module.exports = ShopCartService