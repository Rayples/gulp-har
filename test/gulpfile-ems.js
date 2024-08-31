import gulp_har from 'gulp-har';
import gulp from 'gulp';

gulp.task("parse", (done) => {
    gulp
      .src("./har/*.har")
      .pipe(
        gulp_har({
          beautify: true,
          override: false,
          request: {
            filter: {
              url: (request, url) => {
                return !/(blob|raw|tree)\/master/.test(url);
              }
            }
          },
          response: {
            filter: {
              status: /^[^45]\d+/,
              "content.text": (request, text) => {
                return text === undefined ? true : !!text.trim();
              }
            }
          }
        })
      )
      .pipe(gulp.dest("./dest"));
    done();
  });

gulp.task("default", gulp.series("parse"));
