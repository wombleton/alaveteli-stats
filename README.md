alaveteli-stats
===============

Parse stats for an alaveteli instance and output details for searchable requests within a given date range.

Usage
=====

    var stats = require('alaveteli-stats');

    stats.parse({
      site: 'https://fyi.org.nz',
      from: 2008-01-01
      to: 2014-10-01
    }, function(err, data) {
      /**
       where data is an array of the following form
       {
            title: request title
            url: request url
            status: success|rejected|not_held|in_progress
            elapsed_time: working days for request
            body: name of body on alaveteli site
            body_url: url of body on alaveteli site
       }
      */
    };
