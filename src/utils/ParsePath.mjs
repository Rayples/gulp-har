import { StreamBase } from "./StreamBase.mjs";
import { replaceIllegalChar } from "./tools.mjs";
import url from "url";
import { parse as node_path_parse } from "node:path";
import { LogUtil } from "./LogUtil.mjs";

export class ParsePath extends StreamBase {

  feature_name = "ParsePath";

  static make(options) {
    return new ParsePath(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  _transform(chunk, encoding, next) {
    try {
      let { entrie, handle_data, har_name } = chunk;

      if (handle_data.error.length != 0) {
        LogUtil.error(handle_data.error);
        next(null);
        return;
      }

      let parsedUrl = url.parse(decodeURIComponent(entrie.request.url), true);
      let _path = parsedUrl.href;

      let _path_name = decodeURIComponent(parsedUrl.pathname);
      const _path_info = node_path_parse(_path_name);
      let _folder = _path_info.dir;

      handle_data.file_ext = _path_info.ext;

      if (this.options.request.queryString.remove(chunk, "handle_data.file_ext", "boolean")) {
        LogUtil.debug({feature_name: this.feature_name, har_name, message: "Remove Query String"});
        _path = _path_name;
      }
      if (this.options.request.queryString.toPath(chunk, "handle_data.file_ext", "boolean")) {
        LogUtil.debug({feature_name: this.feature_name, har_name, message: "Convert Query String to Path"});
        let _queryString = entrie.request.queryString;
        let _query_string_path = _queryString.reduce((acc, { name, value }) => `${acc}/${decodeURI(name)}-${decodeURI(value)}`, "");
        _folder += _query_string_path;
        _path = `${_folder}/${_path_info.base}`;
      }

      chunk.handle_data = {
        ...handle_data,
        url_path: _path_name,
        file_path: replaceIllegalChar(_path),
        file_dir: replaceIllegalChar(_folder),
        file_name: replaceIllegalChar(_path_info.name),
        file_full_name: replaceIllegalChar(_path_info.base),
      };

      LogUtil.trace({feature_name: this.feature_name, har_name, handle_data, message: "Path parsed"});

      next(null, chunk);
    } catch (error) {
      let { har_name, handle_data } = chunk;
      let errorInfo = {feature_name: this.feature_name, har_name, message: error.message };
      handle_data.error.push(errorInfo);
      LogUtil.error(handle_data.error);
      next(null);
    }
  }
}

