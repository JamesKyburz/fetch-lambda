# fetch-lambda 

fetch for lambda

* doesn't ship with aws-sdk
* only aws-lambda supported for now
* doesn't fully support fetch only the basics
* only a string body is supported

[![js-standard-style](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://github.com/feross/standard)
[![Greenkeeper badge](https://badges.greenkeeper.io/JamesKyburz/fetch-lambda.svg)](https://greenkeeper.io/)
[![build status](https://api.travis-ci.org/JamesKyburz/fetch-lambda.svg)](https://travis-ci.org/JamesKyburz/fetch-lambda)
[![downloads](https://img.shields.io/npm/dm/fetch-lambda.svg)](https://npmjs.org/package/fetch-lambda)

### usage

```javascript
const fetch = require('fetch-lambda')

fetch('aws-lambda://function.staging.version', {
  method: 'POST'
})
```

# license

[Apache License, Version 2.0](LICENSE)
