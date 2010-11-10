var http = require('http');
var fs = require('fs');

http.Client.prototype.downloadFile = function(url, path) {
	var self = this;
	
	function __createRequest(method, url, headers) {
		var request = self.request(method || 'GET', url, headers);
		request.end();
		request.on('response', __onResponse);
		return request;
	}
	
	function __onResponse(response) {
		if (response.statusCode >= 300 && response.statusCode < 400) {
			if (!response.headers.location) {
				return;
			}
			request = __createRequest('GET', response.headers.location, {
				host: urlObject.host
			});
			return;
		}
		
		var stream = fs.createWriteStream(path);
		response.on('data', function(responseBody) {
			stream.write(responseBody, 'binary');
		});
		response.on('end', function() {
			stream.end();
			self.emit('download', request, response);
		});
	}
	
	var urlObject = require('url').parse(url);
	var request = __createRequest('GET', urlObject.pathname, {
		host: urlObject.host
	});
	return request;
};