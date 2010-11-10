var fs = require('fs');

fs.mkdirRecursive = function(path, mode, cb) {
	path = path.replace(/\/+$/, '');
	//Check whether relative path was provided
	if (path.charAt(0) != '/') {
		path = process.cwd() + '/' + path;
	}
	var parts = path.split('/'), 
		walker = [];
	if (arguments.length < 3) {
		cb = mode;
		mode = 0755;
	}
	walker.push(parts.shift());
	(function walk(d) {
		if (d === undefined) {
			cb();
			return;
		}
		walker.push(d);
		var dir = walker.join('/');
		fs.stat(dir, function statCallback(er, statInfo) {
			if (er) {
				fs.mkdir(dir, mode, function(er, s) {
					if (er && er.message.indexOf("EEXIST") === 0) {
						fs.stat(dir, statCallback);
						return;
					}
					if (er) {
						cb(new Error('Failed to create ' + dir + ' while ensuring ' + path + "\n" + er.message));
						return;
					}
					walk(parts.shift());
				});
			}
			else {
				if (statInfo.isDirectory()) {
					walk(parts.shift());
				}
				else {
					cb(new Error('Failed to create ' + dir + '. File already exists'));
				}
			}
		})
	}(parts.shift()))
};