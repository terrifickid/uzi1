const finnhub = require('finnhub');
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = "c029mff48v6vllnr4hig"; // Replace this
const finnhubClient = new finnhub.DefaultApi();


//Aggregate Indicator
finnhubClient.aggregateIndicator("AAPL", "D", (error, data, response) => {
    console.log('aggregate',data)
});

// News sentiment
finnhubClient.newsSentiment("AAPL", (error, data, response) => {
    console.log('news',data)
});

// Price target
finnhubClient.priceTarget("AAPL", (error, data, response) => {
   console.log('price',data)
});

// Recommendation trends
finnhubClient.recommendationTrends("AAPL", (error, data, response) => {
    console.log('rec',data)
});

// Support resistance
finnhubClient.supportResistance("AAPL", "D", (error, data, response) => {
    console.log('supres',data)
});
