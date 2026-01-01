
// core/polyfills.ts
// Polyfills for older devices/browsers ensuring compatibility with Android 7+ and Safari versions.

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function(search: string, rawPos: number) {
      var pos = rawPos > 0 ? rawPos|0 : 0;
      return this.substring(pos, pos + search.length) === search;
    }
  });
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search: string, start?: number) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    }
    return this.indexOf(search, start) !== -1;
  };
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate: (value: any, index: number, obj: any[]) => boolean) {
      if (this == null) throw new TypeError('"this" is null or not defined');
      var o = Object(this);
      var len = o.length >>> 0;
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var thisArg = arguments[1];
      var k = 0;
      while (k < len) {
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) return kValue;
        k++;
      }
      return undefined;
    }
  });
}

if (typeof Object.assign !== 'function') {
  Object.assign = function(target: any) {
    'use strict';
    if (target == null) throw new TypeError('Cannot convert undefined or null to object');
    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}

// Promise.finally polyfill
if (typeof Promise.prototype.finally !== 'function') {
    // @ts-ignore
    Promise.prototype.finally = function (onFinally) {
        // @ts-ignore
        const P = this.constructor;
        return this.then(
            // @ts-ignore
            value => P.resolve(onFinally()).then(() => value),
            // @ts-ignore
            reason => P.resolve(onFinally()).then(() => { throw reason; })
        );
    };
}

export {};
