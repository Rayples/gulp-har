import through from "through2";
import { join as path_join } from "node:path";
import vinyl_File from 'vinyl';
import * as utils from "../utils/index.mjs"
import { parse_options } from "../utils/parse_options.mjs";

let _default_options = {
    query_string: {
        omit: false,
        to_path: true
    },
    log: {
        level: "debug"
    },
    content_text: {
        skip_empty: true
    },
    mime_type: {
        "application/x-javascript": {
            "source": "iana",
            "charset": "UTF-8",
            "compressible": true,
            "extensions": ["js", "mjs"]
        }
    },
    output: {
        path: 'output'
    },
    api: {
        saved: true,
        file_name: 'apis.json',
        filter: /(REST|api)\//
    },
    default_ext: '.txt',
    /**
     * 可能的值
     *      override: true,
     *      override: ".js",
     *      override: "!.js",
     *      override: /.(js|html)$/,
     *      override: [".js", ".html"],
     *      override: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    override: true,
    /**
     * 可能的值
     *      beautify: true,
     *      beautify: ".js",
     *      beautify: "!js",
     *      beautify: /.(js|html)$/,
     *      beautify: [".js", ".html"],
     *      beautify: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    beautify: true,
    /**
     * 可能的值
     *      remove_links: true,
     *      remove_links: ".js",
     *      remove_links: "!js",
     *      remove_links: /.(js|html)$/,
     *      remove_links: [".js", ".html"],
     *      remove_links: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    remove_links: true,
    /**
     * 可能的值
     *      filter_request: {
     *          method: "GET",
     *          method: "!GET",
     *          method: /GET|POST/,
     *          method: ["GET", "POST"],
     *          method: (method_value) => true,
     *      }
     * @returns {boolean}
     */
    filter_request: {},
    /**
     * 可能的值
     *      filter_response: {
     *          status: "200",
     *          status: "!500",
     *          status: /200/,
     *          status: ["200", "201"],
     *          status: (status_value) => true,
     *      }
     * @returns {boolean}
     */
    filter_response: {},
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

        let _options = parse_options(_default_options)(options);
        let _accrued_path_info = {}, _accrued_api_info = [];
        _contents?.log?.entries?.forEach((entrie) => {
            const _entrie = utils.chain(entrie, _options)
                (utils.get_path)
                (utils.verify_path)
                (utils.accrued_path(_accrued_path_info))
                (utils.filter_path)
                (utils.filter_content)
                (utils.pick_api_request(_accrued_api_info))
                (utils.remove_links)
                (utils.base64_content)
                (utils.format_content)
                .get();

            let _handle_data = _entrie.handle_data
            if (_handle_data.path_passed && _handle_data.content_passed) {
                const _save_file = new vinyl_File({
                    cwd: file.cwd,
                    base: file.base,
                    path: path_join(file.path, _handle_data.path),
                    contents: Buffer.from(_handle_data.content_text)
                });
                this.push(_save_file);
            }
        })
        if (_options.api.saved()) {
            const _api_file = new vinyl_File({
                cwd: file.cwd,
                base: file.base,
                path: path_join(file.path, _options.api.file_name),
                contents: Buffer.from(JSON.stringify(_accrued_api_info, null, 4))
            });
            this.push(_api_file);
        }
        next();
    })
}
