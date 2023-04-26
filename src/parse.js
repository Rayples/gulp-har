
const fs = require('fs');
const path = require("path");
const mime_db = require('mime-db');
const { js_beautify, css_beautify, html_beautify } = require('js-beautify');

const DEFAULT_MIME_TYPE = ".txt";

const mimeTypeOptions = {
    "callback": function (urlPath, mimeType) { return urlPath; }
};

const apiOptions = {
    isSave: false,
    filter: "",
    dest: ".",
    fileName: "response.config.json",
    urls: {},
    addAPI: function (filePath, urlPath) {
        const _cup = this.urls[urlPath];
        if (_cup) {
            var _files = _cup.files;
            filePath = filePath.replace(/\\/g, "/");
            _files.push(filePath);
        }
        return filePath;
    },
    init: function (urlPath) {
        let _result = true;

        if (typeof this.filter === "function") {
            _result = this.filter.call(this, urlPath);
        } else {
            const _rx = new RegExp(this.filter);
            _result = _rx.test(urlPath);
        }

        if (_result) {
            this.urls[urlPath] = this.urls[urlPath] ? this.urls[urlPath] : {
                files: []
            }
        }

        return _result;
    }
}

const defaultOptions = {
    beautify: false,
    filter: "",
    urls: {},
    handler: function (extname, obj, callback, filePath) {
        switch (extname) {
            case ".json":
                if (Buffer.isBuffer(obj)) {
                    obj = obj.toString();
                }
                if (this.beautify && typeof obj === "string") {
                    obj = js_beautify(obj);
                }
                break;
            case "base64":
                obj = Buffer.from(obj, "base64");
                break;
            case ".html":
                if (Buffer.isBuffer(obj)) {
                    obj = obj.toString();
                }
                if (this.beautify && typeof obj === "string") {
                    obj = html_beautify(obj);
                }
                break;
            case ".js":
                if (Buffer.isBuffer(obj)) {
                    obj = obj.toString();
                }
                if (this.beautify && typeof obj === "string") {
                    obj = js_beautify(obj);
                }
                break;
            case ".css":
                if (Buffer.isBuffer(obj)) {
                    obj = obj.toString();
                }
                if (this.beautify && typeof obj === "string") {
                    obj = css_beautify(obj);
                }
                break;
        }
        if (typeof callback === "function") {
            const _result = callback.call(this, obj);
            obj = _result ? _result : obj;
        }
        return obj;
    },
    saveCallBack: function (filePath, content, m) { return { filePath, content }; }
}


module.exports = (options) => {

    _options = Object.assign({}, defaultOptions, options);
    _mimeTypeOptions = Object.assign({}, mimeTypeOptions, _options.mimeTypeOptions);
    _apiOptions = Object.assign({}, apiOptions, _options.apiOptions);

    return {
        _parse: function (content) {
            let _res = { log: { entries: [] } };
            try {
                _res = Object.assign({}, _res, JSON.parse(content));
            } catch (e) {
                console.log("cannot convert this file to json obj.");
            }

            _res.log.entries.map((m) => {
                let header_path = m.request.headers.find((h) => h.name == ":path");
                if (!header_path) {
                    header_path = {
                        value: new URL(m.request.url).pathname
                    };
                }
                m.header_path = header_path.value
                    .replace(/\?.*/g, "")
                    .replace(/[\:*"<>|]/g, "_");
                this._tallyUrl(m.header_path);
                m.filePath = this._createFileName(m.header_path, m.response.content.mimeType);
                return m
            })
            return _res.log.entries;
        },
        _filter: function (entries) {
            let _filter = _options.filter;

            entries = entries.filter((m) => !!m.response.content.text);

            if (!_filter) {
                return entries;
            }

            if (typeof _filter === "function") {
                entries = entries.filter(_filter.bind(this));
            }

            if (typeof _filter === "string") {
                const [key, rx] = _filter.split("@_@");
                const _rx = new RegExp(rx);
                entries = entries.filter((m) => {
                    return _rx.test(this._getDeepValue(m, key));
                });
            }


            return entries
        },
        _saveApi: function (entries) {
            if (!_apiOptions.filter) {
                return { isSave: false };
            }
            entries.forEach((m) => {
                if (!_apiOptions.init(m.header_path)) {
                    return;
                }
                let _filePath = m.filePath;
                if (typeof _apiOptions.callback === "function") {
                    const _result = _apiOptions.callback.call(this, _filePath, _options, m);
                    _filePath = _result ? _result : _filePath;
                }
                m.fileSavePath = _apiOptions.addAPI(_filePath, m.header_path);
            });
            let _data = Object.entries(_apiOptions.urls).map(([key, val]) => {
                var _item = {
                    "url": key
                };
                _item = val.files.reduce((s, m, i) => {
                    s["file" + i] = m;
                    return s;
                }, _item);
                return _item;
            })
            _data = _options.handler(path.extname(_apiOptions.fileName), JSON.stringify(_data));
            return {
                isSave: !!_apiOptions.filter,
                path: path.join(_apiOptions.dest, "/", _apiOptions.fileName),
                content: _data
            };
        },
        _save: function (entries, callback) {

            entries.forEach((m) => {
                let _filePath = m.fileSavePath || m.filePath,
                    _content = m.response.content.text,
                    _encoding = m.response.content.encoding;
                if (!!_encoding) {
                    _content = _options.handler(_encoding, _content);
                }
                _content = _options.handler(path.extname(_filePath), _content);
                if (typeof _options.saveCallBack === "function") {
                    const _result = _options.saveCallBack
                        .call(this, _filePath, _content, _options, m);
                    _filePath = _result && _result.filePath ? _result.filePath : _filePath;
                    _content = _result && _result.content ? _result.content : _content;
                }
                if (typeof callback === "function") {
                    callback.call(this, _filePath, _content, m)
                }
            });

            return entries;
        },
        _createFileName: function (urlPath, mimeType) {
            let fileInfo = path.parse(urlPath);
            let _dir = fileInfo.dir, _name = fileInfo.name, _ext = fileInfo.ext;
            if (!fileInfo.ext) {
                _ext = _mimeTypeOptions[mimeType];
                if (!_ext) {
                    _ext = mime_db[mimeType] && mime_db[mimeType].extensions ? "." + mime_db[mimeType].extensions[0] : undefined;
                }
                if (!_ext) {
                    _ext = DEFAULT_MIME_TYPE;
                }
                _name = path.join(_name, _name);
            }
            if (_options.urls[urlPath].length > 0) {
                _name += `_${_options.urls[urlPath].length}`;
            }
            urlPath = path.join(_dir, _name + _ext);
            if (typeof _mimeTypeOptions.callback === "function") {
                const _result = _mimeTypeOptions.callback.call(this, urlPath, mimeType, _options);
                urlPath = _result ? _result : urlPath;
            }
            return urlPath;
        },
        _tallyUrl: function (urlPath) {
            _options.urls[urlPath] = Object.assign({ length: -1 }, _options.urls[urlPath]);
            _options.urls[urlPath].length++;
        },
        _getDeepValue: function (obj, key) {
            return key.split(".")
                .reduce((obj, m) => !!obj ? obj[m] : obj, obj);
        }
    }
}