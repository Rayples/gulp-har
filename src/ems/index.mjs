import through from "through2";
import { merge_options } from "../utils/parse_options.mjs";
import LogUtil, { getLogger } from "../utils/logUtil.mjs";
import event from "../events/index.mjs";
import * as utils from "../utils/index.mjs";

const module_name = "ems/index.mjs";
const log = getLogger("main", { context: { moduleName: module_name } });

export default (options) => {
  return through
    .obj(function (file, enc, next) {
      LogUtil.context.addContext("fileName", file.basename);
      if (file.isNull()) {
        log.debug(`File is null: ${file.path}`);
        next(null, file);
        return;
      }

      let _contents = file.contents;
      if (Buffer.isBuffer(_contents)) {
        _contents = _contents.toString();
      }

      try {
        if (typeof _contents === "string") {
          _contents = JSON.parse(_contents);
        }
      } catch (e) {
        log.debug(`File is null: ${file.path}`);
        next(null, file);
        return;
      }

      const _cur_file = {
        name: file.basename,
        cwd: file.cwd,
        base: file.base,
        path: file.path
      };

      let _options = merge_options(options);
      const _entries = _contents?.log?.entries;
      let accrued_info = {
        cur_file: _cur_file,
        accrued_urls: [],
        accrued_object: {}
      };
      const listener = handler_finish_listener(accrued_info, _entries.length, () => {
        event.off("handler_finish", listener);
        next();
      });
      event.on("handler_finish", listener);

      event.on("push_file", (save_file) => {
        this.push(save_file);
      });
      _entries.forEach((entrie) => {
        const request = {
          cur_file: _cur_file,
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
        };
        event.emit("parse_path", request);
      });

      if (accrued_info.accrued_urls.length === _entries.length && _options.apiInfo.saved === true) {
        console.log("ssasas");
      }
    })
    .on("finish", () => {
      event.removeAllListeners();
      LogUtil.log4js.shutdown();
      LogUtil.context.clearContext();
    });
};

function handler_finish_listener(accrued_info, requestOfEntriesLength, callback) {
  let { cur_file: _cur_file, accrued_urls: _accrued_urls, accrued_object: _accrued_object } = accrued_info;
  return (request) => {
    const { handle_data, options, cur_file } = request;
    if (_cur_file.name != cur_file.name) {
      log.error(` ΘöÖΦ»»τÜäΣ║ïΣ╗╢τ¢æσÉ¼∩╝îµ¡ñµ¼íσñäτÉåσ░åσ┐╜τòÑ: ${_cur_file.name} != ${cur_file.name}`);
      return;
    }
    _accrued_urls.push(handle_data.url_path);
    if (request.passed) {
      log.debug(`[request handle result]: passed`, {
        file_path: handle_data.file_path
      });
      event.emit("accrued_request", _accrued_object, request);
    } else {
      log.error(`[request handle result]: failed`, {
        file_path: handle_data.file_path
      });
    }
    if (_accrued_urls.length === requestOfEntriesLength && options.apiInfo.saved === true) {
      event.emit("save_api", _accrued_object, cur_file, options);
      callback();
    }
  };
}

