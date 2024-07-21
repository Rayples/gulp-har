
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

```

**defaults per options**
```js
let options = {
    override: true,
    beautify: true,
    mimeType: {
        "application/x-javascript": {
            "extensions": ["js", "mjs"]
        }
    },
    request: {
        filter: {
        },
        queryString: {
            remove: true,
            toPath: true
        }
    },
    response: {
        filter: {
            "status": /^[^45]\d+/,
            "content.text": (request, text) => !!text && !!text.trim()
        },
        content: {
            removeHostname: true
        }
    },
    output: {
        defaultExt: "txt",
        dirPath: 'output',
        pathLengthLimit: 150
    },
    apiInfo: {
        saved: true,
        fileName: 'apis.json',
        filter: /(REST|api)\//
    }
 }
```