import { StreamBase } from "./StreamBase.mjs";
import md5 from "md5";
import { get_extension, isEmpty } from "./tools.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class VerifyPath extends StreamBase {

  feature_name = "VerifyPath";

  static make(options) {
    return new VerifyPath(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  _transform(chunk, encoding, next) {
    try {
      let { entrie, handle_data, har_name } = chunk;

      if (handle_data.error.length != 0) {
        next(null);
        return;
      }

      let _mime_type = entrie.response.content.mimeType;

      if (isEmpty(handle_data.file_ext)) {
        LogUtil.debug({feature_name: this.feature_name, har_name, message: "No file extension"});
        handle_data.file_ext = `.${get_extension(_mime_type, this.options.mimeType, this.options.output.defaultExt(chunk, "entrie.response.content.mimeType"))}`;
        handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
        handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
      }

      // 解决路径过长问题
      if (handle_data.file_dir.length > this.options.output.pathLengthLimit) {
        LogUtil.debug({feature_name: this.feature_name, har_name, message: "Path too long"});
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
      }

      LogUtil.trace({feature_name: this.feature_name, har_name, handle_data, message: "Path verified"});

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

