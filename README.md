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

- `options.hash` The function to get the hash key, default is `_.identity`

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

### exec

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

### middleware

- `hash` the hash function, if the hash function return `''`, it will ignore limit check.


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
