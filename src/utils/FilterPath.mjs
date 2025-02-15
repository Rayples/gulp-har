import { StreamBase } from "./StreamBase.mjs";
import { LogUtil } from "./LogUtil.mjs";

export class FilterPath extends StreamBase {
  feature_name = "FilterPath";

  static make(options) {
    return new FilterPath(options);
  }

  constructor(options) {
    super(Object.assign({}, options, { writableObjectMode: true, readableObjectMode: true }));
  }

  async _transform(chunk, encoding, next) {
    try {
      let { har_name, handle_data } = chunk;

      if (handle_data.error.length != 0) {
        next(null);
        return;
      }

      let _request_filter = Object.entries(this.options.request.filter).every(([key, value]) => {
        let result = value(chunk, `entrie.request.${key}`);
        LogUtil.debug({feature_name: this.feature_name, har_name, key, result });
        return result;
      });

      let _response_filter = Object.entries(this.options.response.filter).every(([key, value]) => {
        let result = value(chunk, `entrie.response.${key}`);
        LogUtil.debug({feature_name: this.feature_name, har_name, key, result });
        return result;
      });

      if (!_request_filter) {
        let errorInfo = {feature_name: this.feature_name, har_name, message: "Request filter failed" };
        handle_data.error.push(errorInfo);
        LogUtil.error(handle_data.error);
        next(null);
        return;
      }
      if (!_response_filter) {
        let errorInfo = {feature_name: this.feature_name, har_name, message: "Response filter failed" };
        handle_data.error.push(errorInfo);
        LogUtil.error(handle_data.error);
        next(null);
        return;
      }

      LogUtil.trace({feature_name: this.feature_name, har_name, handle_data, message: "Path filtered" });

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

