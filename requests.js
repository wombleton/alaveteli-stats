'use strict';

var _ = require('lodash'),
  async = require('async'),
  request = require('request'),
  moment = require('moment'),
  workwork = require('workwork')('nz'),
  requestQueue,
  onComplete,
  cache = {},
  result;

module.exports = {
  onComplete: function(fn) {
    onComplete = fn;
    requestQueue.resume();
  },
  queueRequest: function(options) {
    var uri = options.requestURI;

    if (!requestQueue) {
      requestQueue = async.queue(scrapeRequest, options.workers || 1);
      requestQueue.pause(); // start once all searches done
      requestQueue.drain = function() {
        if (onComplete) {
          result.requests = _.sortBy(result.requests, 'created_at');
          onComplete(null, result);
        }
      };
      result = _.assign({}, _.pick(options, 'site', 'from', 'to'), {
        requests: []
      });
      result.from = result.from.format('YYYY-MM-DD');
      result.to = result.to.format('YYYY-MM-DD');
    }
    // don't scrape the same url twice
    if (!cache[uri]) {
      cache[uri] = true;

      requestQueue.push(options);
    }
  }
};

function scrapeRequest(options, callback) {
  var uri = options.requestURI;

  console.log('Fetching %s with %s items left in the worker queue [%s].', uri, requestQueue.length(), requestQueue.concurrency);
  request({
    strictSSL: false,
    uri: options.site + uri
  }, function(err, response, body) {
    var createdAt,
      item,
      match;

    if (err) {
      return callback(err);
    }

    item = JSON.parse(body);
    // the search looks for updates, but we only want
    // items CREATED within the to/from
    createdAt = moment(item.created_at);
    match = matchTags(options, item);
    if (createdAt >= options.from && createdAt <= options.to && match) {
      storeItem(options, item, callback);
    } else {
      callback();
    }
  });
}

function matchTags(options, item) {
  var itemTags = _.compact(_.flatten(item.public_body.tags)),
    tags = options.tags || [];

  return _.intersection(itemTags, tags).length;
}

function storeItem(options, item, callback) {
  var status = calculateStatus(item.described_state),
    elapsed = calculateElapsed(item, status),
    timeline = calculateTimeline(item, status);

  result.requests.push({
    created_at: moment(item.created_at).toISOString(),
    title: item.title,
    url: options.site + '/request/' + item.url_title,
    status: status,
    elapsed_time: elapsed,
    timeline: timeline,
    body: item.public_body.name,
    body_url: options.site + '/body/' + item.public_body.url_name
  });
  console.log("%s requests captured so far.", result.requests.length);
  callback();
}

function lastResponse(item, status) {
  var responses = _.filter(item.info_request_events, function(e) {
    return e.event_type === 'response' && e.calculated_state === item.described_state;
  });

  return _.first(responses);
}

function calculateTimeline(item, status) {
  var response = lastResponse(item),
    end = response && response.created_at,
    timeline = moment(item.created_at).format('YYYY-MM-DD') + ' - ';

  if (end && status) {
    timeline += moment(end).format('YYYY-MM-DD');
  }
  return timeline;
}

function calculateElapsed(item, status) {
  var start = item.created_at,
    response,
    excepts = [
      'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=27,28,29,30,31',
      'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15'
    ],
    end;

  response = lastResponse(item);

  end = response && response.created_at;
  if (end && status) {
    return workwork.between(start, end, excepts).length;
  } else {
    return workwork.between(start, new Date(), excepts).length;
  }
}

function calculateStatus(key) {
  if (_.contains(['partially_successful', 'successful'], key)) {
    return 'success';
  } else if (key === 'not_held') {
    return 'not_held';
  } else if (key === 'rejected') {
    return 'rejected';
  } else {
    return 'in_progress';
  }
}
