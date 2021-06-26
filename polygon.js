module.exports = class POLYGON {
  constructor() {
    var SCYTHE = require("./scythe.js");
    this.scythe = new SCYTHE('FOO',0);
    this.axios = require('axios');
    var Sentiment = require('sentiment');
    this.sentiment = new Sentiment();
    this.key = 'AK77SSKN94TCVERTJVLH';

  }

  //SCAN FOR TARGETS
  async all(){
    var scope = this;
    var res = await this.axios.get('https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers', {
        params: {
          apiKey: this.key
        }
      });

      var data = res.data.tickers.map(function(item){
        return {

          ticker: item.ticker,
          todaysChange: item.todaysChange,
          v: item.day.v * item.day.vw
        }
      });

    
      var f = await Promise.all(data.sort(function(a, b){
          return b.v - a.v;
        }).slice(0,500).filter(function(item){
          if(item.todaysChange > 0) return true;
          return false;
        }).sort(function(a, b){
          return b.todaysChange - a.todaysChange;
        }).slice(0,30).map(async function(item){
          item.news = await scope.news(item.ticker);
          return item;
        }));

      return f.filter(function(item){
        if(item.news > 0) return true;
        return false;
      });
  }

  //Get News Sentiment
  async news(symbol){
    var scope = this;
    var sents = [];
    var res = await this.axios.get('https://api.polygon.io/v1/meta/symbols/'+symbol+'/news', {
        params: {
          perpage: 20,
          page: 1,
          apiKey: this.key
        }
      });

    var run = await Promise.all(res.data.map(async function(item){
        var sent = scope.sentiment.analyze(item.title);
       sents.push(sent.score);
        var sent = scope.sentiment.analyze(item.summary);
        sents.push(sent.score);
        return false;
    }));

    if(isNaN(this.scythe.getAvg(sents))) return 0;

    return this.scythe.getAvg(sents);


  }


}






/*

async function gainers(){
  var res = await axios.get('https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers', {
      params: {
        apiKey: key
      }
    });

  var p = await Promise.all(res.data.tickers.map(async function(item){
    var nRes = await news(item.ticker);
    return {
      ticker: item.ticker,
      todaysChange: item.todaysChange,
      todaysChangePerc: item.todaysChangePerc,
      news: nRes
    }
  }));

  return p.sort(function(a, b){
    return b.news - a.news;
  })
}

*/



//?&apiKey=3IFgvXd7ipHCIPPzuqDjcmpZgeXPgkQZ
