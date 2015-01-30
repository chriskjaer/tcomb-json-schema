'use strict';

var t = require('tcomb');
var fcomb = require('fcomb');
var Int = require('./subtypes').Int;

var Str = t.Str;
var Num = t.Num;
var Bool = t.Bool;
var Obj = t.Obj;
var Arr = t.Arr;
var subtype = t.subtype;
var enums = t.enums;

var SchemaType = enums.of(
  'null string number boolean object array integer', 'SchemaType'
);

function and(f, g) {
  return f ? fcomb.and(f, g) : g;
}

function isInteger(n) {
  return n % 1 === 0;
}

var types = {

  string: function (s) {
    if (s.hasOwnProperty('enum')) {
      return enums.of(s['enum']);
    }
    var predicate;
    if (s.hasOwnProperty('minLength')) {
      predicate = and(predicate, fcomb.minLength(s.minLength));
    }
    if (s.hasOwnProperty('maxLength')) {
      predicate = and(predicate, fcomb.maxLength(s.maxLength));
    }
    if (s.hasOwnProperty('pattern')) {
      predicate = and(predicate, fcomb.regexp(new RegExp(s.pattern)));
    }
    return predicate ? subtype(Str, predicate) : Str;
  },

  number: function (s) {
    var predicate;
    if (s.hasOwnProperty('minimum')) {
      predicate = s.exclusiveMinimum ?
        and(predicate, fcomb.gt(s.minimum)) :
        and(predicate, fcomb.gte(s.minimum));
    }
    if (s.hasOwnProperty('maximum')) {
      predicate = s.exclusiveMaximum ?
        and(predicate, fcomb.lt(s.maximum)) :
        and(predicate, fcomb.lte(s.maximum));
    }
    if (s.hasOwnProperty('integer') && s.integer) {
      predicate = and(predicate, isInteger);
    }
    return predicate ? subtype(Num, predicate) : Num;
  },

  integer: function (s) {
    var predicate;
    if (s.hasOwnProperty('minimum')) {
      predicate = s.exclusiveMinimum ?
        and(predicate, fcomb.gt(s.minimum)) :
        and(predicate, fcomb.gte(s.minimum));
    }
    if (s.hasOwnProperty('maximum')) {
      predicate = s.exclusiveMaximum ?
        and(predicate, fcomb.lt(s.maximum)) :
        and(predicate, fcomb.lte(s.maximum));
    }
    return predicate ? subtype(Int, predicate) : Int;
  },

  boolean: function (s) {
    return Bool;
  },

  object: function (s) {
    var props = {};
    var hasProperties = false;
    var required = {};
    if (s.required) {
      s.required.forEach(function (k) {
        required[k] = true;
      });
    }
    for (var k in s.properties) {
      if (s.properties.hasOwnProperty(k)) {
        hasProperties = true;
        var type = toType(s.properties[k]);
        props[k] = required[k] || type === Bool ? type : t.maybe(type);
      }
    }
    return hasProperties ? t.struct(props, s.description) : Obj;
  },

  array: function (s) {
    if (s.hasOwnProperty('items')) {
      var items = s.items;
      if (Obj.is(items)) {
        return t.list(toType(s.items));
      }
      return t.tuple(items.map(toType));
    }
    var predicate;
    if (s.hasOwnProperty('minItems')) {
      predicate = and(predicate, fcomb.minLength(s.minItems));
    }
    if (s.hasOwnProperty('maxItems')) {
      predicate = and(predicate, fcomb.maxLength(s.maxItems));
    }
    return predicate ? subtype(Arr, predicate) : Arr;
  },

  null: function () {
    return t.irreducible('Null', function (x) {
      return x === null;
    });
  }

};

function toType(s) {
  t.assert(Obj.is(s));
  if (!s.hasOwnProperty('type')) {
    return t.Any;
  }
  var type = s.type;
  if (SchemaType.is(type)) {
    return types[type](s);
  }
  if (Arr.is(type)) {
    return t.union(type.map(function (type) {
      return types[type](s);
    }));
  }
  t.fail(t.util.format('unhandled %j', s));
}

module.exports = toType;
