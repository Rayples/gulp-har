
# Installation

```bash
$ npm install gulp-har
```

Example usage of gulp-har:

```js
import gulp_har from 'gulp-har';
import gulp from 'gulp';

gulp.task('parse', (done) => {
    gulp.src("./har/*.har")
        .pipe(gulp_har({
            beautify: ["!.css"],
            override: true,
            filter_request: {
                url: (url) => /^(?!(.*?blob\/master)).*/.test(url),
            }
        }))
        .pipe(gulp.dest("./dest"));
    done();
});

gulp.task("default", gulp.series("parse"));

```

**defaults per options**
```js
let options = {
    query_string: {
        omit: false,
        to_path: true
    },
    log: {
        level: "debug"
    },
    content_text: {
        skip_empty: true
    },
    mime_type: {
        "application/x-javascript": {
            "source": "iana",
            "charset": "UTF-8",
            "compressible": true,
            "extensions": ["js", "mjs"]
        }
    },
    api: {
        saved: true,
        file_name: 'apis.json',
        filter: /(REST|api)\//
    },
    default_ext: '.txt',
    /**
     * 可能的值
     *      override: true,
     *      override: ".js",
     *      override: "!.js",
     *      override: /.(js|html)$/,
     *      override: [".js", ".html"],
     *      override: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    override: true,
    /**
     * 可能的值
     *      beautify: true,
     *      beautify: ".js",
     *      beautify: "!js",
     *      beautify: /.(js|html)$/,
     *      beautify: [".js", ".html"],
     *      beautify: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    beautify: true,
    /**
     * 可能的值
     *      remove_links: true,
     *      remove_links: ".js",
     *      remove_links: "!js",
     *      remove_links: /.(js|html)$/,
     *      remove_links: [".js", ".html"],
     *      remove_links: (ext, handle_data, entrie) => true,
     * @returns {boolean}
     */
    remove_links: true,
    /**
     * 可能的值
     *      filter_request: {
     *          method: "GET",
     *          method: "!GET",
     *          method: /GET|POST/,
     *          method: ["GET", "POST"],
     *          method: (method_value) => true,
     *      }
     * @returns {boolean}
     */
    filter_request: {},
    /**
     * 可能的值
     *      filter_response: {
     *          status: "200",
     *          status: "!500",
     *          status: /200/,
     *          status: ["200", "201"],
     *          status: (status_value) => true,
     *      }
     * @returns {boolean}
     */
    filter_response: {},
}
```