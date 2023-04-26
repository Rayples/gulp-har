
# Installation

```bash
$ npm install gulp-har
```

Example usage of gulp-har:

```js
const saveHar = require('gulp-har');
const gulp = require('gulp');
const path = require("path");

gulp.task('parse', (done) => {
    gulp.src("./**/*.har")
        .pipe(saveHar({
            beautify: true,
            // filter: "response.content.mimeType@_@image\\/jpeg",
            // filter: (http) => {
            //     return http.response.status == "404";
            // },
            saveCallBack: function (filePath, content, options, m) {
                let _ext = path.extname(filePath);
                if (_ext === ".img") {
                    content = Buffer.from(content, "base64");
                    filePath = filePath.replace(".img", ".png");
                }
                return {
                    filePath,
                    content
                }
            },
            mimeTypeOptions: {
                "image/png": ".png",
                callback: (urlPath, mimeType) => {
                    return urlPath;
                }
            },
            apiOptions: {
                // filter: /api.*/,
                filter: (urlPath) => {
                    return /api.*/.test(urlPath);
                }
            }
        }))
        .pipe(gulp.dest("./dest"));
    done();
});

gulp.task("default", gulp.series("parse"));
```

```js
const saveHar = require('gulp-har');
const gulp = require('gulp');
const path = require("path");

gulp.task('parse', (done) => {
    gulp.src("./**/*.har")
        .pipe(saveHar({
            beautify: true
        }))
        .pipe(gulp.dest("./dest"));
    done();
});

gulp.task("default", gulp.series("parse"));
```

**defaults per options**
```js
const DEFAULT_MIME_TYPE = ".txt";

const mimeTypeOptions = {
    // add some custom mime type that is out of mime-db
    // "application/json": ".json",
    // "text/html": ".html",
    // "application/x-javascript": ".js",
    // "application/javascript": ".js",
    // "image/gif": ".gif",
    "callback": function | undefined
};

const apiOptions = {
    filter: string | function | undefined, // if filter has value, will save response.config.json
    dest: string, // default "."
    fileName: "response.config.json"
}

const defaultOptions = {
    beautify: boolean | undefined, // default false
    filter: string | function | undefined, // filter http record
    saveCallBack: function | undefined, // can change file content and path for specify file type
}
```