const reIsUint = /^(?:0|[1-9]\d*)$/;
const MAX_SAFE_INTEGER = 9007199254740991;
const illegalCharRe = /[\:*"<>|]/g;

export function get_extension(mime_type, options, defaultExt) {
  let _mime_types = options.mimeType;
  let _match_ext = _mime_types?.[mime_type]?.extensions?.[0];
  return _match_ext ?? defaultExt;
}

export function get_deep_value(obj, path, default_val) {
  // same as lodash _.get()
  if (!isObject(obj) && !isArray(obj)) {
    return obj;
  }
  let __path = [];
  if (isString(path)) {
    __path = path.split(/[\[\].]/).filter(Boolean);
  }
  if (isArray(path)) {
    __path = path;
  }

  let index = 0,
    length = __path.length;

  while (obj != null && index < length) {
    obj = obj[__path[index++]];
  }
  let result = index && index == length ? obj : default_val;
  return result;
}
export function set_deep_value(obj, path, val) {
  // same as lodash _.set()
  if (!isObject(obj) && !isArray(obj)) {
    return obj;
  }
  let __path = [];
  if (isString(path)) {
    __path = path.split(/[\[\].]/).filter(Boolean);
  }
  if (isArray(path)) {
    __path = path;
  }

  let index = -1,
    length = __path.length,
    lastIndex = length - 1,
    nested = obj;

  while (nested != null && ++index < length) {
    const __key = __path[index];
    let newValue = val;
    if (index != lastIndex) {
      let objValue = nested[__key];
      // why is it "index + 1"
      newValue = isTypeObject(objValue) ? objValue : isIndex(__path[index + 1]) ? [] : {};
    }
    nested[__key] = newValue;
    nested = nested[__key];
  }
}
const _object_to_string = Object.prototype.toString;
function _get_object_type(option) {
  return _object_to_string.call(option).slice(8, -1).toLowerCase();
}

const IS_OBJECT = reduce(
  [
    "array",
    "string",
    "function",
    "boolean",
    "object",
    "number",
    "undefined",
    "null",
    "symbol",
    "bigint",
    "regexp",
    "date",
    "map",
    "set",
    "weakmap"
  ],
  (acc, val) => {
    const [_fitst, ...rest] = val.split("");
    acc[`is${[_fitst.toUpperCase(), ...rest].join("")}`] = (option) => _get_object_type(option) === val;
    return acc;
  },
  {}
);

const {
  isArray,
  isString,
  isFunction,
  isBoolean,
  isObject,
  isNumber,
  isUndefined,
  isNull,
  isSymbol,
  isBigInt,
  isRegexp,
  isDate,
  isMap,
  isSet,
  isWeakMap
} = IS_OBJECT;

export {
  isArray,
  isString,
  isFunction,
  isBoolean,
  isObject,
  isNumber,
  isUndefined,
  isNull,
  isSymbol,
  isBigInt,
  isRegexp as isRegExp,
  isDate,
  isMap,
  isSet,
  isWeakMap
};

export function isEmpty(obj) {
  if (isArray(obj) || isString(obj)) {
    return obj.length === 0;
  }
  if (isObject(obj)) {
    return Object.keys(obj).length === 0;
  }
  return isBlank(obj);
}
export function isBlank(obj) {
  return isNull(obj) || isUndefined(obj);
}

export function isTypeObject(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}

export const flatten_object = (target) => {
  const output = {};
  function step(object, parent_path) {
    Object.entries(object).forEach(([key, value]) => {
      if (isArray(object)) {
        key = `[${key}]`;
      }
      const _path = parent_path ? `${parent_path}.${key}` : key;
      if (isObject(value) || (isArray(value) && value.some(isTypeObject))) {
        return step(value, _path);
      }
      if (!isEmpty(value)) {
        output[_path] = value;
      }
    });
  }
  step(target);
  return output;
};

export function to_regex(target) {
  return target.map((val) => {
    const _path_items = val.split(".").map((m) => {
      if (m == "*") {
        m = "(.*?)";
      }
      return m;
    });
    return new RegExp(`^${_path_items.join("\\.")}$`);
  });
}

const objToString = Object.prototype.toString;
const protoKey = "__proto__";
const primitiveKey = "__ec_primitive__";
function isPrimitive(obj) {
  return obj[primitiveKey];
}
function isDom(value) {
  return typeof value === "object" && typeof value.nodeType === "number" && typeof value.ownerDocument === "object";
}
function reduce(arr, cb, memo, context) {
  if (!(arr && cb)) {
    return;
  }
  for (var i = 0, len = arr.length; i < len; i++) {
    memo = cb.call(context, memo, arr[i], i, arr);
  }
  return memo;
}
const BUILTIN_OBJECT = reduce(
  ["Function", "RegExp", "Date", "Error", "CanvasGradient", "CanvasPattern", "Image", "Canvas"],
  function (obj, val) {
    obj["[object " + val + "]"] = true;
    return obj;
  },
  {}
);
const TYPED_ARRAY = reduce(
  ["Int8", "Uint8", "Uint8Clamped", "Int16", "Uint16", "Int32", "Uint32", "Float32", "Float64"],
  function (obj, val) {
    obj["[object " + val + "Array]"] = true;
    return obj;
  },
  {}
);
export function deep_clone(source) {
  // this function copy from echats
  if (source == null || typeof source !== "object") {
    return source;
  }
  var result = source;
  var typeStr = objToString.call(source);
  if (typeStr === "[object Array]") {
    if (!isPrimitive(source)) {
      result = [];
      for (var i = 0, len = source.length; i < len; i++) {
        result[i] = deep_clone(source[i]);
      }
    }
  } else if (TYPED_ARRAY[typeStr]) {
    if (!isPrimitive(source)) {
      var Ctor = source.constructor;
      if (Ctor.from) {
        result = Ctor.from(source);
      } else {
        result = new Ctor(source.length);
        for (var i = 0, len = source.length; i < len; i++) {
          result[i] = source[i];
        }
      }
    }
  } else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
    result = {};
    for (var key in source) {
      if (source.hasOwnProperty(key) && key !== protoKey) {
        result[key] = deep_clone(source[key]);
      }
    }
  }
  return result;
}

function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return (
    !!length &&
    (type == "number" || (type != "symbol" && reIsUint.test(value))) &&
    value > -1 &&
    value % 1 == 0 &&
    value < length
  );
}

// Removes duplicates from an array.
export function unique(array) {
  return array.filter(function (a) {
    return !this[a] ? (this[a] = true) : false;
  }, {});
}

export function replaceIllegalChar(str) {
  return str.replace(illegalCharRe, "_");
}

