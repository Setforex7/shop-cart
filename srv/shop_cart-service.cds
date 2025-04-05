  using { sap.capire.shop_cart as my } from '../db/schema';

type ProductInput { name : String(50);
                    description : String(600);
                    price : Decimal(10,2);
                    currency : String(3);
                    stock_min : Integer;
                    stock_max : Integer}

service ShopCartService @(path:'/shop') { 

  // @readonly entity Books as select from my.Books {*,
  //   author.name as author
  // } excluding { createdBy, modifiedBy };
  
  @readonly entity Company as select from my.Company;
  @readonly entity Products as select from my.Products;

  @requires: 'authenticated-user'
  action createProduct (product: ProductInput)
}