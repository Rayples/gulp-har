const parse = require('../index');
const gulp = require('gulp');
const path = require("path");

gulp.task('parse', (done) => {
    gulp.src("./**/*.har")
        .pipe(parse({
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
