const cds = require('@sap/cds');

const { CartItem } = cds.entities;

// createOrder = async req => {
//     const { cart } = req.data;
//     const { products } = cart;

//     const tx = cds.transaction(req);

//     //? Calculate total price of the cart
//     const cartTotalPrice = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

//     //? Create an order and his respective items
//     await tx.run(INSERT.into(Orders).entries({ company: { ID: cart.company_ID },
//                                                items: products.map(p => { return { product: { ID: p.product_ID }, 
//                                                                                    price: p.price,
//                                                                                    total_price: p.price * p.quantity,
//                                                                                    quantity: p.quantity,
//                                                                                    currency: p.currency }; }),
//                                                type: "S",
//                                                total_price: cartTotalPrice,
//                                                currency: "EUR" }));

//     for (const p of products) {
//       await tx.run(
//         UPDATE(Products)
//           .set`stock = stock - ${p.quantity}`
//           .where({ ID: p.product_ID })
//       );
//     }
//     await tx.run(UPDATE(Company, cart.company_ID).with({ capital: { '+=': cartTotalPrice } }));
// }

// module.exports = { createOrder };