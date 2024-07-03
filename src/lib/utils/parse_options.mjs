import { deep_clone, get_deep_value, set_deep_value, isArray, isString, isFunction, isBoolean, isObject, isRegExp } from "./index.mjs";

export const _parse_path = ["api.saved", "api.filter", "query_string", "content_text", "override", "beautify", "remove_links", "filter_request", "filter_response", "default_ext"];

export function parse_options(_default_options) {
    return (options) => {

        options = Object.assign({}, deep_clone(_default_options), deep_clone(options));
        const _flatten_options = _flatten_object(options);
        Object.entries(_flatten_options).forEach(([_path, _value]) => {
            if (_parse_path.find((m) => _path.startsWith(m))){
                set_deep_value(options, _path, _handle_option(_value))
            }
        })
        return options
    }
}

export const _flatten_object = (target) => {
    const output = {};
    function step(object, parent_path) {
        Object.entries(object).forEach(([key, value]) => {
            const _path = parent_path ? `${parent_path}.${key}` : key;
            if (isObject(value) && Object.keys(value).length) {
                return step(value, _path)
            }
            output[_path] = value
        })
    }
    step(target)
    return output
};

export function _handle_option(option) {
    let _option = option;
    let _result = (key) => {
        return key;
    }

    if (isBoolean(_option)) {
        _result = (key) => {
            return Boolean(_option)
        };
    }
    else if (isArray(_option)) {
        _result = (key) => {
            return _option.some((_p) => {
                const is_exclusion = _p.startsWith("!");
                return is_exclusion ? key !== _p.slice(1) : key === _p;
            });
        };
    }
    else if (isString(_option)) {
        const is_exclusion = _option.startsWith("!");
        _result = (key) => {
            return is_exclusion ? key !== _option.slice(1) : key === _option;
        };
    }
    else if (isFunction(_option)) {
        _result = (key, handle_data, entrie) => {
            return Boolean(_option(key, handle_data, entrie));
        };
    }
    else if (isObject(_option)) {
        _result = (key) => {
            return Boolean(_option[key]);
        };
    }
    else if (isRegExp(_option)) {
        _result = (key) => {
            return _option.test(key);
        };
    }
    return _result;
}
