import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReservationFailure } from './checkout-reservation-error.ts';
test('known reservation failures give safe recovery instructions',()=>{
 assert.equal(checkoutReservationFailure({code:'PGRST202'}).status,503);
 assert.match(checkoutReservationFailure({code:'P0001',message:'Design mismatch'}).error,/pending checkout/);
 assert.match(checkoutReservationFailure({code:'P0001',message:'Invalid print size'}).error,/saved print options/);
 assert.match(checkoutReservationFailure({code:'P0001',message:'Size sold out'}).error,/quantity/);
 assert.equal(checkoutReservationFailure({code:'P0001',message:'Too many checkout attempts'}).status,429);
});
test('unknown provider errors never expose database contents or customer information',()=>{
 for(const error of [null,{code:'23514',message:'secret row contents',details:'private cookie'},{code:'P0001',message:'Invalid print size: secret row'},{code:'P0001',message:'secret row contents'}]){
  const result=checkoutReservationFailure(error);assert.equal(result.status,409);assert.doesNotMatch(result.error,/secret|cookie|row contents/);
 }
});
