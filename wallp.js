require('./lib/core');
require('./lib/crawler');
require('./lib/httpDownload');
require('./lib/mkdir');
require('./lib/couchdb');

var sys = require('util');
var http = require('http');
var hashlib = require('hashlib');
var couchdb = require('couchdb');
var urlParser = require('url');
var fs = require('fs');
var log4js = require('log4js');

log4js.addAppender(log4js.consoleAppender());
log4js.addAppender(log4js.fileAppender('logs/log.log'));

var mainLogger = log4js.getLogger();

var mode = 'debug',
	couchDbSettings = {
		release :{
			host : '74.207.240.126',
			port : 1207
		},
		debug : {
			host : '127.0.0.1',
			port : 5984
		}
	};

var couchClient = couchdb.createClient(couchDbSettings[mode].port, couchDbSettings[mode].host);
var db = couchClient.db('wallp');

//var crawler = new Wallp.Crawler.GoogleImages();
//var crawler = new Wallp.Crawler.YahooImages({
//	apiKey : 'X82oDMLV34Gu0xqtThsnUsIZHzEVc3OycJtBAhKZfMOdeYFbrwDEEKn32pCejg--'
//});
var crawler = new Wallp.Crawler.GoogleImagesHtml({
	userAgent : 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.10 (KHTML, like Gecko) Chrome/8.0.552.5 Safari/534.10'
});

crawler.on('error', function(e) {
	mainLogger.error(e.message);
});

crawler.on('end', function(images) {
	var hash = [], stack = {}, _id, self = this;
	for(var i=0;i<images.length;i++) {
		_id = hashlib.md5(images[i].id);
		hash.push(_id);
		stack[_id] = images[i];
	}
	db.fetchAllDocs(null, JSON.stringify({keys:hash}), function(er, resultSet) {
		var _stack = stack, rows = resultSet.rows;
		if (er) {
			self.emit('error', new Error(er.reason));
			return;
		}
		for (var i=0; i<rows.length; i++) {
			if (rows[i].id) {
				//Delete already existent image
				self.emit('deleteResult', _stack[rows[i].id], rows[i]);
				delete _stack[rows[i].id];
			}
		}
		self.emit('filter', _stack);
	});
});

crawler.on('filter', function(images) {
	for (var i in images) {
		if (images.hasOwnProperty(i)) {
			downloadFile.call(this, images[i]);
		}
	}
});

crawler.on('download', function(data, fileName, filePath, mimeType) {
	mainLogger.info(filePath);
	var id = hashlib.md5(data.id), 
		self = this;
	data.filePath = filePath;
	data.mimeType = mimeType;
	db.saveDoc(id, data, function(er, ok) {
		if (er) {
			fs.stat(fileName + '.tmp', function(er) {
				if (!er) {
					fs.unlink(fileName + '.tmp');
				}
			});
			self.emit('error', new Error(er.reason));
			return;
		}
	});
});

for (var page=1;page<=1;page++) {
    crawler.setPage(page).search('mercedes benz wallpapers');
}


/**
 * Functions
 */

var types = {
	'image/jpeg' : 'jpg',
	'image/png' : 'png',
	'image/gif' : 'gif',
	'image/bmp' : 'bmp'
};

function getRandomSequence() {
    var min = 60466176;
    var max = 3656158440062976;
    var i = Math.floor(Math.random() * (max - min) + min);
    return i.toString(36);
}

function downloadFile(data) {
	var urlObject = urlParser.parse(data.url), 
		fileName = getRandomSequence();
	var _httpClient = http.createClient(80, urlObject.hostname);
	_httpClient.on('download', function(request, response) {
		if (response.statusCode >= 400) {
			fs.stat(fileName + '.tmp', function(er) {
				if (!er) {
					fs.unlink(fileName + '.tmp');
				}
			});
			crawler.emit('error', new Error('Download error (' + fileName + '): ' + response.statusCode));
			return;
		}
		var mimeType = response.headers['content-type'];
		if (types[mimeType]) {
			var fileDir = [__dirname, 'images', fileName[0], fileName[1]].join('/');
			fs.stat(fileDir, function(err, stats) {
				var newFileName = fileName + '.' + types[mimeType]
				var filePath = [fileDir, newFileName].join('/');
				var __onSave = function() {
					crawler.emit('download', data, newFileName, filePath, mimeType);
				}
				
				var __saveFile = function() {
					fs.rename(fileName + '.tmp', filePath, function(er) {
						if (!er) {
							__onSave();
						}
					});
				}
				
				if (err) {
					fs.mkdirRecursive(fileDir, 0777, function(er) {
						if (!er) {
							__saveFile();
						}
						else {
							crawler.emit('error', new Error('Cannot create directory for images: ' + fileDir));
						}
					});
				}
				else {
					__saveFile()
				}
			});
		}
		else {
			fs.unlink(fileName + '.tmp');
		}
	});
	_httpClient.downloadFile(data.url, fileName + '.tmp');
}