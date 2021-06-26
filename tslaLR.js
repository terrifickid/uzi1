
const redis = require("redis");
const { promisify } = require("util");
const red = redis.createClient();
const rpush = promisify(red.rpush).bind(red);
const lrange = promisify(red.lrange).bind(red);

  var name = 'tslaLR';
  var net = 0;

  var f = 0;
  var p = 0;

  var longbuy = false;
  var longsell = false;
  var mode = 0;
  var longnet = 0;
  var shortnet = 0;
  var frame = 100;
  var nm = [];
  var rsis = [];
  var mode = 0;
  var profit = 50;
  var loss = -100;
  var maxes = [];
  var mins = [];
  var trades = [];
  var buys = [];
  var sells = [];
  var pcs = [];
  var usig = frame/1600;
  var dsig = usig * -1;
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

      function slope(r){
        var y2 = r[r.length-1];
        var y1 = r[r.length-4];

        var s = (y1 - y2) / (1 - 3);
        return round(s,2);

      }

  const Alpaca = require('@alpacahq/alpaca-trade-api');
  /////////////////////////////////////////////////////////////////////////////
  var alpaca = new Alpaca({
    keyId: 'PKBUNXWPBRSXGWTIY9G9',
    secretKey: '5WDrbVKMPgPGee1eZdyGbGaaPZQAHT6odOtpmWjh',
    paper: true,
    usePolygon: false
  });
  /////////////////////////////////////////////////////////////////////////////
  const tradeApi = alpaca.data_ws;
  tradeApi.onConnect(function() {
    console.log("Trade API Connected")
    tradeApi.subscribe(['alpacadatav1/T.TSLA']);
  });
  tradeApi.onDisconnect(() => {
    console.log("Trade API Disconnected");
    process.exit(1);
  })
  /////////////////////////////////////////////////////////////////////////////
  const execApi = alpaca.trade_ws;
  execApi.onConnect(function () {
    console.log("Exec API Connected")
    execApi.subscribe(['trade_updates']);
    tradeApi.connect();
  });
  execApi.onDisconnect(() => {
    console.log("Exec API Disconnected");
      process.exit(1);
  });
  //////// HEART
  ///////////////////////////////////////////////////////////////////////////////
  tradeApi.onStockTrades(async function(subject, data) {
    //values.push( parseFloat(data.price) );

    run(round( data.price * 100,0));


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

  ///////////////////////////////////////////////////////////////////////////////
  execApi.onOrderUpdate(data => {
    console.log('#EVENT', data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
    if(data.event == 'fill'){

      if(data.order.side == 'buy' && !testbuy){
        longbuy = round(data.order.filled_avg_price * 100, 0);
        rpush(name+'buys',longbuy);
      }

      if(data.order.side == 'sell' && !testsell){
        longsell = round(data.order.filled_avg_price * 100, 0);
        rpush(name+'sells',longsell);
      }

      if(longbuy && longsell){
         //console.log('*SCYTHE',longbuy, longsell, longsell - longbuy);
         longbuy = false;
         longsell = false;
         mode = 0;
         net += round((longnet)/100, 2);
         console.log('$'+net);
       }


    }

  });



//////////////////////////////////////////////////////////////////////////////
async function run(move){


      nm.push(move);
      if(nm.length > frame) nm.shift();
      if(nm.length < frame) return;

      var min = Math.min.apply(Math, nm);
      var max = Math.max.apply(Math, nm);
      var pc = getAvg(nm.slice(nm.length-20,nm.length-1));
      pcs.push(pc);
      if(pcs.length > 20) pcs.shift();
      var trend = slope(pcs);

      rpush(name+'max',max);
      rpush(name+'min',min);
      rpush(name+'move',move);
      rpush(name+'pc',pc);


      if(!mode && getPercentageChange(min, pc) < 0.04) mode = 1;

      if(mode == 1 && getPercentageChange(min, pc) > 0.05 && trend > 1 ){
        mode = 2;
        execTrade(true, 'market', 'gtc');
      }else{
        rpush(name+'buys',0);
      }

      if(longbuy && pc - longbuy < loss){
        mode = 4;
        execTrade(false, 'market', 'gtc');
      }else{
        if(mode == 2 && getPercentageChange(pc, max) < 0.04) mode = 3;
        if(mode == 3 && getPercentageChange(pc, max) > 0.05 && trend < 1 ){
          mode = 4;
          execTrade(false, 'market', 'gtc');
        }else{
          rpush(name+'sells',0);
        }
      }



}



/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    // Connect
    console.log('init...');
    await execApi.connect();



  } catch (err) {
    console.log(err);
  }

    alpaca.cancelAllOrders();

})();
