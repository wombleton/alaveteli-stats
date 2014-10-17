'use strict';
var search = require('./search');

module.exports = {
  parse: function(options, callback) {
    search(options, callback);
  }
};
