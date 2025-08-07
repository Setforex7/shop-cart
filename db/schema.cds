using { Currency, managed, sap } from '@sap/cds/common';
namespace sap.capire.shop_cart; 

type Names : String(50);
type Descriptions : String(600);
type PriceCurrency : { amount : Decimal(10,2); currency : String(3); };
type OrderType : String enum {
  B; // Buy
  S; // Sell
}


entity Orders : managed {
  key ID : Integer;
  type : OrderType; //? Only accepts "B" or "S"
  company : Association to Company;
  items : Composition of many OrderItems on items.order = $self; //? Array of referenced order items
  total_price : Decimal(10,2) @mandatory;
  currency : String(3) @mandatory;
}

entity OrderItems : managed {
  key ID : Integer;
  order : Association to Orders; //? Foreign key to Orders
  product : Association to Products @mandatory; //? Foreign Key to Products
  quantity : Integer @mandatory;
  total_price : Decimal(10,2) @mandatory;
  currency : String(3) @mandatory;
}

entity Company {
  key ID : UUID;
  name : Names @mandatory;
  description : Descriptions;
  capital : Decimal(10,2) @mandatory;
  currency : String(3) @mandatory;
}

entity Products {
  key ID : UUID;
  key name : Names @mandatory;
  description : Descriptions;
  price : Decimal(10,2) @mandatory;
  currency : String(3) @mandatory;
  stock_min : Integer @mandatory;
  stock_max : Integer @mandatory;
}

entity Cart {
  key ID : UUID;
  key user_id : String(50) @mandatory;
  name: Names;
  company : Association to Company; @mandatory
  products : Composition of many CartItem on products.cart = $self; //? Array of referenced cart items
  total_price : Decimal(10,2);
  currency : String(3) @mandatory;
}

entity CartItem : managed {
  key ID : UUID;
  cart : Association to Cart;
  product : Association to Products @mandatory;
  quantity : Integer @mandatory;
  price : Decimal(10,2) @mandatory;
  currency : String(3) @mandatory;
}