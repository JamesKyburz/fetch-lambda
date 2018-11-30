const aws4 = require('aws4')
const fetch = require('node-fetch')
const { URL } = require('url')

module.exports = async (url, options = {}) => {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION

  if (!region) {
    throw new TypeError('AWS_REGION/AWS_DEFAULT_REGION not set')
  }

  url = url.replace(/:latest/i, '')
  const {
    protocol,
    username,
    password,
    host: functionName,
    pathname,
    searchParams
  } = new URL(url)

  if (protocol !== 'aws-lambda:') {
    throw new TypeError('only aws-lambda protocol supported')
  }

  const auth = username
    ? {
      authorization:
          'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
    }
    : {}

  const multiValueHeaders = { ...auth, ...options.headers }
  const searchKeys = [...searchParams.keys()]
  const searchValues = [...searchParams.values()]
  const multiValueQueryStringParameters =
    searchKeys.length &&
    searchKeys
      .map((x, i) => [x, searchValues[i]])
      .reduce((sum, [key, value]) => {
        sum[key] = sum[key] || []
        sum[key].push(value)
        return sum
      }, {})

  const { hostname, path, method, headers, body } = aws4.sign({
    region,
    method: 'POST',
    service: 'lambda',
    path: `2015-03-31/functions/${functionName}/invocations`,
    body: JSON.stringify({
      requestContext: { path: pathname },
      body: options.body,
      multiValueHeaders,
      multiValueQueryStringParameters,
      isBase64Encoded: false,
      httpMethod: options.method
        ? options.method
        : options.body ? 'POST' : 'GET'
    })
  })

  const res = await fetch(`https://${hostname}/${path}`, {
    method,
    headers,
    body,
    timeout: options.timeout || 30000
  })

  if (res.status !== 200) {
    const { Message: message } = await res.json()
    throw new Error(message)
  }

  const response = await res.json()
  const responseBody = Buffer.from(
    response.body || '',
    response.isBase64Encoded ? 'base64' : undefined
  ).toString()

  const responseHeaders = Object.keys(response.multiValueHeaders || {}).reduce(
    (sum, key) => ({
      ...sum,
      [key.toLowerCase()]: response.multiValueHeaders[key]
    }),
    {}
  )
  return {
    headers: {
      get (key) {
        return responseHeaders[key.toLowerCase()].join(', ')
      }
    },
    status: response.statusCode,
    text: () => Promise.resolve(responseBody),
    json: () => Promise.resolve(JSON.parse(responseBody))
  }
}
