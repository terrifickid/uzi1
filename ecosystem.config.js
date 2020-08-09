module.exports = {
  apps : [{
    name: 'btcusdt',
    script: 'scythe.js',
    watch: false,
    args: 'btcusdt 2 4',
    log_file: 'scythe.log',
  }]
};
