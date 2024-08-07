import { parse as node_path_parse } from "node:path";
import md5 from "md5";
import prettier from "@prettier/sync";
import { get_extension, isEmpty, replaceIllegalChar } from "./tools.mjs";

const _http_link = /(http(s)?:)?\/\/(\w+\.)+(com|net|cn|org|gov|edu|info)/g;


// 请求路径
export function parse_path(request) {

   let {entrie, options, handle_data} = request;
    request.passed = false;

    let _path = decodeURI(entrie.request.url);
    const _URL = new URL(_path);

    // 解决中文路径乱码问题
    let _path_name = decodeURI(_URL.pathname);
    const _path_info = node_path_parse(_path_name);
    let _folder = _path_info.dir;

    handle_data.file_ext = _path_info.ext;
    if(options.request.queryString.remove(request, "handle_data.file_ext", "boolean")){
        _path = _path_name;
    }
    if (options.request.queryString.toPath(request, "handle_data.file_ext", "boolean")) {
        let _queryString = entrie.request.queryString;
        let _query_string_path = _queryString.reduce((acc, { name, value }) => `${acc}/${decodeURI(name)}-${decodeURI(value)}`, "");
        _folder += _query_string_path;
        _path = `${_folder}/${_path_info.base}`;
    }

    request.handle_data = {
        ...handle_data,
        url_path: _path_name,
        file_path: replaceIllegalChar(_path),
        file_dir: replaceIllegalChar(_folder),
        file_name: replaceIllegalChar(_path_info.name),
        file_full_name: replaceIllegalChar(_path_info.base),
    };

    request.passed = true;
    return request;
}
// 验证路径
export function verify_path(request) {
    let {entrie, options, handle_data} = request;

    let _mime_type = entrie.response.content.mimeType;

    if(isEmpty(handle_data.file_ext)) {
        handle_data.file_ext = `.${get_extension(_mime_type, options.mimeType, options.output.defaultExt(request, "entrie.response.content.mimeType"))}`;
        handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
        handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
    }

    // 解决路径过长问题
    if(handle_data.file_dir.length > options.output.pathLengthLimit) {
        let _file_dir = handle_data.file_dir;
        _file_dir.split("/").reduceRight((acc, cur) => {
            if(acc > options.output.pathLengthLimit) {
                cur = cur.replace(/[[\\^$.|?*+()]/g, "\\$&");
                _file_dir = _file_dir.replace(new RegExp(`/${cur}$`), "");
            }
            return _file_dir.length;
        }, handle_data.file_dir.length);

        handle_data.file_dir = `${_file_dir}/${md5(handle_data.file_dir.slice(_file_dir.length))}`;
        handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
    }

    request.passed = true;

    return request;
}

// 过滤path
export function filter_path(request) {
   let {options} = request;

   let _request_filter = Object
    .entries(options.request.filter)
    .every(([key, value]) => {
        return value(request, `entrie.request.${key}`)
    });

    let _response_filter = Object
    .entries(options.response.filter)
    .every(([key, value]) => {
        return value(request, `entrie.response.${key}`)
    });

    request.passed = _request_filter && _response_filter;

    return request;
}
//
export function filter_api_request(request) {

    let {entrie, options, handle_data} = request;

    if(options.apiInfo.filter(request, "entrie.request.url", "boolean")){
        let _method = entrie.request.method;
        handle_data.saveToApi = true;
        handle_data.apiInfo.method = _method;

        if(_method == "GET"){
            handle_data.apiInfo.queryString = entrie.request.queryString
        }
        if(["POST", "PUT", "DELETE"].includes(_method)){
            handle_data.apiInfo.postData = entrie.request.postData
        }
    }

    request.passed = true;

    return request;
}

export function format_content(request) {

    let {entrie, options, harFileName, handle_data} = request;
    const { inferredParser } = prettier.getFileInfo(handle_data.file_path);
    let _content_text = entrie.response.content?.text ?? "";

    if(inferredParser){
        if(options.response.content.removeHostname(request, "handle_data.file_ext", "boolean") === true) {
            _content_text = _content_text.replace(_http_link, "");
        }

        if(options.beautify(request, "handle_data.file_ext", "boolean")) {
            _content_text = contnet_format_handler({
                harFileName,
                file_path: handle_data.file_path,
                content_text: _content_text,
                inferredParser
            });
        }
    }

    let _file_encoding = entrie.response.content.encoding;
    if (_file_encoding == "base64") {
        _content_text = Buffer.from(_content_text, "base64");
    }

    handle_data.content_text = _content_text;
    request.passed = true;

    return request;
}

export function contnet_format_handler(params) {
    let {harFileName, file_path, content_text, inferredParser} = params;
    let _content_text = content_text;
    try {
        _content_text = prettier.format(_content_text, { tabWidth: 4, useTabs: false, parser: inferredParser });
    } catch (error) {
        let _message = error?.message ?? "";
        _message = _message.length < 100 ? _message : `${_message.substring(0, 100)}...`;
        console.error(`[ERROR]:[FORMAT ERROR]:${harFileName} -- [PATH]: ${file_path} -- [MESSAGE]: ${_message}`);
    }
    return _content_text;
}
