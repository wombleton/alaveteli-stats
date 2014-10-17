'use strict';
var _ = require('lodash'),
  async = require('async'),
  moment = require('moment'),
  cheerio = require('cheerio'),
  request = require('request'),
  url = require('url'),
  util = require('util'),
  searchQueue,
  onComplete,
  requests = require('./requests');

searchQueue = async.queue(doRequest, 3);
searchQueue.drain = function() {
  requests.onComplete(onComplete);
};

/**
 * Accept the options for a search & initialise search queue
 * For each
 */
module.exports = function(options, callback) {
  onComplete = callback;
  startRequests(options);
};

function doRequest(options, callback) {
  var uri = options.searchURI;

  request({
    strictSSL: false,
    uri: uri
  }, function(err, response, body) {
    if (err) {
      return callback(err);
    }
    parseBody(_.assign({}, options, {
      body: body
    }), callback);
  });
}

function parseBody(options, callback) {
  var body = options.body,
    uri = options.searchURI,
    $ = cheerio.load(body),
    next = $('.pagination .next_page').attr('href'),
    requestLinks = $('.request_listing .head a');

  if (next) {
    searchQueue.push(_.assign({}, options, {
      searchURI: options.site + next
    }));
  }

  console.log('%s links from %s', requestLinks.length, uri);
  _.each(requestLinks, function(link) {
      var uri = url.parse($(link).attr('href'));

      delete uri.hash;

      requests.queueRequest(_.assign({}, options, {
        requestURI: url.format(uri) + '.json'
      }));
  });

  callback();
}

function startRequests(options) {
  var from = options.from || moment().subtract(10, 'years'),
    to = options.to || moment(),
    uri,
    start,
    end;

  from = moment(from).startOf('month');
  options.from = from.clone();
  to = moment(to).startOf('month');
  options.to = to.clone();

  while (from < to) {
    start = from.clone().startOf('month').format('YYYY-MM-DD');
    end = from.clone().endOf('month').format('YYYY-MM-DD');
    uri = util.format('%s/list/all?query=&request_date_after=%s&request_date_before=%s&commit=Search', options.site, start, end);
    searchQueue.push(_.assign({}, options, {
      searchURI: uri
    }));
    from.add(1, 'month');
  }
}
