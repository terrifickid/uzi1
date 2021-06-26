class SCYTHE {
  constructor(name, frame) {
    const scope = this;
    //Libs
    const QuickChart = require('quickchart-js');
    const redis = require("redis");
    const red = redis.createClient();
    const { promisify } = require("util");
    const Alpaca = require('@alpacahq/alpaca-trade-api');

    //Alpaca API
    this.alpaca = new Alpaca({
      keyId: 'PKBUNXWPBRSXGWTIY9G9',
      secretKey: '5WDrbVKMPgPGee1eZdyGbGaaPZQAHT6odOtpmWjh',
      paper: true,
      usePolygon: false
    });
    this.tradeApi = this.alpaca.data_ws;
    this.tradeApi.onConnect(function() {
      console.log("Trade API Connected")
      this.tradeApi.subscribe(['alpacadatav1/T.TSLA']);
    });
    this.tradeApi.onDisconnect(() => {
      console.log("Trade API Disconnected");
      process.exit(1);
    });
    this.execApi = this.alpaca.trade_ws;
    this.execApi.onConnect(function () {
      console.log("Exec API Connected")
      this.execApi.subscribe(['trade_updates']);
      tradeApi.connect();
    });
    this.execApi.onDisconnect(() => {
      console.log("Exec API Disconnected");
        process.exit(1);
    });
    ///////////////////////////////////////////////////////////////////////////////
    this.execApi.onOrderUpdate(data => { this.onOrderUpdate(data) });
    this.tradeApi.onStockTrades(async function(subject, data) {
      scope.run(round( data.price * 100,0), 0);
    });

    //REDIS FUNCS
    this.rpush = promisify(red.rpush).bind(red);
    this.lrange = promisify(red.lrange).bind(red);

    //Vars
    this.name = name;
    this.nm = [];
    this.frame = frame;
    this.moves = [];
    this.maxes = [];
    this.mins = [];
    this.pcs = [];
    this.pcs2 = [];
    this.buys = [];
    this.sells = [];
    this.mode = 0;
    this.longbuy = false;
    this.longsell = false;
    this.p;
    this.f;
    this.longnet = 0;
    this.net = 0;

  }

  run(move){

    this.nm.push(move);
    if(this.nm.length > this.frame) this.nm.shift();
    if(this.nm.length < this.frame) return;
    var min = Math.min.apply(Math, this.nm);
    var max = Math.max.apply(Math, this.nm);
    var pc = round(this.getAvg(this.nm.slice(this.nm.length-round(this.frame/10,0), this.nm.length-1)),0);
    var pc2 = round(this.getAvg(this.nm.slice(this.nm.length-round(this.frame,0), this.nm.length-1)),0);
    var trend2 = this.slope(pcs2);


    //TEST ENTRY RAPIER
    if(this.mode == 0 && this.getPercentageChange(min, pc) < 0.05) this.mode = 1;
    if(this.mode == 1 && trend2 > 0.7 && this.getPercentageChange(this.min, this.pc) > 0.1){
      this.buys.push(pc);
      this.longbuy = pc;
      this.mode = 2;

    }else{
      this.buys.push(0)
    }
    if(this.mode == 2 && pc > pc2) this.mode = 3;
    if(this.mode == 3 && pc < pc2){
      this.sells.push(pc);
      this.longsell = pc;
    }else if(this.longbuy && this.mode == 2 && pc < this.longbuy-10 && trend2 < 0){
      this.sells.push(pc);
      this.longsell = pc;
    }else{
      this.sells.push(0);
    }


    if(this.longbuy && this.longsell){
      console.log('*SCYTHE',this.longbuy, this.longsell, this.longsell - this.longbuy);
      this.longnet += this.longsell - this.longbuy;
      if(this.longsell - this.longbuy >= 0) p++;
      if(this.longsell - this.longbuy < 0)f++;
      this.longbuy = false;
      this.longsell = false;
      this.mode = 0;
    }

    //this.maxes.push(max);
    //this.mins.push(min);
    //this.moves.push(move);
    //this.pcs.push(pc);
    //this.pcs2.push(pc2);

    var log = {move: move, max: max, min: min, pc: pc, pc2: pc2};
    console.log(log);
    //Save to Redis
    rpush(name, JSON.stringify(log));

  }

  slope(r){
    var y2 = r[r.length-1];
    var y1 = r[r.length-4];

    var s = (y1 - y2) / (1 - 3);
    return round(s,2);
  }


  round(value, decimals) {
    var val = Number(Math.round(value+'e'+decimals)+'e-'+decimals);
    if(isNaN(val)) return 0;
    return val;
  }

  getAvg(grades) {
    const total = grades.reduce((acc, c) => parseInt(acc) + parseInt(c), 0);
    return total / grades.length;
  }

  getPercentageChange(ask, bid){
    if(!ask || !bid) return 0;
    ask = parseInt(ask);
    bid = parseInt(bid);
    var pc = [(bid - ask)/ask] * 100;
    if(pc == 'Infinity') return 0;
    return pc;
    }

  async chart(input){
      var min = Math.min.apply(Math, input.moves);
      var max = Math.max.apply(Math, input.moves);
      const myChart = new QuickChart();

      var data = {
      labels: Object.keys(input.moves),
      datasets: [{
        label: "Price",
        data: input.moves,
        borderColor: '#000',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: false,
        fill: false,

      },{
        label: "PCS",
        data: input.pcs,
        borderWidth: 1,
        borderColor: '#0FF',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 0,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "PCS2",
        data: input.pcs2,
        borderWidth: 1,
        borderColor: '#000',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 0,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "MAX",
        data: input.maxes,
        borderWidth: 1,
        borderColor: '#0f0',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "MIN",
        data: input.mins,
        borderWidth: 1,
        borderColor: '#f00',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "SELL",
        data: input.sells,
        borderWidth: 1,
        borderColor: '#f00',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 10,
        showLine: false,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "BUY",
        data: input.buys,
        borderWidth: 1,
        borderColor: '#00f',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 10,
        showLine: false,
        fill: false,
        yAxisID: 'y-axis-price'
      },]
    };

    var options = {
      scales: {
            yAxes: [{
              gridLines: {
                lineWidth: 1,
              },
                ticks: {
                    min: min,
                    max: max,
                },
                id: 'y-axis-price',
            },{
                ticks: {
                    min: min,
                    max: max
                },
                id: 'y-axis-rsi',
            }]
        },
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 80,
          fontColor: 'black'
        }
      }
    };
    myChart.setConfig({
        type: 'line',
        data: data,
        options: options,
    });

    myChart.setWidth(1600).setHeight(700);
    const url = await myChart.getShortUrl();
    return url;
    }

  async onOrderUpdate(data){
    console.log('#EVENT', data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
    if(data.event == 'fill'){

      if(data.order.side == 'buy'){
        longbuy = round(data.order.filled_avg_price * 100, 0);
        rpush(name+'buys',longbuy);
      }

      if(data.order.side == 'sell'){
        longsell = round(data.order.filled_avg_price * 100, 0);
        rpush(name+'sells',longsell);
      }

      if(longbuy && longsell){
        console.log('*SCYTHE',longbuy, longsell, longsell - longbuy);
        longnet += longsell - longbuy;
        if(longsell - longbuy >= 0) p++;
        if(longsell - longbuy < 0)f++;
        longbuy = false;
        longsell = false;
        mode = 0;
        net += round((longnet)/100, 2);
        console.log('$'+net);
      }
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  async execTrade(t,type,time, limit_price = null){
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



  get test(){
    this.run(100);
    return 'fin';
  }
}


var scythe = new SCYTHE('TSLALRX');
console.log(scythe.test);

process.exit();
