const { URL } = require('url')
const AWS = require('aws-sdk')

module.exports = (url, options = {}) => {
  const { protocol, username, password, host, pathname, search } = new URL(url)

  if (protocol !== 'aws-lambda:') {
    throw new TypeError('only aws-lambda protocol supported')
  }

  const [functionName, stage, version] = host.split('.')
  if (!stage) throw new TypeError('no function stage provided')
  if (!version) throw new TypeError('no function version provided')

  const body = options.body
  if (body && typeof body !== 'string') {
    throw new TypeError('only string body supported')
  }

  const method = options.method || 'GET'

  const auth = username
    ? {
      authorization:
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    }
    : {}

  const headers = Object.assign({}, auth, options.headers)
  const timeout = options.timeout || 3000
  const maxRetries = options.retries || 0

  const params = {
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    LogType: 'None',
    Qualifier: version,
    Payload: JSON.stringify({
      requestContext: {
        path: `/${stage}${pathname}${search}`,
        protocol: 'HTTP/1.1',
        stage
      },
      httpMethod: method,
      pathParameters: pathname,
      queryStringParameters: search,
      headers,
      body,
      isBase64Encoded: false
    })
  }

  const lambda = new AWS.Lambda({
    apiVersion: '2015-03-31',
    maxRetries,
    httpOptions: { timeout }
  })

  return lambda
    .invoke(params)
    .promise()
    .then(({ Payload: payload }) => {
      const res = JSON.parse(payload)
      const headers = Object.keys(res.headers || {}).reduce(
        (sum, key) =>
          Object.assign(sum, { [key.toLowerCase()]: res.headers[key] }),
        {}
      )
      const data = Buffer.from(
        res.body || '',
        res.isBase64Encoded ? 'base64' : undefined
      ).toString()

      return {
        status: res.statusCode,
        text: () => Promise.resolve(data),
        json: () => Promise.resolve(JSON.parse(data)),
        headers: {
          get (key) {
            return headers[key.toLowerCase()]
          }
        }
      }
    })
    .catch(err => {
      return {
        status: 502,
        text: () => Promise.resolve(err),
        json: () => Promise.reject(err),
        headers: {
          get (key) {}
        }
      }
    })
}
