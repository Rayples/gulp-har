import * as handler from "./handler.mjs"
import { isEmpty } from "./tools.mjs";

const handlers_chain = [
    (handler.parse_path),
    (handler.verify_path),
    (handler.filter_path),
    (handler.filter_api_request),
    (handler.format_content),
]

export function handle(request) {
    for (let _handler of handlers_chain) {
        try {
            request.passed = false;
            request = _handler(request);
        } catch (error) {
            // log error
            request.passed == false;
            console.error(error);
            break;
        }

        if(request.passed == false) {
            // log error
            break;
        }
    }
    return request
}


// 累计路径
export function accrued_path(request_list) {
   const acc = request_list.reduce((acc, _request) => {
        let {options, handle_data} = _request;
        let _cur =  acc[handle_data.url_path] ??= [];
        if(options.override(_request, "handle_data.file_ext", "boolean") && !isEmpty(_cur)) {
            _cur.length = 0;
        }
        if(!isEmpty(_cur)) {
            handle_data.file_name = `${handle_data.file_name}_${_cur.length}`;
        }
        handle_data.file_full_name = `${handle_data.file_name}${handle_data.file_ext}`;
        handle_data.file_path = `${handle_data.file_dir}/${handle_data.file_full_name}`;
        _cur.push(handle_data);
        return acc;
    }, {});
    return Object.values(acc).flatMap((list) => list);
}
