const assert = require('assert');
const Redis = require('ioredis');
const crypto = require('crypto');
const Koa = require('koa');
const request = require('supertest');

const redis = new Redis('redis://127.0.0.1:6379');

const Limiter = require('../lib/limiter');

const randomKey = () => crypto.randomBytes(8).toString('hex');

describe('Limiter', () => {
  it('getter setter', () => {
    const limiter = new Limiter(redis);
    assert.equal(limiter.client, redis);
    assert.equal(limiter.options.ttl, 60);
    assert.equal(limiter.ttl, 60);
    limiter.ttl = 30;
    assert.equal(limiter.ttl, 30);
    assert.equal(limiter.expired, '');
    limiter.expired = '14:00';
    assert.equal(limiter.expired, '14:00');
    assert.equal(limiter.prefix, 'super-limiter-');
    limiter.prefix = '';
    assert.equal(limiter.prefix, '');
  });

  it('exec', (done) => {
    const limiter = new Limiter(redis, {
      ttl: 10,
      max: 2,
    });
    const key = randomKey();
    let checkedCount = false;
    limiter.exec(key).then((count) => {
      assert.equal(count, 1);
      return limiter.exec(key);
    }).then((count) => {
      assert.equal(count, 2);
      checkedCount = true;
      return limiter.exec(key);
    }).catch((err) => {
      assert.equal(err.message, 'Exceeded the limit frequency');
      assert(checkedCount);
      done();
    });
  });

  it('exec in two ttl round', (done) => {
    const limiter = new Limiter(redis, {
      ttl: 1,
      max: 2,
    });
    const key = randomKey();
    let checkedCount = false;
    const anotherCheck = () => {
      limiter.exec(key).then((count) => {
        assert.equal(count, 1);
        done();
      }).catch(done);
    };
    limiter.exec(key).then((count) => {
      assert.equal(count, 1);
      return limiter.exec(key);
    }).then((count) => {
      assert.equal(count, 2);
      checkedCount = true;
      return limiter.exec(key);
    }).catch((err) => {
      assert.equal(err.message, 'Exceeded the limit frequency');
      assert(checkedCount);
      setTimeout(anotherCheck, 1500);
    });
  });

  it('set expired', (done) => {
    const limiter = new Limiter(redis, {
      expired: '24:00',
      ttl: 1,
      max: 2,
    });
    const key = randomKey();
    limiter.exec(key).then((count) => {
      assert.equal(count, 1);
      return limiter.exec(key);
    }).then((count) => {
      assert.equal(count, 2);
    }).catch(done);

    setTimeout(() => {
      limiter.exec(key).then(() => {
        done();
      }).catch((err) => {
        assert.equal(err.message, 'Exceeded the limit frequency');
        done();
      });
    }, 1500);
  });

  it('middleware', (done) => {
    const limiter = new Limiter(redis, {
      ttl: 3,
      max: 2,
      hash: (ctx) => {
        if (ctx.url === '/no-limit') {
          // pass limit middleware
          return '';
        }
        return ctx.url;
      },
    });

    const app = new Koa();
    app.use((ctx, next) => {
      return next().catch((err) => {
        ctx.status = 500;
        ctx.body = {
          message: err.message,
        };
      });
    });
    app.use(limiter.middleware());
    app.use((ctx) => {
      ctx.body = {};
    });
    const server = app.listen();

    const noLimitRequest = () => {
      request(server)
        .get('/no-limit')
        .expect(200)
        .end((err) => {
          if (err) {
            done(err);
          }
        });
    }
    for (let i = 0; i < 5; i++) {
      noLimitRequest();
    }
    request(server)
      .get('/user')
      .expect(200)
      .end((err) => {
        if (err) {
          done(err);
        }
      });
    request(server)
      .get('/user')
      .expect(200)
      .end((err) => {
        if (err) {
          done(err);
        }
      });
      setTimeout(() => {
        request(server)
          .get('/user')
          .expect(500)
          .end((err, res) => {
            assert.equal(res.body.message, 'Exceeded the limit frequency');
            request(server)
              .get('/users')
              .expect(200)
              .end(done);
          });
      }, 100);
  });

});
