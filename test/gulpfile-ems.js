import gulp_har from 'gulp-har';
import gulp from 'gulp';

gulp.task('parse', (done) => {
    gulp.src("./har/*.har")
        .pipe(gulp_har({
            beautify: ["!.json"],
            override: ["!.json"],
            request: {
                filter: {
                    url: (request, url) => /^(?!(.*?blob\/master)).*/.test(url),
                }
            },
            response: {
                filter: {
                    "status": /^[^45]\d+/,
                    "content.text": (request, text) => !!text && !!text.trim()
                }
            }
        }))
        .pipe(gulp.dest("./dest"));
    done();
});

gulp.task("default", gulp.series("parse"));