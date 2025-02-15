import { StreamBase } from "./StreamBase.mjs";
import prettier from "prettier";
import { LogUtil } from "./LogUtil.mjs";

const inferredParserCache = new Map();
const _http_link = /(http(s)?:)?\/\/(\w+\.)+(com|net|cn|org|gov|edu|info)/g;

export class PrettierFormat extends StreamBase {

  feature_name = "PrettierFormat";

  static make(options) {
    return new PrettierFormat(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  async _transform(chunk, encoding, next) {
    try {
      let { entrie, har_name, handle_data } = chunk;

      if (handle_data.error.length != 0) {
        next(null);
        return;
      }

      const _key = `temp${handle_data.file_ext}`;
      let inferredParser = inferredParserCache.get(_key);
      if (inferredParser === undefined) {
        const fileInfoResult = await prettier.getFileInfo(_key);
        inferredParserCache.set(_key, (inferredParser = fileInfoResult.inferredParser));
      }

      let _content_text = entrie.response.content?.text ?? "";

      if (inferredParser) {
        LogUtil.debug({feature_name: this.feature_name, har_name, message: "Prettier Format"});
        // if (
        //   this.options.response.content.removeHostname(
        //     chunk,
        //     "handle_data.file_ext",
        //     "boolean"
        //   ) === true
        // ) {
        //   _content_text = _content_text.replace(_http_link, "");
        // }

        if (this.options.beautify(chunk, "handle_data.file_ext", "boolean")) {
          LogUtil.debug({feature_name: this.feature_name, har_name, message: "Beautify"});
          let file_path = handle_data.file_path;
          try {
            _content_text = await prettier.format(_content_text, {
              tabWidth: 4,
              useTabs: false,
              parser: inferredParser,
            });
          } catch (error) {
            let _message = error?.message ?? "";
            _message = _message.length < 100 ? _message : `${_message.substring(0, 100)}...`;
            LogUtil.error({feature_name: this.feature_name, har_name, handle_data, message: _message });
          }
        }
      }

      let _file_encoding = entrie.response.content.encoding;
      if (_file_encoding == "base64") {
        _content_text = Buffer.from(_content_text, "base64");
      }

      handle_data.content_text = _content_text;

      LogUtil.trace({feature_name: this.feature_name, har_name, handle_data, message: "Prettier Formatted" });

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

