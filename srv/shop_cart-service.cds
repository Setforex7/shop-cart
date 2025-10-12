using { sap.capire.shop_cart as my } from '../db/schema';

type sAddProduct { name        : String(50);
                   description : String(600);
                   price       : Decimal(10,2);
                   currency    : String(3);
                   stock_min   : Integer;
                   stock_max   : Integer };

//? Structure for products on the Cart
type sCartItem { cart_ID      : UUID;
                 cart_user_id : String(50);
                 product_ID   : UUID;
                 price        : Decimal(10,2);
                 total_price  : Decimal(10,2);
                 quantity     : Integer };

//? Structure for finalizing the Cart process
type sFinalizeCart { ID         : UUID;
                     company_ID : UUID;
                     user_id    : String(50);
                     type       : String(1);
                     currency   : String(3);
                     products   : many sCartItem }

type sDeleteProduct { ID: UUID };

service ShopCartService @(path:'/shop') { 

  entity Company as select from my.Company;

  @restrict: [ { grant: 'READ' }, { grant: 'WRITE',
                                    to: 'authenticated-user' } ]
  entity Products as select from my.Products;

  @restrict: [ { grant: 'READ' }, { grant: 'WRITE',
                                    to: 'authenticated-user' } ]
  entity Cart as select from my.Cart {
    *,
    createdAt,
    products : redirected to CartItem
  };

  entity CartItem as select from my.CartItem {
    *,
    product : redirected to Products @cascade: { delete: true }
  };

  @restrict: [ { grant: 'READ' }, { grant: 'WRITE',
                                    to: 'authenticated-user' } ]
  entity Orders as select from my.Orders;

  entity OrderItems as select from my.OrderItems;

  @requires: 'authenticated-user'
  action createProduct (product: sAddProduct) returns sAddProduct;

  @requires: 'authenticated-user'
  action deleteProduct (product: sDeleteProduct) returns sDeleteProduct;

  @requires: 'authenticated-user'
  action addProductsToCart (products: many sCartItem) returns Cart;

  @requires: 'authenticated-user'
  action finalizeProcess (cart: sFinalizeCart) returns Cart;
}