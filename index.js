const parse = require('./src/parse.js');
const through = require('through2');
const path = require('path');
const File = require('vinyl');

module.exports = options => {
    return through.obj(function (file, enc, next) {

        if (file.isNull()) {
            next(null, file);
            return
        }
        const _p = parse(options);
        let _entries = _p._parse(file.contents);
        _entries = _p._filter(_entries);
        _p._save(_entries, (filePath, _content) => {
            const _saveFile = new File({
                cwd: file.cwd,
                base: file.base,
                path: path.join(file.path, "..", filePath),
                contents: Buffer.from(_content)
            });
            this.push(_saveFile);
        });
        const _api = _p._saveApi(_entries);
        if (_api.isSave) {
            const _saveFile = new File({
                cwd: file.cwd,
                base: file.base,
                path: path.join(file.path, "..", _api.path),
                contents: Buffer.from(_api.content)
            });
            this.push(_saveFile);
        }
        next();
    })
}