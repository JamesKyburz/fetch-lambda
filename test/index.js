const { test } = require('tap')
const proxyquire = require('proxyquire')
const fetch = require('..')

process.env.AWS_REGION = 'x'

test('incorrect url', async t => {
  t.plan(1)
  try {
    await fetch('http://example.com')
  } catch (e) {
    t.ok(e)
  }
})

test('get request', async t => {
  t.plan(4)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/', body.requestContext.path)
      t.equals('GET', body.httpMethod)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200,
            body: 'ok'
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/')
  t.equals(200, res.status)
  const txt = await res.text()
  t.equals('ok', txt)
})

test('path', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/hello', body.requestContext.path)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200,
          }
        }
      }
    }
  })
  await fetch('aws-lambda://function-name/hello')
})

test('get request with base64 body', async t => {
  t.plan(4)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/', body.requestContext.path)
      t.equals('GET', body.httpMethod)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200,
            body: Buffer.from('ok').toString('base64'),
            isBase64Encoded: true
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/')
  t.equals(200, res.status)
  const txt = await res.text()
  t.equals('ok', txt)
})

test('querystring', async t => {
  t.plan(4)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/', body.requestContext.path)
      t.equals('GET', body.httpMethod)
      t.deepEquals(
        {
          a: [1]
        },
        body.multiValueQueryStringParameters
      )
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/?a=1')
  t.equals(200, res.status)
})

test('request headers', async t => {
  t.plan(4)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/', body.requestContext.path)
      t.equals('GET', body.httpMethod)
      t.deepEquals(
        {
          'x-custom': '1',
          'x-multi': ['1', '2']
        },
        body.multiValueHeaders
      )
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/', {
    headers: {
      'x-custom': '1',
      'x-multi': ['1', '2']
    }
  })
  t.equals(200, res.status)
})

test('post body', async t => {
  t.plan(4)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.equals('/', body.requestContext.path)
      t.equals('POST', body.httpMethod)
      t.equals('hello', body.body)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/', {
    method: 'POST',
    body: 'hello'
  })
  t.equals(200, res.status)
})

test('redirect response', async t => {
  t.plan(2)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      return {
        status: 200,
        json () {
          return {
            statusCode: 302,
            multiValueHeaders: {
              lOcAtion: ['here']
            }
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/')
  t.equals(302, res.status)
  const location = res.headers.get('location')
  t.equals('here', location)
})

test('auth headers', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      const body = JSON.parse(options.body)
      t.deepEquals(
        {
          authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`
        },
        body.multiValueHeaders
      )
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  await fetch('aws-lambda://user:pass@function-name/')
})

test('timeout', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 25)
      })
    }
  })
  try {
    await fetch('aws-lambda://user:pass@function-name/', { timeout: 10 })
  } catch (e) {
    t.ok(e)
  }
})

test('base64 response', async t => {
  t.plan(2)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      return {
        status: 200,
        json () {
          return {
            statusCode: 200,
            body: Buffer.from('hello').toString('base64'),
            isBase64Encoded: true
          }
        }
      }
    }
  })
  const res = await fetch('aws-lambda://function-name/')
  t.equals(200, res.status)

  const txt = await res.text()
  t.equals('hello', txt)
})

test('lambda url with no version', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      t.equals('https://lambda.x.amazonaws.com/2015-03-31/functions/function-name/invocations', url)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  await fetch('aws-lambda://function-name/')
})

test('lambda url with version', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      t.equals('https://lambda.x.amazonaws.com/2015-03-31/functions/function-name%3A10/invocations', url)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  await fetch('aws-lambda://function-name:10/')
})

test('lambda url with latest version', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      t.equals('https://lambda.x.amazonaws.com/2015-03-31/functions/func/invocations', url)
      return {
        status: 200,
        json () {
          return {
            statusCode: 200
          }
        }
      }
    }
  })
  await fetch('aws-lambda://func:latest/')
})

test('non 200', async t => {
  t.plan(1)
  const fetch = proxyquire('..', {
    'node-fetch' (url, options) {
      return {
        status: 404,
        json () {
          return {
            Message: 'function not found'
          }
        }
      }
    }
  })

  try {
    await fetch('aws-lambda://function-name/')
  } catch (err) {
    t.equals(err.message, 'function not found')
  }
})

test('missing region', async t => {
  delete process.env.AWS_REGION
  t.plan(1)
  try {
    await fetch('aws-lambda://function-name/')
  } catch (e) {
    t.ok(e)
  }
})
