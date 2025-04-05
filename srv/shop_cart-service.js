const cds = require('@sap/cds')
class ShopCartService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db') // connect to database service
  const { Products } = db.entities         // get reflected definitions

  // Reduce stock of ordered books if available stock suffices
  // this.on ('createProduct', async req => {
  //   const {book,quantity} = req.data
  //   const n = await UPDATE (Books, book)
  //     .with ({ stock: {'-=': quantity }})
  //     .where ({ stock: {'>=': quantity }})
  //   n > 0 || req.error (409,`${quantity} exceeds stock for book #${book}`)
  // })

  this.on('createProduct', async req => {
    console.log(req.data);
    const { product } = req.data;
    const n = await INSERT.into(Products).entries(product);
    return product;
  });

  // this.on('getAllBooks', async () => {
  //   const books = await SELECT.from(Books); // Busca todos os livros do banco
  //   return books; // Retorna a lista de livros
  // });

  // // Add some discount for overstocked books
  // this.after ('each','Books', book => {
  //   if (book.stock > 111) book.title += ` -- 11% discount!`
  // })

  return super.init()
}}
module.exports = ShopCartService