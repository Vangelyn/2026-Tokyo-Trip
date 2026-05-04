const fs = require('fs');
const stats = fs.statSync('public/icon.png');
console.log('Size of icon.png:', stats.size);
