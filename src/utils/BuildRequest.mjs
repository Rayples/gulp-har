import { StreamBase } from "./StreamBase.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class BuildRequest extends StreamBase {

  feature_name = "BuildRequest";

  static make(options) {
    return new BuildRequest(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  _transform(chunk, encoding, next) {
    
    const requestChunk = {
        har_name: this.options.cur_file.name,
        entrie: chunk.value,
        handle_data: {
          error: [],
          url_path: null,
          file_path: null,
          file_dir: null,
          file_name: null,
          file_ext: null,
          file_full_name: null,
          saveToApi: false,
          apiInfo: {},
        }
      };
    LogUtil.debug({feature_name: this.feature_name, har_name: requestChunk.har_name, message: "Build Request"});
    next(null, requestChunk);
  }
}

