import { parse as path_parse } from "node:path";
import mime_db from "mime-db";
import prettier from "@prettier/sync";
import md5 from "md5";

const _http_link = /(http(s)?:)?\/\/(\w+\.)+(com|net|cn|comcn|netcn|org|orgcn|gov|edu|cc|travel|tv|fm|museum|int|areo|post|info|rec|asia|ac|mil|name|Wang|biz|mobi)/g;

export function chain(entrie, options) {
    function handle(handler) {
        entrie.handle_data = Object.assign({}, entrie.handle_data, handler(entrie, options))
        return handle;
    }
    handle.get = () => entrie;
    return handle;
}
// 请求路径
export function get_path(entrie, options) {

    let _path = entrie.request.url;
    const _URL = new URL(_path);

    // 解决中文路径乱码问题
    let _path_name = decodeURI(_URL.pathname);
    const _path_info = path_parse(_path_name);

    if (options.query_string.omit(_path_info.ext, _path_info, entrie)) {
        _path = _path_name;
    } else if (options.query_string.to_path(_path_info.ext, _path_info, entrie)) {

        let _queryString = entrie.request.queryString;
        let _query_string_path = decodeURI(_queryString.reduce((acc, { name, value }) => `${acc}/${name}-${value}`, ""));
        if(_queryString.length > 10 || _query_string_path.length > 150) {
            // 解决存储路径过长问题
            _query_string_path = `/${md5(_query_string_path)}`;
        }
        _path_info.dir = `${_path_info.dir}${_query_string_path}`;
        _path = `${_path_info.dir}/${_path_info.base}`;
    }
    return {
        pathname: _path_name,
        path: _path,
        dir: _path_info.dir,
        file_full_name: _path_info.base,
        file_name: _path_info.name,
        ext: _path_info.ext
    };
}
// 验证路径
export function verify_path(entrie, options) {
    const _handle_data = entrie.handle_data;
    let _mime_type = entrie.response.content.mimeType;
    let _path = _handle_data.path
        .replace(/[\:*"<>|]/g, "_");
    let _ext = _handle_data.ext;
    if (!_ext) {
        const _mime_types = Object.assign({}, mime_db, options.mime_type);
        let _match_ext = _mime_types?.[_mime_type]?.extensions?.[0];
        _ext = !!_match_ext ? `.${_match_ext}` : options.default_ext(_handle_data.ext, _handle_data, entrie);
        _path = `${_path}${_ext}`;
    }

    return {
        path: _path,
        ext: _ext
    };
}

// 累计路径
export function accrued_path(accrued_path_info) {
    return (entrie, options) => {
        const _handle_data = entrie.handle_data;
        let _path = _handle_data.path;
        accrued_path_info[_path] ??= -1;
        if (!options.override(_handle_data.ext, _handle_data, entrie) && ++accrued_path_info[_path] > 0) {
            _path = `${_handle_data.dir}/${_handle_data.file_name}_${accrued_path_info[_path]}${_handle_data.ext}`;
        }
        return {
            path: _path
        };
    }
}
// 过滤path
export function filter_path(entrie, options) {
    let _path_passed = true;
    if (options.filter_request) {
        _path_passed = _path_passed && Object
            .entries(options.filter_request)
            .every(([key, value]) => {
                return value(entrie.request[key])
            });
    }
    if (options.filter_response) {
        _path_passed = _path_passed && Object
            .entries(options.filter_response)
            .every(([key, value]) => {
                return value(entrie.response[key])
            });
    }

    return {
        path_passed: _path_passed
    };
}
// 过滤content
export function filter_content(entrie, options) {
    const _handle_data = entrie.handle_data;
    let _content_text = (_handle_data?.content_text ?? entrie.response.content?.text) ?? "";

    let _content_passed = _handle_data.path_passed;
    if(options.content_text.skip_empty(_handle_data.ext, _handle_data, entrie) && !_content_text){
        _content_passed = false
    }
    return {
        content_text: _content_text,
        content_passed: _content_passed
    };
}
//
export function pick_api_request(accrued_api_info) {
    return (entrie, options) => {
        const _handle_data = entrie.handle_data;
        let _api_info = {};
        if (_handle_data.path_passed && options.api.saved(_handle_data.path, _handle_data, entrie) && options.api.filter(_handle_data.path, _handle_data, entrie)) {
            _api_info = Object.assign({}, {
                url: _handle_data.pathname,
                method: entrie.request.method,
                queryString: entrie.request.queryString,
                postData: entrie.request.postData
            });
            accrued_api_info.push({
                url: _handle_data.pathname,
                path: _handle_data.path,
                method: entrie.request.method,
                queryString: entrie.request.queryString,
                postData: entrie.request.postData
            });
        }
        return {
            api_info: _api_info
        };
    }
}

export function remove_links(entrie, options) {
    const _handle_data = entrie.handle_data;

    let _content_text = _handle_data.content_text;
    if (_handle_data.content_passed && options.remove_links(_handle_data.ext, _handle_data, entrie) && !!_content_text) {
        _content_text = _content_text.replace(_http_link, "");
    }
    return {
        content_text: _content_text
    };
}

export function format_content(entrie, options) {
    const _handle_data = entrie.handle_data;
    let _content_text = _handle_data.content_text;
    if (_handle_data.content_passed && options.beautify(_handle_data.ext, _handle_data, entrie)) {
        _content_text = contnet_format_handler(_handle_data.path, _content_text);
    }
    return {
        content_text: _content_text
    };
}

export function base64_content(entrie, options) {
    const _handle_data = entrie.handle_data;
    let _content_text = _handle_data.content_text;
    let _file_encoding = entrie.response.content.encoding;
    if (_handle_data.content_passed && _file_encoding == "base64") {
        _content_text = Buffer.from(_content_text, "base64");
    }
    return {
        content_text: _content_text
    };
}

export function contnet_format_handler(file_path, content_text) {
    const { inferredParser } = prettier.getFileInfo(file_path);
    let _content_text = content_text;
    if(inferredParser){
        //此处的规则供参考，其中多半其实都是默认值，可以根据个人习惯改写
        // module.exports = {
        //     printWidth: 80, //单行长度
        //     tabWidth: 2, //缩进长度
        //     useTabs: false, //使用空格代替tab缩进
        //     semi: true, //句末使用分号
        //     singleQuote: true, //使用单引号
        //     quoteProps: 'as-needed', //仅在必需时为对象的key添加引号
        //     jsxSingleQuote: true, // jsx中使用单引号
        //     trailingComma: 'all', //多行时尽可能打印尾随逗号
        //     bracketSpacing: true, //在对象前后添加空格-eg: { foo: bar }
        //     jsxBracketSameLine: true, //多属性html标签的‘>’折行放置
        //     arrowParens: 'always', //单参数箭头函数参数周围使用圆括号-eg: (x) => x
        //     requirePragma: false, //无需顶部注释即可格式化
        //     insertPragma: false, //在已被preitter格式化的文件顶部加上标注
        //     proseWrap: 'preserve', //不知道怎么翻译
        //     htmlWhitespaceSensitivity: 'ignore', //对HTML全局空白不敏感
        //     vueIndentScriptAndStyle: false, //不对vue中的script及style标签缩进
        //     endOfLine: 'lf', //结束行形式
        //     embeddedLanguageFormatting: 'auto', //对引用代码进行格式化
        // };

        try {
            _content_text = prettier.format(content_text, { tabWidth: 4, useTabs: false, parser: inferredParser });
        } catch (error) {
            console.error("format error:", file_path);
        }
    }
    return _content_text;
}

export function get_deep_value(obj, path, default_val) {
    // same as lodash _.get()
    let __path = [];
    if (typeof path === 'string') {
        __path = path.split(/[\[\].]/).filter(Boolean)
    };
    if (Object.prototype.toString.call(path) === '[object Array]') {
        __path = path;
    };
    let __val = null;
    do {
        __val = obj?.[__path.shift()] ?? null;
        obj = __val;
    }
    while (__val && __path.length > 0)
    return __val ?? default_val;
}
export function set_deep_value(obj, path, val) {
    // same as lodash _.set()
    let __path = [];
    if (typeof path === 'string') {
        __path = path.split(/[\[\].]/).filter(Boolean)
    };
    if (Object.prototype.toString.call(path) === '[object Array]') {
        __path = path;
    };
    let __val = {};
    while (__path.length > 1) {
        const __key = __path.shift();
        obj ??= {};
        __val = obj[__key] ??= ((isNumber(+__key) && !isNaN(+__key)) ? [] : {});
        obj = __val;
    }
    obj[__path.shift()] = val;
}
const _object_to_string = Object.prototype.toString;
function _get_object_type(option) {
    return _object_to_string.call(option).slice(8, -1).toLowerCase();
}

const IS_OBJECT = reduce([
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
    "weakmap",
], (acc, val) => {
    const [_fitst, ...rest] = val.split("");
    acc[`is${[_fitst.toUpperCase(), ...rest].join("")}`] = (option) => _get_object_type(option) === val;
    return acc;
}, {})

const { isArray, isString, isFunction, isBoolean, isObject, isNumber, isUndefined, isNull, isSymbol, isBigInt, isRegexp , isDate, isMap, isSet, isWeakMap } = IS_OBJECT;

export { isArray, isString, isFunction, isBoolean, isObject, isNumber, isUndefined, isNull, isSymbol, isBigInt, isRegexp as isRegExp, isDate, isMap, isSet, isWeakMap };

const objToString = Object.prototype.toString;
const protoKey = '__proto__';
const primitiveKey = '__ec_primitive__';
function isPrimitive(obj) {
    return obj[primitiveKey];
}
function isDom(value) {
    return typeof value === 'object'
        && typeof value.nodeType === 'number'
        && typeof value.ownerDocument === 'object';
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
const BUILTIN_OBJECT = reduce([
    'Function',
    'RegExp',
    'Date',
    'Error',
    'CanvasGradient',
    'CanvasPattern',
    'Image',
    'Canvas'
], function (obj, val) {
    obj['[object ' + val + ']'] = true;
    return obj;
}, {});
const TYPED_ARRAY = reduce([
    'Int8',
    'Uint8',
    'Uint8Clamped',
    'Int16',
    'Uint16',
    'Int32',
    'Uint32',
    'Float32',
    'Float64'
], function (obj, val) {
    obj['[object ' + val + 'Array]'] = true;
    return obj;
}, {});
export function deep_clone(source) {
    // this function copy from echats
    if (source == null || typeof source !== 'object') {
        return source;
    }
    var result = source;
    var typeStr = objToString.call(source);
    if (typeStr === '[object Array]') {
        if (!isPrimitive(source)) {
            result = [];
            for (var i = 0, len = source.length; i < len; i++) {
                result[i] = deep_clone(source[i]);
            }
        }
    }
    else if (TYPED_ARRAY[typeStr]) {
        if (!isPrimitive(source)) {
            var Ctor = source.constructor;
            if (Ctor.from) {
                result = Ctor.from(source);
            }
            else {
                result = new Ctor(source.length);
                for (var i = 0, len = source.length; i < len; i++) {
                    result[i] = source[i];
                }
            }
        }
    }
    else if (!BUILTIN_OBJECT[typeStr] && !isPrimitive(source) && !isDom(source)) {
        result = {};
        for (var key in source) {
            if (source.hasOwnProperty(key) && key !== protoKey) {
                result[key] = deep_clone(source[key]);
            }
        }
    }
    return result;
}

// Removes duplicates from an array.
export function unique(array) {
    return array.filter(function (a) {
        return !this[a] ? (this[a] = true) : false;
    }, {});
}

// Checks whether a value is numerical.
export function isNumeric(a) {
    return typeof a === "number" && !isNaN(a) && isFinite(a);
}
// Sets a class and removes it after [duration] ms.
export function addClassFor(element, className, duration) {
    if (duration > 0) {
        addClass(element, className);
        setTimeout(function () {
            removeClass(element, className);
        }, duration);
    }
}
// Limits a value to 0 - 100
export function limit(a) {
    return Math.max(Math.min(a, 100), 0);
}
// Wraps a variable as an array, if it isn't one yet.
// Note that an input array is returned by reference!
export function asArray(a) {
    return Array.isArray(a) ? a : [a];
}
// Counts decimals
export function countDecimals(numStr) {
    numStr = String(numStr);
    var pieces = numStr.split(".");
    return pieces.length > 1 ? pieces[1].length : 0;
}
// http://youmightnotneedjquery.com/#add_class
export function addClass(el, className) {
    if (el.classList && !/\s/.test(className)) {
        el.classList.add(className);
    }
    else {
        el.className += " " + className;
    }
}
// http://youmightnotneedjquery.com/#remove_class
export function removeClass(el, className) {
    if (el.classList && !/\s/.test(className)) {
        el.classList.remove(className);
    }
    else {
        el.className = el.className.replace(new RegExp("(^|\\b)" + className.split(" ").join("|") + "(\\b|$)", "gi"), " ");
    }
}
// https://plainjs.com/javascript/attributes/adding-removing-and-testing-for-classes-9/
export function hasClass(el, className) {
    return el.classList ? el.classList.contains(className) : new RegExp("\\b" + className + "\\b").test(el.className);
}