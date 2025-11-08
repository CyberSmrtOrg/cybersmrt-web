const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
if (!process.env.PRINTIFY_API_TOKEN) {
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
}

// Fallback: use hardcoded token if dotenv truncates (dotenv has 2k char limit)
const token = process.env.PRINTIFY_API_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIzN2Q0YmQzMDM1ZmUxMWU5YTgwM2FiN2VlYjNjY2M5NyIsImp0aSI6ImY5OTBiMzI4YTk1YjVlZTA0MzQzODA3NmJkMTUxY2IyZTA2NmEyOTEzODY2NzQ1MjQ2ZDBmMTc4ZWU2MmM5M2ZlYmJmZDgxZmEwOTI5MGQ1IiwiaWF0IjoxNzYyNTU2MjUxLjU4OTc0NSwibmJmIjoxNzYyNTU2MjUxLjU4OTc0NywiZXhwIjoxNzk0MDkyMjUxLjU3MDExOCwic3ViIjoiMjUyNTU3MTkiLCJzY29wZXMiOlsic2hvcHMubWFuYWdlIiwic2hvcHMucmVhZCIsImNhdGFsb2cucmVhZCIsIm9yZGVycy5yZWFkIiwib3JkZXJzLndyaXRlIiwicHJvZHVjdHMucmVhZCIsInByb2R1Y3RzLndyaXRlIiwid2ViaG9va3MucmVhZCIsIndlYmhvb2tzLndyaXRlIiwidXBsb2Fkcy5yZWFkIiwidXBsb2Fkcy53cml0ZSIsInByaW50X3Byb3ZpZGVycy5yZWFkIiwidXNlci5pbmZvIl19.sHLngjJ1A6aAkK27ggbJ3wobBU_5r8TFSW9ndCpWUW4pKEhffuGcnukfSNz2tr0axE98sSkGMFG7_H7gJrW6I5M1djNZnhL6XTpWxddAYvwW9gsCgsIMrdmDD6TP4w9CrG7PrfdtrHy4Ubj3XmlwzkjWEvbwK8ZqOGLaUBK6Hs7nlqZ1isf70Wl6IbMUVDpQmaeaX-Iul-SrzhNkoxVBceLmvLlM3PylViRMq79XvzSDMV5DPerR6Aw9xFYq8rblZk87_b-l8wvLyDUPFT7Z2JDJ8iFgGLLSV00C1ZKCe6_ItVgq2PTRLLtb0EXMxJInU9CV0wA270606e8fdet1vbnGLJj-E9N-NjuwTApyZ7Iw0Tdggl5gc7jQWaPbuWZAZmUaKToEDmTrlU7UHieexyntxYImGcwrJD5j_Vk2FgueWDKvZf_woTLlVbUAVY5Z16_t1sJ1UIzaISuOjrKMG2oz0AZA7URI3KcNzcmrjFXv_7Pg1_y6PXGy20-pQbklaK7RvF0qTaX7JHcGEJhIK3WvSd0CYShJUn3fjCI3Q089ueLybJw2UtGW-vFwLgW82UaJ64iSdAYLjoER8L0LhTEXELZpQOyv9yZKH7kS8tMC8-V0k1NJFFwapU37B8Hr_qDCehAJKPmH4Dky9osTie_e9eQrTdqgvpKqijUoH6o';
console.log('Token found:', token ? 'YES' : 'NO');
console.log('Token length:', token ? token.length : 0);
console.log('Token starts with:', token ? token.substring(0, 20) : 'N/A');
console.log('Shop ID:', process.env.PRINTIFY_SHOP_ID);

// Test API request
const https = require('https');
const url = new URL('https://api.printify.com/v1/shops/' + process.env.PRINTIFY_SHOP_ID + '/products.json');

const options = {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
};

console.log('\nMaking request to:', url.toString());
console.log('Authorization header:', 'Bearer ' + token.substring(0, 20) + '...');

const req = https.request(url, options, (res) => {
  console.log('\nResponse status:', res.statusCode);
  console.log('Response headers:', res.headers);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log('Success! Found', parsed.data?.length || 0, 'products');
    } else {
      console.log('Error response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
