import gulp_har from 'gulp-har';
import gulp from 'gulp';

gulp.task('parse', (done) => {
    gulp.src("./har/*.har")
        .pipe(gulp_har({
            beautify: true,
            override: true,
            filter_request: {
                url: (url) => /^(?!(.*?blob\/master)).*/.test(url),
            },
            api: {
                saved: true,
                file_name: 'apis.json',
                filter: /(els)\//
            },
        }))
        .pipe(gulp.dest("./dest"));
    done();
});

gulp.task("default", gulp.series("parse"));
