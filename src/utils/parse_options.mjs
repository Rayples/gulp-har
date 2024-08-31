import {
  isArray,
  isString,
  isFunction,
  isBoolean,
  isRegExp,
  set_deep_value,
  flatten_object,
  to_regex,
  get_deep_value
} from "./tools.mjs";
import { getLogger } from "./logUtil.mjs";
import mime_db from "mime-db";

let _default_options = {
  log: {
    show: true,
    level: "debug"
  },
  override: true,
  beautify: true,
  mimeType: {
    "application/x-javascript": {
      extensions: ["js", "mjs"]
    }
  },
  request: {
    filter: {},
    queryString: {
      remove: true,
      omit: ["foo", "bar"],
      pick: ["foo", "bar"],
      toPath: true
    }
  },
  response: {
    filter: {
      status: /^[^45]\d+/,
      "content.text": (request, text) => !!text && !!text.trim()
    },
    content: {
      removeHostname: true
    }
  },
  output: {
    defaultExt: "txt",
    dirPath: "output",
    pathLengthLimit: 150
  },
  apiInfo: {
    saved: true,
    fileName: "apis.json",
    filter: /(REST|api)\//
  }
};

export const _to_extend = [
  "override",
  "beautify",
  "request.filter.*",
  "request.queryString.*",
  "response.filter.*",
  "response.content.removeHostname",
  "apiInfo.filter",
  "output.defaultExt"
];

const _to_flatten = ["request.filter", "response.filter"];

const module_name = "lib/utils/parse_options.mjs";
const log = getLogger("main", { context: { moduleName: module_name } });
const _to_extend_regex = to_regex(_to_extend);
log.debug(`[to extend regex]:`, { regex: _to_extend_regex });

export function merge_options(options) {
  let _options = parse_options(_default_options, options);

  _options.mimeType = Object.assign(mime_db, _options.mimeType);

  _to_flatten.forEach((path) => {
    let _value = get_deep_value(_options, path);
    set_deep_value(_options, path, flatten_object(_value));
  });

  return _options;
}

export function parse_options(_default_options, options) {
  const _flatten_options = flatten_object(options);
  const _flatten_default_options = flatten_object(_default_options);

  let _result = {};
  Object.entries({
    ..._flatten_default_options,
    ..._flatten_options
  }).forEach(([_path, _value]) => {
    if (match_boolean_path(_path)) {
      log.debug(`[matched boolean path]: ${_path}`);
      _value = _handle_option(_value);
    }
    set_deep_value(_result, _path, _value);
  });
  return _result;
}

export function match_boolean_path(target) {
  let passed = _to_extend_regex.some((m) => m.test(target));
  return passed;
}

export function _handle_option(option) {
  let _option = option;
  let _cb = (object, defaultKeyPath, type = "value", defaultVal) => {
    const _value = get_deep_value(object, defaultKeyPath) ?? defaultVal;
    let _result = null;

    if (isBoolean(_option)) {
      _result = _option;
    }
    if (isArray(_option)) {
      _result = _option.some((_p) => {
        const is_exclusion = _p.startsWith("!");
        return is_exclusion ? _value !== _p.slice(1) : _value === _p;
      });
    }
    if (isString(_option)) {
      if (type == "boolean") {
        const is_exclusion = _option.startsWith("!");
        _result = is_exclusion ? _value !== _option.slice(1) : _value === _option;
      }
      if (type == "value") {
        _result = _option;
      }
    }
    if (isFunction(_option)) {
      _result = _option(object, _value, type);
    }
    if (isRegExp(_option)) {
      _result = _option.test(_value);
    }
    return _result;
  };
  return _cb;
}

