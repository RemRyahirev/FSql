var cli = require('cli'),
    fs = require('fs'),
    Path = require('path');

var convertSize = function(size) {
    var suffix = [
            'B',
            'KB',
            'MB',
            'GB',
            'TB'
        ],
        start = 1,
        multiplier = 1000;

    for (var i = 0; i < suffix.length; ++i) {
        if (size < multiplier) break;

        size /= multiplier;
    }

    return Math.round(size, 2) + ' ' + suffix[i];
};

var scan = function (path, cb) {
    var struct = [],
        toScan = 0,
        scanned = 0,
        processing = true;

    fs.readdir(path, function(err, files) {
        for (var i = 0; i < files.length; ++i) {
            var file = files[i],
                filepath = Path.join(path, file),
                ind = struct.length;

            struct.push({
                path: filepath
            });

            ++toScan;
            (function(ind, filepath) {
                fs.stat(filepath, function(err, stat) {
                    struct[ind].isDir = stat.isDirectory();

                    if (struct[ind].isDir) {
                        scan(filepath, function(str) {
                            struct[ind].children = str;
                            struct[ind].size = str.reduce(function (sum, item) {return sum + item.size;} , 0);

                            ++scanned;
                            if (!processing && scanned === toScan) {
                                cb(struct);
                            }
                        });
                    } else {
                        struct[ind].size = stat.size;

                        ++scanned;
                        if (!processing && scanned === toScan) {
                            cb(struct);
                        }
                    }
                });
            })(ind, filepath);
        }

        processing = false;
        if (scanned === toScan) {
            cb(struct);
        }
    });
};

cli.main(function(args, options) {
    var path = args.shift() || '/',
        size = (args.shift() || 100) * 1000 * 1000; // MB

    scan(path, function(struct) {
        var walk = function (item) {
            item.size = convertSize(item.size);

            if (item.children) {
                item.children = item.children.map(walk);
            }

            return item;
        };

        struct = struct
            .filter(function(item) {
                return item.hasOwnProperty('size') && item.size > size;
            })
            .map(walk);

        console.log('result:', struct);
    });
});