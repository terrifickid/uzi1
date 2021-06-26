var SCYTHE = require("./scythe.js");
var scythe = new SCYTHE('TSLA',100);

const Alpaca = require('@alpacahq/alpaca-trade-api');

var longbuy = false;
var longsell = false;
var longnet = 0;
var net = 0;
var p = 0;
var f = 0;

//Alpaca API
alpaca = new Alpaca({
  keyId: 'PKBUNXWPBRSXGWTIY9G9',
  secretKey: '5WDrbVKMPgPGee1eZdyGbGaaPZQAHT6odOtpmWjh',
  paper: true,
  usePolygon: true
});
tradeApi = alpaca.data_ws;
tradeApi.onConnect(function() {
  console.log("Trade API Connected")
  tradeApi.subscribe(['T.TSLA']);
});
tradeApi.onDisconnect(() => {
  console.log("Trade API Disconnected");
  process.exit(1);
});
execApi = alpaca.trade_ws;
execApi.onConnect(function () {
  console.log("Exec API Connected")
  execApi.subscribe(['trade_updates']);
  tradeApi.connect();
});
execApi.onDisconnect(() => {
  console.log("Exec API Disconnected");
    process.exit(1);
});
///////////////////////////////////////////////////////////////////////////////
execApi.onOrderUpdate(data => {
  //onOrderUpdate(data)
  console.log(data);
});
tradeApi.onStockTrades(async function(subject, data) {
  var d = JSON.parse(data);
  var sig = scythe.run(parseInt(scythe.round( d[0].p * 100,0)));
  if(sig.buy) execTrade(true, 'market', 'fok');
  if(sig.sell) execTrade(false, 'market', 'fok');
});

(async function(){
  console.log('init...');
  await execApi.connect();


})();


/////////////////////////////////////////////////////////////////////////////
async function execTrade(t,type,time, limit_price = null){
  console.log('#EXEC', t,type,time, limit_price);
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
    var res = await this.alpaca.createOrder(order);
  }catch(err){

  }
}

async function onOrderUpdate(data){
  console.log('#EVENT', data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
  if(data.event == 'fill'){

    if(data.order.side == 'buy'){
      longbuy = this.round(data.order.filled_avg_price * 100, 0);
    }

    if(data.order.side == 'sell'){
      longsell = this.round(data.order.filled_avg_price * 100, 0);
    }

    if(longbuy && longsell){
      console.log('*SCYTHE',longbuy, longsell, longsell - longbuy);
      longnet += longsell - longbuy;
      if(longsell - longbuy >= 0) p++;
      if(longsell - longbuy < 0)f++;
      longbuy = false;
      longsell = false;
      net += this.round((longnet)/100, 2);
      console.log('$'+net);
    }
  }
}
