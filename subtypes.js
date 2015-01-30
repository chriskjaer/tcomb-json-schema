'use strict';

var t = require('tcomb');

var Int = t.subtype(t.Num, function (x) {
  return x % 1 === 0;
}, 'Integer');

module.exports = {
  Int: Int
};
