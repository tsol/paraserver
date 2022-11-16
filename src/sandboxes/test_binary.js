
//console.log ('count = ', count_one(31));
//console.log(dec2bin(0x55555555));
//console.log('? ', isPowerOfFour(128));
console.log(getSum(10,27));


function getSum(a, b) {
  console.log('getSum a=',dec2bin(a),', b=',dec2bin(b));
  console

  if ( b == 0) {
    return a;
  }

  console.log('  a^b = ',dec2bin(a^b),', (a&b)<<1 = ', dec2bin((a&b)<<1) );
  return getSum(a^b, (a&b)<<1);
}



function isPowerOfFour(n) {
  console.log('isPowerOfFour',n,dec2bin(n))

  let a = n & (n-1);

  console.log('n           = ',dec2bin(n));
  console.log('n-1         = ',dec2bin(n-1));
  console.log('n & (n-1)   = ',dec2bin( a ));
  console.log('! n & (n-1) = ',dec2bin( !a ));
  console.log('--');
  console.log('0x55..      = ',dec2bin(0x55555555));
  console.log('n & 0x55..  = ',dec2bin(n & 0x55555555));

  return !( n & (n-1)) && (n & 0x55555555);
  
  return !(n&(n-1)) && (n&0x55555555);
  //check the 1-bit location;
}

function count_one(n) {
  let count = 0;
  let nn = 0;

  while(n) {
      nn = n & (n-1);
      console.log( n, dec2bin(n), ' & ', (n-1), dec2bin(n-1), ' = ', nn, dec2bin(nn) );
      n = nn;      
      count++;
  }

  return count;
}


function dec2bin(dec){
  return (dec >>> 0).toString(2);
}

