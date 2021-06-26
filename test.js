const express = require('express');
const app = express();
const port = 3000;

const SCYTHE = require("./scythe.js");
const REDIS = require("./redis.js");
const CHART = require("./chart.js");
var redis = new REDIS();


async function field(datum, key){
  return datum.map(function(item){
    var d = JSON.parse(item);

    return d[key];
  });
}



async function render() {
var keys = await redis.KEYS();
var counts = [];
for(key of keys){
  counts.push({key: key, val: await redis.LLEN(key)});
}
counts.sort(function(a, b){
  return b.val - a.val;
});
var markets = counts;


var market = markets[0].key;
var sim = markets[0].key+'SIM';
await redis.del(sim);
var scythe = new SCYTHE(sim,100);
var data = await redis.LRANGE(market,-1000,-1);

for(move of await field(data, 'move')){
  var sig = await scythe.run(parseInt(move));
  if(sig.bSig) await scythe.recordBuy(move);
  if(sig.sSig) await scythe.recordSell(move);
}

var datumSIM = await redis.LRANGE(sim,0,-1);

var chart = new CHART();
var url = await chart.url({moves: await field(datumSIM, 'move'), maxes: await field(datumSIM, 'max'), mins: await field(datumSIM, 'min'), pcs: await field(datumSIM, 'pc'), pcs2: await field(datumSIM, 'pc2'), buys: await field(datumSIM, 'buy'), sells: await field(datumSIM, 'sell')})


return url;







}


app.get('/', async (req, res) => {
  var img = await render();

  res.send('<img src='+img+'>');

})

app.listen(port, () => {
  console.log('SCYTHE ALPHA2');
  console.log('###########################################');
})
