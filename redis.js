module.exports = class REDIS {
  constructor(){
    const redis = require("redis");
    const red = redis.createClient();
    const { promisify } = require("util");
    //REDIS FUNCS
    this.rpush = promisify(red.rpush).bind(red);
    this.lrange = promisify(red.lrange).bind(red);
    this.del = promisify(red.del).bind(red);
    this.keys = promisify(red.keys).bind(red);
    this.llen = promisify(red.llen).bind(red);
  }

  async LRANGE(name,start,stop){
    return await this.lrange(name,start,stop);
  }

  async RPUSH(name,val){
    return await this.rpush(name, val);
  }

  async DEL(key){
    return await this.del(key);
  }

  async KEYS(){
    return await this.keys('*');
  }

  async LLEN(name){
    return await this.llen(name);
  }

}
