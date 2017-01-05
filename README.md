# dojo-request

[![Build Status](https://travis-ci.org/dojo/request.svg?branch=master)](https://travis-ci.org/dojo/request)
[![codecov](https://codecov.io/gh/dojo/request/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/request)
[![npm version](https://badge.fury.io/js/dojo-request.svg)](http://badge.fury.io/js/dojo-request)

Tools for making HTTP requests using an normalized API.

## Features

This module allows the consumer to make HTTP requests using Node, XMLHttpRequest, or the Fetch API. The details of
these implementations are exposed through a common interface.

With this module you can,

* Easily make simple HTTP requests
* Convert response bodies to common formats like text, json, or html
* Access response headers of a request before the body is downloaded
* Monitor progress of a request
* Stream response data

## How do I use this package?

### Quick Start

To make simple GET requests, you must register your provider (node, or XHR) then make the request.  The overall
format of the API resembles the [Fetch Standard](https://fetch.spec.whatwg.org/).

```ts
import request from 'dojo-request';
import node from 'dojo-request/providers/node';

request.setDefaultProvider(node);

request.get('http://www.example.com').then(response => {
    return response.text();
}).then(html => {
    console.log(html);
});
```

Responses can be returned as an `ArrayBuffer`, `Blob`, XML document, JSON object, or text string.

You can also easily send request data,

```ts
request.post('http://www.example.com', {
    body: 'request data here'
}).then(response => {
    // ...
});
```

## Advanced Usage

### Reading Response Headers

This approach allows for processing of response headers _before_ the response body is available.

```ts
request.get('http://www.example.com').then(response => {
    const expectedSize = Number(response.headers.get('content-length') || 0);
});
```

### Response Events

`Response` objects also emit `start`, `end`, `progress`, and `data` events. You can use these events to monitor download progress
or stream a response directly to a file.

```ts
request.get('http://www.example.com').then(response => {
    response.on('progress', (event: ProgressEvent) => {
        console.log(`Total downloaded: ${event.totalBytesDownloaded}`);
    });

    return response.blob();
}).then(blob => {
    // do something with the data
});
```

Note that there are some caveats when using these events. XHR cannot stream data (a final `data` event is sent at the end however).

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing information

© 2004–2016 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
