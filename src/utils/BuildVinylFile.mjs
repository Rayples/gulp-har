import { StreamBase } from "./StreamBase.mjs";
import { isEmpty } from "./tools.mjs";
import vinyl_File from "vinyl";
import { join as node_path_join } from "node:path";
import { LogUtil } from "./LogUtil.mjs";

export class BuildVinylFile extends StreamBase {

  feature_name = "BuildVinylFile";

  static make(options) {
    return new BuildVinylFile(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  _transform(chunk, encoding, next) {
    try {
      let { handle_data, har_name } = chunk;

      if (handle_data.error.length != 0) {
        next(null);
        return;
      }

      let {
        cur_file,
        accrued_info: { accrued_object },
      } = this.options;

      handle_data = this.accrued_path(accrued_object, chunk).handle_data;
      const save_file = new vinyl_File({
        cwd: cur_file.cwd,
        base: cur_file.base,
        path: node_path_join(cur_file.path, handle_data.file_path),
        contents: Buffer.from(handle_data.content_text),
      });

      LogUtil.debug({feature_name: this.feature_name, har_name, message: "Vinyl File Builded", path: handle_data.file_path });
      LogUtil.trace({feature_name: this.feature_name, har_name, handle_data, message: "Vinyl file built" });

      next(null, save_file);
    } catch (error) {
      let { har_name, handle_data } = chunk;
      let errorInfo = {feature_name: this.feature_name, har_name, message: error.message };
      handle_data.error.push(errorInfo);
      LogUtil.error(handle_data.error);
      next(null);
    }
  }

  accrued_path(accrued_object, chunk) {
    let { options, handle_data } = chunk;
    if (!accrued_object[handle_data.url_path]) {
      accrued_object[handle_data.url_path] = [];
    }
    let _cur = accrued_object[handle_data.url_path];

    if (!isEmpty(_cur)) {
      if (options.override(chunk, "handle_data.file_ext", "boolean")) {
        _cur.length = 0;
      }
      handle_data.file_name = `${handle_data.file_name}_${_cur.length}`;
    }
    handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
    handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
    _cur.push(handle_data);
    return chunk;
  }
}

