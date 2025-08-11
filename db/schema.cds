using { Currency, managed, sap } from '@sap/cds/common';
namespace sap.capire.shop_cart; 

type Names : String(50);
type Descriptions : String(600);
type PriceCurrency : { amount : Decimal(10,2); currency : String(3); };
type OrderType : String enum { B; 
                               S }


entity Orders : managed { key ID : Integer;
                          type : OrderType; //? Only accepts "B" or "S"
                          company : Association to Company;
                          items : Composition of many OrderItems on items.order = $self; //? Array of referenced order items
                          total_price : Decimal(10,2) @mandatory;
                          currency : String(3) @mandatory }

entity OrderItems : managed { key ID : Integer;
                              order : Association to Orders; //? Foreign key to Orders
                              name : Names @mandatory;
                              description : Descriptions @mandatory;
                              price : Decimal(10,2) @mandatory;
                              quantity : Integer @mandatory;
                              total_price : Decimal(10,2) @mandatory;
                              currency : String(3) @mandatory }

entity Company { key ID : UUID;
                 name : Names @mandatory;
                 description : Descriptions;
                 capital : Decimal(10,2) @mandatory;
                 currency : String(3) @mandatory }

entity Products { key ID : UUID;
                  key name : Names @unique @mandatory;
                  description : Descriptions;
                  price : Decimal(10,2) @mandatory;
                  currency : String(3) @mandatory;
                  stock_min : Integer @mandatory;
                  stock_max : Integer @mandatory }

entity Cart : managed { key ID : UUID;
                        key user_id : String(50) @mandatory;
                        name: Names;
                        company : Association to Company; @mandatory
                        products : Composition of many CartItem on products.cart = $self; //? Array of referenced cart items
                        total_price : Decimal(10,2);
                        currency : String(3) @mandatory }

entity CartItem : managed { key ID : UUID;
                            cart : Association to Cart;
                            product_ID : UUID;
                            quantity : Integer @mandatory;
                            price : Decimal(10,2) @mandatory;
                            currency : String(3) @mandatory;
                            product : Association to Products on product.ID = $self.product_ID }