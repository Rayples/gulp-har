import { parse as node_path_parse } from "path";
import md5 from "md5";
import prettier from "prettier";
import { get_extension, isEmpty, replaceIllegalChar } from "./tools.mjs";
import logUtil, { getLogger } from "./logUtil.mjs";

const _http_link = /(http(s)?:)?\/\/(\w+\.)+(com|net|cn|org|gov|edu|info)/g;
const module_name = "utils/handler.mjs";
const inferredParserCache = new Map();
const log = getLogger("main", { context: { moduleName: module_name } });
const log_performance = getLogger("performance", {
  context: { moduleName: module_name }
});

export function parse_path(request) {
  log.addContext("funnctionName", "parse_path");

  let { entrie, options, handle_data } = request;
  request.passed = false;

  let _path = decodeURI(entrie.request.url);
  const _URL = new URL(_path);

  let _path_name = decodeURI(_URL.pathname);
  const _path_info = node_path_parse(_path_name);
  let _folder = _path_info.dir;

  handle_data.file_ext = _path_info.ext;
  if (options.request.queryString.remove(request, "handle_data.file_ext", "boolean")) {
    log.debug(`[remove query string]: true`, {
      file_path: handle_data.file_path
    });
    _path = _path_name;
  }
  if (options.request.queryString.toPath(request, "handle_data.file_ext", "boolean")) {
    log.debug(`[query string to path]: true`, {
      file_path: handle_data.file_path
    });
    let _queryString = entrie.request.queryString;
    let _query_string_path = _queryString.reduce(
      (acc, { name, value }) => `${acc}/${decodeURI(name)}-${decodeURI(value)}`,
      ""
    );
    _folder += _query_string_path;
    _path = `${_folder}/${_path_info.base}`;
  }

  request.handle_data = {
    ...handle_data,
    url_path: _path_name,
    file_path: replaceIllegalChar(_path),
    file_dir: replaceIllegalChar(_folder),
    file_name: replaceIllegalChar(_path_info.name),
    file_full_name: replaceIllegalChar(_path_info.base)
  };

  request.passed = true;
  return request;
}
export function verify_path(request) {
  log.addContext("funnctionName", "verify_path");

  let { entrie, options, handle_data } = request;

  let _mime_type = entrie.response.content.mimeType;

  if (isEmpty(handle_data.file_ext)) {
    log.debug(`[empty file extension]: true - [mime type]: ${_mime_type}`, {
      file_path: handle_data.file_path
    });
    performance.mark("verify_path start");
    handle_data.file_ext = `.${get_extension(_mime_type, options, options.output.defaultExt(request, "entrie.response.content.mimeType"))}`;
    performance.mark("verify_path end");
    let { duration } = performance.measure("verify_path operationDuration", "verify_path start", "verify_path end");
    log_performance.trace(`verify_path true finish`, {
      duration,
      file_path: request.handle_data.file_path
    });
    handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
    handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
    log.debug(`[add file extension]: true - [mime type]: ${_mime_type} - [file extension]: ${handle_data.file_ext}`, {
      file_path: handle_data.file_path
    });
  }

  if (handle_data.file_dir.length > options.output.pathLengthLimit) {
    let _file_dir = handle_data.file_dir;
    _file_dir.split("/").reduceRight((acc, cur) => {
      if (acc > options.output.pathLengthLimit) {
        cur = cur.replace(/[[\\^$.|?*+()]/g, "\\$&");
        _file_dir = _file_dir.replace(new RegExp(`/${cur}$`), "");
      }
      return _file_dir.length;
    }, handle_data.file_dir.length);

    handle_data.file_dir = `${_file_dir}/${md5(handle_data.file_dir.slice(_file_dir.length))}`;
    handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
    log.debug(`[path too long] - new path:`, {
      file_path: handle_data.file_path
    });
  }

  request.passed = true;

  return request;
}

export function filter_path(request) {
  log.addContext("funnctionName", "filter_path");
  let { options, handle_data } = request;

  let _request_filter = Object.entries(options.request.filter).every(([key, value]) => {
    const result = value(request, `entrie.request.${key}`);
    log.debug(`[request filter]: [key]: ${key} -- [result]: ${result}`, {
      file_path: handle_data.file_path
    });
    return result;
  });

  let _response_filter = Object.entries(options.response.filter).every(([key, value]) => {
    const result = value(request, `entrie.response.${key}`);
    log.debug(`[response filter]: [key]: ${key} -- [result]: ${result}`, {
      file_path: handle_data.file_path
    });
    return result;
  });

  request.passed = _request_filter && _response_filter;
  log.debug(`[filter path]: ${handle_data.file_path} -- [passed]: ${request.passed}`, {
    file_path: handle_data.file_path
  });
  return request;
}
export function filter_api_request(request) {
  log.addContext("funnctionName", "filter_api_request");
  let { entrie, options, handle_data } = request;

  if (options.apiInfo.filter(request, "entrie.request.url", "boolean")) {
    log.debug(`[filter api request]: true - [saveToApi]: true`, {
      file_path: handle_data.file_path
    });
    let _method = entrie.request.method;
    handle_data.saveToApi = true;
    handle_data.apiInfo.method = _method;

    if (_method == "GET") {
      handle_data.apiInfo.queryString = entrie.request.queryString;
    }
    if (["POST", "PUT", "DELETE"].includes(_method)) {
      handle_data.apiInfo.postData = entrie.request.postData;
    }
  }

  request.passed = true;

  return request;
}

export async function format_content(request) {
  log.addContext("funnctionName", "format_content");
  log_performance.addContext("funnctionName", "format_content");
  let { entrie, options, handle_data } = request;
  const _key = `temp${handle_data.file_ext}`;
  let inferredParser = inferredParserCache.get(_key);
  if (!inferredParser) {
    const fileInfoResult = await prettier.getFileInfo(_key);
    inferredParserCache.set(_key, (inferredParser = fileInfoResult.inferredParser));
  }

  let _content_text = entrie.response.content?.text ?? "";
  log.debug(`[format content]: - [inferredParser]: ${inferredParser}`, {
    file_path: handle_data.file_path
  });

  if (inferredParser) {
    if (options.response.content.removeHostname(request, "handle_data.file_ext", "boolean") === true) {
      log.debug(`[remove hostname]: true`, { file_path: handle_data.file_path });
      _content_text = _content_text.replace(_http_link, "");
    }
    if (options.beautify(request, "handle_data.file_ext", "boolean")) {
      log.debug(`[beautify content]: true`, { file_path: handle_data.file_path });
      _content_text = await contnet_format_handler({
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
  log.debug(`[format content]: true - [passed]: ${request.passed}`, { file_path: handle_data.file_path });
  return request;
}

export async function contnet_format_handler(params) {
  let { file_path, content_text, inferredParser } = params;
  let _content_text = content_text;
  try {
    _content_text = await prettier.format(_content_text, {
      tabWidth: 4,
      useTabs: false,
      parser: inferredParser
    });
  } catch (error) {
    let _message = error?.message ?? "";
    _message = _message.length < 100 ? _message : `${_message.substring(0, 100)}...`;
    log.error(`[format content error]: true -`, { file_path: file_path, message: _message });
  }
  return _content_text;
}

