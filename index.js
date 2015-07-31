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
        multiplier = 1000;

    for (var i = 0; i < suffix.length; ++i) {
        if (size < multiplier) {
            break;
        }

        size /= multiplier;
    }

    return Math.round(size * 100) / 100 + ' ' + suffix[i];
};

var scan = function(path, cb) {
    var struct = [],
        toScan = 0,
        scanned = 0,
        processing = true;

    fs.readdir(path, function(err, files) {
        if (err || !files) {
            console.log('skip', '[' + err.code + ']', path);
            cb(struct);

            return;
        }

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
                    if (err || !stat) {
                        ++scanned;
                        if (!processing && scanned === toScan) {
                            cb(struct);
                        }

                        return;
                    }

                    struct[ind].isDir = stat.isDirectory();

                    if (struct[ind].isDir) {
                        scan(filepath, function(str) {
                            struct[ind].children = str;
                            struct[ind].size = str.reduce(function(sum, item) {
                                return sum + (item.size ? item.size : 0);
                            }, 0);

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

var displayStruct = function(struct, offset) {
    offset = offset || 0;

    var prefix = new Array(offset + 1).join(' ');

    for (var i = 0; i < struct.length; ++i) {
        var row = struct[i];

        console.log(prefix + row.path.substr(offset) + ' - ' + row.size);

        if (row.children) {
            displayStruct(row.children, row.path.length);
        }
    }
};

cli.main(function(args, options) {
    var path = args.shift() || Path.resolve('/'),
        size = (args.shift() || 300) * 1000 * 1000; // MB

    scan(path, function(struct) {
        var walkSort = function(a, b) {
            return a.size === b.size ? 0 : a.size > b.size ? -1 : 1;
        };
        var walk = function(item) {
            item.size = convertSize(item.size);

            if (item.children) {
                item.children = item.children.sort(walkSort).map(walk);
            }

            return item;
        };
        var walkFilter = function(item) {
            if (item.children) {
                item.children = item.children.filter(walkFilter);
            }

            return item.hasOwnProperty('size') && item.size > size;
        };

        struct = struct
            .filter(walkFilter)
            .sort(walkSort)
            .map(walk);

        console.log('--------------------');
        console.log();

        displayStruct(struct);
    });
});