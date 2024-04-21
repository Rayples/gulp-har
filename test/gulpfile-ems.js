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
