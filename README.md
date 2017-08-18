# superlimiter

[![Build Status](https://travis-ci.org/vicanso/superlimiter.svg?branch=master)](https://travis-ci.org/vicanso/superlimiter)
[![Coverage Status](https://img.shields.io/coveralls/vicanso/superlimiter/master.svg?style=flat)](https://coveralls.io/r/vicanso/superlimiter?branch=master)
[![npm](http://img.shields.io/npm/v/superlimiter.svg?style=flat-square)](https://www.npmjs.org/package/superlimiter)
[![Github Releases](https://img.shields.io/npm/dm/superlimiter.svg?style=flat-square)](https://github.com/vicanso/superlimiter)


## Installation

```js
$ npm i superlimiter -S
```

## Example

Use for koa frequency limit

```js
const Koa = require('koa');
const Limiter = require('superlimiter');

const limiter = new Limiter(redis, {
  ttl: 60,
  max: 10,
  hash: (ctx) => {
    if (!ctx.session || !ctx.session.user) {
      return '';
    }
    return ctx.session.user.account;
  },
});

const app = new Koa();

// user session
app.use(session());

app.use(limiter.middleware());

// other middlewares
...

app.listen(8080);

```


## API

### constructor

- `client` The redis client

- `options` The options for limiter

- `options.ttl` The ttl for frequency limit, default is `60`

- `options.max` The max count for frequency limit, default is `10`

- `options.expired` The expired for frequency limit, it should be `HH:mm`. If it's set, the ttl will be ignored

- `options.hash` The function to get the hash key, default is `_.identity`, if return `''`, the limit will be ignore

- `options.prefix` The prefix for the cache key

- `options.err` The error will be throw when count max than `options.max`, default is `new Error('Exceeded the limit frequency')`

```js
const Redis = require('ioredis');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});
```

### seter

`ttl` `expired` `prefix` can be reset

```js
const Redis = require('ioredis');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});
limiter.ttl = 60;
limiter.expired = '23:30';
limiter.prefix = 'my-test-';
```

### getter

`client` `options` `ttl` `expired` `prefix`

```js
const Redis = require('ioredis');
const assert = require('assert');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});
assert.equal(limiter.client, redis);
// {ttl : 10, .. ..}
console.info(limiter.options);
assert.equal(limiter.ttl, 10);
assert.equal(limiter.expired, '');
assert.equal(limiter.prefix, 'super-limiter-');
```

### exec

Inc the count of the key, if the count bigger than max, it will be throw an error, otherwise it will be resolve. If the hash function return `''`, it will be resolve without any change of count.

- `...args` The arguments for the hash function

```js
const Redis = require('ioredis');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});
limiter.exec('mykey').then(() => {
  console.info('pass');
}).catch(console.error);
```

### getCount

- `...args` The arguments for the hash function 

```js
const Redis = require('ioredis');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});
limiter.getCount('mykey').then((count) => {
  console.info(count);
}).catch(console.error);
```

### middleware

- `type` The middleware's type, it can be `koa` or `express`, default is `koa`.

The middleware for koa and express. For koa, it will use `ctx` for the hash argument. For express, it will use `req`, `res` for the hash argument.

```js
const Koa = require('koa');
const Limiter = require('superlimiter');

const limiter = new Limiter(redis, {
  ttl: 60,
  max: 10,
  hash: (ctx) => {
    if (!ctx.session || !ctx.session.user) {
      return '';
    }
    return ctx.session.user.account;
  },
});

const app = new Koa();

// user session
app.use(session());

app.use(limiter.middleware());

// other middlewares
...

app.listen(8080);

```

### keys

Get the keys of this limiter

- `withTTL` Get the ttl of key if set `true`, default is `false`

```js
const Redis = require('ioredis');
const Limiter = require('superlimiter');

const redis = new Redis('redis://127.0.0.1:6379');
const limiter = new Limiter(redis, {
  ttl: 10,
});

// ["...", "..."]
limiter.keys().then(console.info).catch(console.error);

// [{"key": "...", "ttl": ..}, ...]
limiter.keys(true).then(console.info).catch(console.error);
```
