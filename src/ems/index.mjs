import through from "through2";
import { Readable } from "stream";
import vinyl_File from "vinyl";
import { join as node_path_join } from "path";
import { merge_options } from "../utils/parse_options.mjs";
import stream_json from "stream-json";
import Pick from "stream-json/filters/Pick.js";
import StreamArray from "stream-json/streamers/StreamArray.js";
import { BuildRequest } from "../utils/BuildRequest.mjs";
import { ParsePath } from "../utils/ParsePath.mjs";
import { VerifyPath } from "../utils/VerifyPath.mjs";
import { FilterPath } from "../utils/FilterPath.mjs";
import { FilterApiRequest } from "../utils/FilterApiRequest.mjs";
import { PrettierFormat } from "../utils/PrettierFormat.mjs";
import { BuildVinylFile } from "../utils/BuildVinylFile.mjs";
import { BuildOptions } from "../utils/BuildOptions.mjs";



export default (options) => {
  return through.obj(function (file, enc, next) {
    if (file.isNull()) {
      next(null, file);
      return;
    }

    let _this = this;

    let _contents = file.contents;

    if (Buffer.isBuffer(_contents)) {
      _contents = Readable.from(_contents);
    }

    BuildOptions.make().parseOptions(options);

    let _options = merge_options(_default_options, options);
    _options = Object.assign(_options, {
      cur_file: {
        name: file.basename,
        cwd: file.cwd,
        base: file.base,
        path: file.path,
      },
      accrued_info: {
        accrued_object: {},
      }
    })

    const pipeline = _contents
      .pipe(stream_json.parser())
      .pipe(Pick.make({ filter: "log.entries" }))
      .pipe(StreamArray.make())
      .pipe(BuildRequest.make(_options))
      .pipe(ParsePath.make(_options))
      .pipe(VerifyPath.make(_options))
      .pipe(FilterPath.make(_options))
      // .pipe(FilterApiRequest.make())
      .pipe(PrettierFormat.make(_options))
      .pipe(BuildVinylFile.make(_options))

    pipeline.on("data", (newFile) => {
      _this.push(newFile);
    });

    pipeline.on("end", () => {
      // saveToApi(_options);
      next(null);
    });

    pipeline.on('error', (err) => {
      console.error(err.message);
    });

    function saveToApi(options) {
      let { cur_file, apiInfo, accrued_object } = options;
      let _accrued_list = Object.values(accrued_object).flatMap((list) => list);
      let _apis_info = _accrued_list
        .filter((handle_data) => handle_data.saveToApi)
        .reduce((acc, handle_data) => {
          if (!acc[handle_data.url_path]) {
            acc[handle_data.url_path] = {
              url: handle_data.url_path,
              ...handle_data.apiInfo,
            };
          }
          acc[handle_data.url_path][`path${/(_\d+)?$/.exec(handle_data.file_name)[0]}`] = handle_data.file_path;
          return acc;
        }, {});
      const _api_file = new vinyl_File({
        cwd: cur_file.cwd,
        base: cur_file.base,
        path: node_path_join(cur_file.path, apiInfo.fileName),
        contents: Buffer.from(JSON.stringify(Object.values(_apis_info), null, 4)),
      });
      _this.push(_api_file);
    }
  });
};

