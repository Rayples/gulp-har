import through from "through2";
import { join as path_join } from "node:path";
import vinyl_File from 'vinyl';
import * as utils from "../utils/index.mjs"
import { merge_options } from "../utils/parse_options.mjs";

let _default_options = {
    log: {
        show: true,
        level: "debug"
    },
    override: true,
    beautify: true,
    mimeType: {
        "application/x-javascript": {
            "extensions": ["js", "mjs"]
        }
    },
    request: {
        filter: {
        },
        queryString: {
            remove: true,
            omit: ["foo", "bar"],
            pick: ["foo", "bar"],
            toPath: true
        }
    },
    response: {
        filter: {
            "status": /^[^45]\d+/,
            "content.text": (request, text) => !!text && !!text.trim()
        },
        content: {
            removeHostname: true
        }
    },
    output: {
        defaultExt: "txt",
        dirPath: 'output',
        pathLengthLimit: 150
    },
    apiInfo: {
        saved: true,
        fileName: 'apis.json',
        filter: /(REST|api)\//
    }
 }

export default options => {
    return through.obj(function (file, enc, next) {

        if (file.isNull()) {
            next(null, file);
            return
        }

        let _contents = file.contents;
        if (Buffer.isBuffer(_contents)) {
            _contents = _contents.toString();
        }

        try {
            if (typeof _contents === 'string') {
                _contents = JSON.parse(_contents);
            }
        } catch (e) {
            _contents = {}
        }

        let _options = merge_options(_default_options, options);
        let _passed_request_list = [];
        _contents?.log?.entries?.forEach((entrie) => {
            const request = {
                harFileName: file.basename,
                entrie,
                options: _options,
                handle_data: {
                    url_path: null,
                    file_path: null,
                    file_dir: null,
                    file_name: null,
                    file_ext: null,
                    file_full_name: null,
                    saveToApi: false,
                    apiInfo: {}
                },
                passed: false
            }
            const _request = utils.handle(request);
            if(_request.passed) {
                _passed_request_list.push(_request);
            }
        });

       const _accrued_list = utils.accrued_path(_passed_request_list);

       _accrued_list.forEach((handle_data) => {
            const _save_file = new vinyl_File({
                cwd: file.cwd,
                base: file.base,
                path: path_join(file.path, handle_data.file_path),
                contents: Buffer.from(handle_data.content_text)
            });
            this.push(_save_file);
        })

        if (_options.apiInfo.saved === true) {
            let _apis_info = _accrued_list.filter((handle_data) => handle_data.saveToApi)
            .reduce((acc, handle_data) => {
                acc[handle_data.url_path] ??= {
                    url: handle_data.url_path,
                    ...handle_data.apiInfo
                };
                acc[handle_data.url_path][`path${/(_\d+)?$/.exec(handle_data.file_name)[0]}`] = handle_data.file_path;
                return acc;
            }, {});
            const _api_file = new vinyl_File({
                cwd: file.cwd,
                base: file.base,
                path: path_join(file.path, _options.apiInfo.fileName),
                contents: Buffer.from(JSON.stringify(Object.values(_apis_info), null, 4))
            });
            this.push(_api_file);
        }
        next();
    })
}

