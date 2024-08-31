import { join as node_path_join } from "path";
import vinyl_File from "vinyl";
import { parse_path, verify_path, filter_path, filter_api_request, format_content } from "../utils/handler.mjs";
import { isEmpty } from "./tools.mjs";
import { getLogger } from "./logUtil.mjs";
import event from "../events/index.mjs";

const module_name = "utils/index.mjs";

const log = getLogger("main", { context: { moduleName: module_name } });
const log_performance = getLogger("performance");

event.on("parse_path", (request) => {
  request = parse_path(request);
  request.passed ? event.emit("verify_path", request) : event.emit("handler_finish", request);
});

event.on("verify_path", (request) => {
  request = verify_path(request);
  request.passed ? event.emit("filter_path", request) : event.emit("handler_finish", request);
});

event.on("filter_path", (request) => {
  request = filter_path(request);
  request.passed ? event.emit("filter_api_request", request) : event.emit("handler_finish", request);
});

event.on("filter_api_request", (request) => {
  request = filter_api_request(request);
  request.passed ? event.emit("format_content", request) : event.emit("handler_finish", request);
});

event.on("format_content", async (request) => {
  request = await format_content(request);
  event.emit("handler_finish", request);
});

event.on("accrued_request", (accrued_object, request) => {
  const { handle_data, cur_file } = accrued_path(accrued_object, request);
  const _save_file = new vinyl_File({
    cwd: cur_file.cwd,
    base: cur_file.base,
    path: node_path_join(cur_file.path, handle_data.file_path),
    contents: Buffer.from(handle_data.content_text)
  });
  event.emit("push_file", _save_file);
});

event.on("save_api", (accrued_object, cur_file, options) => {
  let _accrued_list = Object.values(accrued_object).flatMap((list) => list);
  let _apis_info = _accrued_list
    .filter((handle_data) => handle_data.saveToApi)
    .reduce((acc, handle_data) => {
      acc[handle_data.url_path] ??= {
        url: handle_data.url_path,
        ...handle_data.apiInfo
      };
      acc[handle_data.url_path][`path${/(_\d+)?$/.exec(handle_data.file_name)[0]}`] = handle_data.file_path;
      return acc;
    }, {});
  const _api_file = new vinyl_File({
    cwd: cur_file.cwd,
    base: cur_file.base,
    path: node_path_join(cur_file.path, options.apiInfo.fileName),
    contents: Buffer.from(JSON.stringify(Object.values(_apis_info), null, 4))
  });
  event.emit("push_file", _api_file);
});

export function handle(request) {
  for (let _handler of handlers_chain) {
    try {
      request.passed = false;
      performance.mark("start");
      request = _handler(request);
    } catch (error) {
      // log error
      request.passed == false;
      log.error(`${_handler.name} error {0}`, error);
      break;
    }

    if (request.passed == false) {
      // log error
      log.error(`${_handler.name} failed`);
      break;
    }
    performance.mark("end");
    let { duration } = performance.measure("operationDuration", "start", "end");
    log_performance.trace(`${_handler.name} finish`, {
      duration,
      file_path: request.handle_data.file_path
    });
  }
  return request;
}

export function accrued_path(accrued_object, request) {
  let { options, handle_data } = request;
  let _cur = (accrued_object[handle_data.url_path] ??= []);
  if (options.override(request, "handle_data.file_ext", "boolean") && !isEmpty(_cur)) {
    _cur.length = 0;
  }
  if (!isEmpty(_cur)) {
    handle_data.file_name = `${handle_data.file_name}_${_cur.length}`;
  }
  handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
  handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
  _cur.push(handle_data);
  return request;
}

