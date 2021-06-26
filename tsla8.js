var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');
var Decimal = require('decimal.js');
//var timeseries = require("timeseries-analysis");
//import { ma, dma, ema, sma, wma } from 'moving-averages';

var cAVG;
var signal;
var signals = [];
var exec;
var values = [];
var tradeGate = true;
var ivanMode = false;
var marketOrder = [];
var longbuy;
var longsell;
var shortbuy;
var shortsell;
var net = 0;

var mode = 0;
var pc = [];
var filled = false;
//DB
const dbName = 'tsla';
const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

//FRAME
var frame = 20;

/////////////////////////////////////////////////////////////////////////////

function t(p){
  if(cAVG < parseFloat(p)) return true;
  return false;
}

async function log(data = []){
  var output = '';
  for(item of data){
    output += String(item).padEnd(10) + ' ';
  }
  console.log(output);
}

function getAvg(grades) {
  const total = grades.reduce((acc, c) => acc + c, 0);
  return total / grades.length;
}

function round(value, decimals) {
      var val = Number(Math.round(value+'e'+decimals)+'e-'+decimals);
        if(isNaN(val)) return 0;
        return val;
    }

function getPercentageChange(ask, bid){
  if(!ask || !bid) return 0;
  ask = parseFloat(ask);
  bid = parseFloat(bid);

        var pc = [(bid - ask)/ask] * 100;
        if(pc == 'Infinity') return 0;
        return pc;
    }

/////////////////////////////////////////////////////////////////////////////
var alpaca = new Alpaca({
  keyId: 'PKBUNXWPBRSXGWTIY9G9',
  secretKey: '5WDrbVKMPgPGee1eZdyGbGaaPZQAHT6odOtpmWjh',
  paper: true,
  usePolygon: false
});




/////////////////////////////////////////////////////////////////////////////
async function execTrade(t,type,time, limit_price = null){
  console.log('#EXEC', t,type,time, limit_price);
  tradeGate = false;
  side = 'sell';
  if(t) side = 'buy';
  var order = {
    symbol: 'TSLA',
    qty: 1,
    side: side,
    type: type,
    time_in_force: time
  }
  if(limit_price) order.limit_price = limit_price;
  try{
    var res = await alpaca.createOrder(order);
  }catch(err){
    tradeGate = true;

  }


}


async function strat(res){
  var market = Object.entries(res.TSLA).map(function(d){ return round( d[1].closePrice * 100,0) ;});

  var longnet = 0;
  var shortnet = 0;

  var nm = [];
  var mode = 0;
  var profit = 50;
  var loss = profit * -1;
  var frame = 440;
  var lastPrice;
  for(move of market){
      lastPrice = move;
      nm.push(move);
      if(nm.length > frame) nm.shift();
      if(nm.length < frame) continue;
      avg = round(getAvg(nm),2);
      pc = round(getPercentageChange(avg, move), 2);

      //Entry
      if(pc > 0 && !longbuy) longbuy = move;
      if(pc < 0 && !shortsell) shortsell = move;

      //EXIT
      if(longbuy){
          if(move-longbuy > profit) longsell = move;
          if(move-longbuy < loss) longsell = move;
      }


      if(shortsell){
        if(shortsell-move > profit) shortbuy = move;
        if(shortsell-move < loss) shortbuy = move;
      }



      if(longbuy && longsell){
        longnet += longsell - longbuy;
        longbuy = false;
        longsell = false;

      }

      if(shortsell && shortbuy){
        shortnet += shortsell - shortbuy;
        shortbuy = false;
        shortsell = false;

      }

}
console.log(longnet, shortnet);
net += round((longnet*5+shortnet*5)/100, 2);
}

/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    // Connect
    await client.connect();
    exec = await client.db(dbName).collection("exec");
    console.log('init...');
    alpaca.cancelAllOrders();

    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-01-01T09:30:00-04:00', end:'2020-01-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-02-01T09:30:00-04:00', end:'2020-02-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-03-01T09:30:00-04:00', end:'2020-03-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-04-01T09:30:00-04:00', end:'2020-04-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-05-01T09:30:00-04:00', end:'2020-05-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-06-01T09:30:00-04:00', end:'2020-06-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-07-01T09:30:00-04:00', end:'2020-07-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-08-01T09:30:00-04:00', end:'2020-08-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-09-01T09:30:00-04:00', end:'2020-09-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-10-01T09:30:00-04:00', end:'2020-10-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-11-01T09:30:00-04:00', end:'2020-11-29T16:00:00-04:00'});
    strat(res);
    var res = await alpaca.getBars('1Min', ['TSLA'], {start:'2020-12-01T09:30:00-04:00', end:'2020-12-29T16:00:00-04:00'});
    strat(res);


    console.log(net);

  } catch (err) {
    console.log(err);
  }

})();
