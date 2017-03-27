const EventEmitter = require('events');
const _ = require('lodash');

const clientSymbol = Symbol('client');
const optionsSymbol = Symbol('options');
const secondsOfOneDay = 24 * 3600;

/**
 * Set a frequency limiter for function
 * @example
 * const limiter = new Limiter(redisClient, {
 *  ttl: 300,
 *  hash: (ctx) => ctx.url,
 * });
 * limiter.exec(ctx).then(() => {
 * });
 */
class Limiter extends EventEmitter {
  constructor(client, options) {
    if (!client) {
      throw new Error('client can not be null');
    }
    super();
    this[clientSymbol] = client;
    this[optionsSymbol] = _.extend({
      ttl: 60,
      max: 10,
      expired: '',
      hash: _.identity,
      prefix: 'super-limiter-',
      err: new Error('Exceeded the limit frequency'),
    }, options);
  }
  get client() {
    return this[clientSymbol];
  }
  get options() {
    return _.extend({}, this[optionsSymbol]);
  }
  set ttl(v) {
    this[optionsSymbol].ttl = v;
  }
  get ttl() {
    return this.options.ttl;
  }
  set expired(v) {
    this[optionsSymbol].expired = v;
  }
  get expired() {
    return this.options.expired;
  }
  get prefix() {
    return this.options.prefix;
  }
  set prefix(v) {
    this[optionsSymbol].prefix = v;
  }
  getTTL() {
    const options = this.options;
    const {
      ttl,
      expired,
    } = options;
    if (expired && /\d\d:\d\d/.test(expired)) {
      const arr = expired.split(':');
      const date = new Date();
      date.setHours(arr[0]);
      date.setMinutes(arr[1]);
      date.setSeconds(0);
      const offset = Math.floor((date.getTime() - Date.now()) / 1000);
      if (offset >= 0) {
        return offset;
      }
      return secondsOfOneDay + offset;
    }
    return ttl;
  }
  /**
   * exec limit, it will inc the count of key.
   * if the count is 1 (the first time), it will set the expire ttl.
   */
  exec(...args) {
    const client = this.client;
    const options = this.options;
    const {
      hash,
      prefix,
      max,
      err,
    } = options;
    const key = `${prefix}${hash(...args)}`;
    return client.incr(key).then((count) => {
      if (count > max) {
        throw err;
      }
      if (count === 1) {
        /* istanbul ingore next */
        client.expire(key, this.getTTL()).catch((error) => {
          const message = `Set expire for ${key} fail, ${error.message}`;
          if (this.listenerCount('error')) {
            this.emit('error', new Error(message));
          }
        });
      }
      return Promise.resolve(count);
    });
  }
  middleware() {
    const hash = this.options.hash;
    return (ctx, next) => {
      const key = hash(ctx);
      if (!key) {
        return next();
      }
      return this.exec(ctx).then(next);
    };
  }
}

module.exports = Limiter;
