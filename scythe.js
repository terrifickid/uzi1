module.exports = class SCYTHE {
  constructor(name, frame) {
    const scope = this;
    //Libs
    const redis = require("redis");
    const red = redis.createClient();
    const { promisify } = require("util");


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
    this.mode = 0;
    this.buy = 0;
    this.sell = 0;
    this.buySIM = 0;
    this.sellSIM = 0;
    this.p;
    this.f;
    this.longnet = 0;
    this.net = 0;
    this.bSig = false;
    this.gate = true;


    var self = this;
    if(this.name !== 'FOO' && this.name !== 'foo'  ){
    //setInterval(function() { self.tickr() }, 6000);
    }
  }

  tickr(){
    console.log('#TICK', this.name,  this.nm.length, this.net);
  }

  async run(move){
    this.bSig = false;
    this.sSig = false;

    this.nm.push(move);
    if(this.nm.length > this.frame) this.nm.shift();
    if(this.nm.length < this.frame) return {name: this.name, bSig: this.bSig, sSig: this.sSig}

    var pc = this.round(this.getAvg(this.nm.slice(this.nm.length-this.round(this.frame/5,0), this.nm.length-1)),0);
    var pc2 = this.round(this.getAvg(this.nm.slice(this.nm.length-this.round(this.frame,0), this.nm.length-1)),0);

    //Big Slope
    this.pcs2.push(pc2);
    if(this.pcs2.length > this.frame) this.pcs2.shift();
    var trend2 = this.slope(this.pcs2);

    var min = Math.min.apply(Math, this.pcs2);
    var max = Math.max.apply(Math, this.pcs2);



    //Min slope
    this.mins.push(min);
    if(this.mins.length > this.frame) this.mins.shift();
    var trendMin = this.slope(this.mins);

    //Max slope
    this.maxes.push(max);
    if(this.maxes.length > this.frame) this.maxes.shift();
    var trendMax = this.slope(this.maxes);



    //Small Slope
    this.pcs.push(pc);
    if(this.pcs.length > this.frame) this.pcs.shift();
    var trend1 = this.slope(this.pcs);





    var momentum = (this.getPercentageChange(min, pc2) > this.getPercentageChange(pc2, max)) ? true : false;
    var above = (move > pc2) ? true : false;
    var hitMin = (move == min) ? true : false;
    var isGoodPrice = (this.getPercentageChange(pc, move) < 0.02) ? true : false;
    var slopeUp = (trend2 > 0) ? true : false;
    var slopeUp2 = (trend1 > 0) ? true : false;
    var masterSlope = (trendMin > 0 && trendMax > 0) ? true : false;

    var raise = (pc2 == max && pc > max) ? true : false;
    var drop = (pc < max) ? true : false;
    var start = (pc < min) ? true : false;


    if(this.gate){
      switch(this.mode){
        case 0:
          if(start){
            this.mode = 1;
          }
        break;
        case 1:
          if(raise){
          //if(pc > min && isGoodPrice){
            this.mode = 2;
            this.gate = false;
            this.bSig = true;

          }
        break;
        case 2:
          if(drop){
               this.mode = 0;
               this.sSig = true;
               this.gate = false;
          }
        break;
      }
  }

  //  if(masterSlope) this.bSig = true;
  /*
    if(this.gate){
      switch(this.mode){
        case 0:
          if(hitMin) this.mode = 1;
        break;
        case 1:
          if(above && isGoodPrice){
            this.gate = false;
            this.bSig = true;
            this.mode = 2
          }
        break;
        case 2:
        if(!above){
          this.gate = false;
          this.sSig = true;
          this.mode = 0
        }
        break;
      }
    }
    */


    //Save to Redis
    var log = JSON.stringify({move: move, max: max, min: min, pc: pc, pc2: pc2, buy: this.buy, sell: this.sell});
    this.buy = 0;
    this.sell = 0;
    await this.rpush(this.name, log);



    this.profitLog();

    return {name: this.name, bSig: this.bSig, sSig: this.sSig};
  }

  recordBuy(price){
    this.gate = true;
    this.buy = price;
    this.longbuy = price;
    console.log('buy!');

  }

  recordSell(price){
    this.gate = true;
    this.sell = price;
    this.longsell = price;
    console.log('sell');
  }

  async setMode(val){
    this.mode = val;
  }

  async setGate(val){
    this.gate = val;
  }

  async getMode(){
    return this.mode;
  }

  slope(r){
    var y2 = r[r.length-1];
    var y1 = r[r.length-5];
    return this.round(this.getPercentageChange(y1,y2),3);
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


    profitLog(){
      if(this.longbuy && this.longsell){
        console.log('*SCYTHE',this.longbuy, this.longsell, this.longsell - this.longbuy);
        this.net += this.longsell - this.longbuy;
        console.log(this.round(this.net / 100,2));
        this.longbuy = false;
        this.longsell = false;

      }
    }


}



    /*
    switch(bSig){
      case true:
        //if(trend2 > 0.7 && this.getPercentageChange(min, pc2) > 0.4 && pc > pc2 && this.getPercentageChange(pc2, pc) < 0.2){
        //if(trend2 > 0.005 && pc > pc2 && this.getPercentageChange(pc2, pc) < 0.1 && this.getPercentageChange(min, pc2) > 0.05){
        if(!this.mode){
          this.longbuy = pc2;
          this.mode = true;
        }
      break;
    }

    if(this.mode && pc < pc2){
      this.longsell = pc2;
      this.mode = false;
    }


    if(this.mode == 0 && this.getPercentageChange(min, pc) < 0.5) this.mode = 1;

    if(this.mode == 1 && trend2 > 0.7 && this.getPercentageChange(min, pc) > 0.1){
      this.longbuy = pc;
      this.mode = 2;
    }else{
      this.longbuy = 0;
    }

    //EXIT
    if(this.mode == 2 && pc > pc2) this.mode = 3;
    if(this.mode == 3 && pc < pc2){
      this.longsell = pc;
    }else{
      this.longsell = 0;
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
*/
