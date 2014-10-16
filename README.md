alaveteli-stats
===============

Parse stats for an alaveteli instance and output details for searchable requests within a given date range.

Usage
=====

    var stats = require('alaveteli-stats');

    stats.parse({
      site: 'https://fyi.org.nz', // alaveteli site
      from: 2008-01-01, // from date — optional
      to: 2014-10-01, // to date - optional
      workers: 1 // how many parallel workers to run; defaults to 1
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
