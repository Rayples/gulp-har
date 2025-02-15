import { StreamBase } from "./StreamBase.mjs";
import { LogUtil } from "./LogUtil.mjs";
import { isEmpty, isObject, isArray, isTypeObject } from "./tools.mjs";

export class BuildOptions extends StreamBase {
  extend_properties = ["filter.*", "override.*", "beautify.*"];

  feature_name = "BuildOptions";

  default_options = {
    log: {
      show: true,
      level: "debug",
    },
    mimeType: {
      "application/x-javascript": {
        extensions: ["js", "mjs"],
      },
    },
    prettier: {
      overrides: [
        {
          files: "*.action",
          options: {
            parser: "babel",
          },
        },
        {
          files: "*.mjs",
          options: {
            parser: "babel",
          },
        },
      ],
    },
    filter: {
      request: {},
      response: {
        status: /^[^45]\d+/,
        content: {
          text: (request, text) => {
            return !!text && !!text.trim();
          },
        },
      },
    },
    override: {
      request: {
        url: "http://localhost:3000",
      },
      response: {},
    },
    beautify: "css",
    outputFile: {
      content: {
        removeHostname: true,
      },
      ext: {
        default: "txt",
      },
      path: {
        limit: 150,
        "entrie.request.queryString": {
          omit: "^=_",
          pick: "",
          toPath: true,
        },
      },
    },
    rest_api: {
      saved: true,
      fileName: "apis.json",
      filter: /(REST|api)\//,
    },
  };

  static make(options) {
    return new BuildOptions(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  parseString(compareValue, compareValue) {
    if (!isString(compareValue)) {
      return false;
    }
    let result = entrieValue == compareValue;
    if (compareValue.startsWith("!")) {
      result = !result;
    }
    return result;
  }

  parseArray(param) {}

  parseFunction(param) {}

  parseBoolean(param) {}

  parseRegExp(param) {}

  parseObject(param) {}

  parseOptions(options) {
    let flatten_user = this.flattenOptions(options);
    let flatten_default = this.flattenOptions(this.default_options);
    this.mergeOptions(flatten_default, flatten_user);
  }

  mergeOptions(default_options, options) {
    let new_options = {
      ...default_options,
      ...options,
    };
    this.convertOptions(new_options);

    return;
  }

  convertOptions(options) {
    let filters = this.toRegex(this.extend_properties);
    let keys = Object.keys(options).filter((key) => {
      return filters.some((m) => m.test(key));
    });
    console.log(keys);
    // [
    //   'filter.response.status',
    //   'filter.response.content.text',
    //   'override.request.url'
    //   'beautify'
    // ]

    keys.reduce((acc, key) => {
      let [newKey, ...keyPathArr] = key.split(".");
      if (acc[newKey]) {
        acc[newKey] = [];
      }
      acc[newKey].push(this.handleOption(keyPathArr.join("."), options[key]));
      Reflect.deleteProperty(options, key);
    }, options);

    return options;
  }

  _transform(chunk, encoding, next) {
    next(null, requestChunk);
  }

  flattenOptions(options) {
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
    step(options);
    return output;
  }

  toRegex(target) {
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

  handleOption(keyPath, compareValue) {
    let _cb = (entrie) => {
      const entrieValue = this.getDeepValue(entrie, keyPath);
      if (isEmpty(entrieValue)) {
        return false;
      }
      let _result = null;
      if (isBoolean(compareValue)) {
        _result = compareValue;
      }
      if (isArray(compareValue)) {
        _result = compareValue.every((m) => this.parseString(m, entrieValue));
      }
      if (isString(compareValue)) {
        _result = this.parseString(compareValue, entrieValue);
      }
      if (isFunction(_option)) {
        _result = compareValue(keyPath, entrieValue, entrie);
      }
      if (isRegExp(compareValue)) {
        _result = compareValue.test(entrieValue);
      }
      return _result;
    };
    return _cb;
  }

  getDeepValue(obj, path, default_val) {
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
}

