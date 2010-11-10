var sys = require('util');
var http = require('http');
var qs = require('querystring');
var events = require('events');
var hashlib = require('hashlib');
var Apricot = require('apricot').Apricot;
var urlParser = require('url');

require('./core');

Class.namespace('Wallp.Crawler');

Wallp.Crawler.Abstract = function(o) {
	Class.Abstract.prototype.setOptions.call(this, o);
	Wallp.Crawler.Abstract.superclass.prototype.constructor.call(this);
};

Class.extend(Wallp.Crawler.Abstract, events.EventEmitter, function(proto) {
	var _url = '', 
		_imageSize = '',
		_page = 1,
		_resultsSetSize = 0,
		_results = [],
		_rawResults = [],
		_httpClient = null,
		_apiKey = '';
	
	proto.extend({
		setOptions : function(o) {
			return Class.Abstract.prototype.setOptions.call(this, o);
		},
		getUrl : function() {
			return _url;
		},
		setUrl : function(url) {
			_url = url;
			return this;
		},
		getHttpClient : function() {
			if (!_httpClient) {
				this.setHttpClient(http.createClient(80, this.getUrl()));
			}
			return _httpClient;
		},
		setHttpClient : function(client) {
			_httpClient = client;
			return this;
		},
		getImageSize : function() {
			return _imageSize;
		},
		setImageSize : function(iS) {
			_imageSize = iS;
			return this;
		},
		getPage : function() {
			return _page;
		},
		setPage : function(page) {
			_page = page;
			return this;
		},
		getResultsSetSize : function() {
			return _resultsSetSize;
		},
		setResultsSetSize : function(rss) {
			_resultsSetSize = rss;
			return this;
		},
		getRawResults : function() {
			return _rawResults;
		},
		setRawResults : function(rr) {
			_rawResults = rr;
			return this;
		},
		getResults : function() {
			return _results;
		},
		setResults : function(results) {
			_results = results;
			return this;
		},
		getApiKey : function() {
			return _apiKey;
		},
		setApiKey : function(apiKey){
			_apiKey = apiKey;
			return this;
		},
		search : function(term) {
			throw new Error('This method is abstract and must be overriden in subclass');
		}
	});
	
	return proto;
});

Wallp.Crawler.JSONCrawler = function(o) {
	var defaults = {
		
	};
	Wallp.Crawler.JSONCrawler.superclass.prototype.constructor.call(this, defaults.extend(o || {}));
};

Class.extend(Wallp.Crawler.JSONCrawler, Wallp.Crawler.Abstract, function(proto) {
	var _searchTerm = '';
	
	proto.extend({
		setSearchTerm : function(term) {
			_searchTerm = term;
			return this;
		},
		getSearchTerm : function() {
			return _searchTerm;
		},
		getQueryParams : function() {
			return {};
		},
		getResultSet : function(rawData, cb) {
			if (typeof(cb) == 'function') {
				cb.call(this, {});
			}
		},
		getResult : function(rawData, cb) {
			if (typeof(cb) == 'function') {
				cb.call(this, {});
			}
		},
		getSearchUrl : function() {
			return '';
		},
		search : function(term) {
			this.setSearchTerm(term);
			
			var self = this, 
				httpClient = this.getHttpClient(), 
				url = this.getSearchUrl();
			var request = httpClient.request('GET', url, {
				host : this.getUrl()
			});
			request.end();
			request.on('response', function(response) {
				var responseBody = "";
				response.setEncoding('utf8');
				response.addListener("data", function(chunk) {responseBody += chunk});
				response.addListener("end", function() {
					var data = JSON.parse(responseBody), 
						_crawledImages = [],
						_img;
					self.getResultSet(data, function(images) {
						self.emit('response', data, responseBody);
						if (images && images.length > 0) {
							(function(){
								var _iterationsCount = 0;
								function _increaseIteration() {
									if (_iterationsCount++ == images.length) {
										self.emit('end', _crawledImages);
									}
								}
								for(var i=0;i<images.length;i++) {
									self.getResult(images[i], function(_img) {
										_crawledImages.push(_img);
										self.emit('data', _img);
										_increaseIteration();
									});
								}
							}());
						}
					});
				})
			});
			return this;
		}
	});
	return proto;
});

Wallp.Crawler.GoogleImages = function(o) {
	var defaults = {
		url:'ajax.googleapis.com',
		resultsSetSize:8,
		imageSize:'xxlarge'
	};
	Wallp.Crawler.GoogleImages.superclass.prototype.constructor.call(this, defaults.extend(o || {}));
};

Class.extend(Wallp.Crawler.GoogleImages, Wallp.Crawler.JSONCrawler, function(proto) {
	proto.extend({
		getQueryParams : function() {
			return {
				q : this.getSearchTerm(),
				v : '1.0',
				rsz : this.getResultsSetSize(),
				imgsz : this.getImageSize(),
				imgtype : 'photo',
				start : (this.getPage() - 1) * this.getResultsSetSize()
			};
		},
		getSearchUrl : function() {
			return '/ajax/services/search/images?' + qs.stringify(this.getQueryParams());
		},
		getResultSet : function(rawData, cb) {
			var returnData = [];
			if (rawData && rawData.responseData && rawData.responseData.results) {
				returnData = rawData.responseData.results || [];
			}
			cb.call(this, returnData);
		},
		getResult : function(img, cb) {
			cb.call(this, {
				id : img.imageId,
				width : parseInt(img.width),
				height : parseInt(img.height),
				url : img.unescapedUrl,
				title : img.titleNoFormatting,
				referer : img.originalContextUrl,
				thumbnail : {
					width : parseInt(img.tbWidth),
					height : parseInt(img.tbHeight),
					url : img.tbUrl
				}
			});
		}
	});
	return proto;
});

Wallp.Crawler.YahooImages = function(o) {
	var defaults = {
		url:'boss.yahooapis.com',
		resultsSetSize:10,
		imageSize:'wallpaper'
	};
	Wallp.Crawler.YahooImages.superclass.prototype.constructor.call(this, defaults.extend(o || {}));
};

Class.extend(Wallp.Crawler.YahooImages, Wallp.Crawler.JSONCrawler, function(proto) {
	proto.extend({
		getQueryParams : function() {
			return {
				count : this.getResultsSetSize(),
				dimensions : this.getImageSize(),
				format : 'json',
				start : (this.getPage() - 1) * this.getResultsSetSize(),
				appid : this.getApiKey()
			};
		},
		getSearchUrl : function() {
			return '/ysearch/images/v1/"' + encodeURIComponent(this.getSearchTerm()) + '"/?' + qs.stringify(this.getQueryParams());
		},
		getResultSet : function(rawData, cb) {
			var returnData = [];
			if (rawData && rawData.ysearchresponse && rawData.ysearchresponse.resultset_images) {
				returnData = rawData.ysearchresponse.resultset_images || [];
			}
			cb.call(this, returnData);
		},
		getResult : function(img, cb) {
			cb.call({
				id : hashlib.md5(img.url),
				width : parseInt(img.width),
				height : parseInt(img.height),
				url : img.url,
				title : img.title,
				referer : img.refererurl,
				thumbnail : {
					width : parseInt(img.thumbnail_width),
					height : parseInt(img.thumbnail_height),
					url : img.thumbnail_url
				}
			});
		}
	});
	return proto;
});

Wallp.Crawler.HtmlCrawler = function(o) {
	var defaults = {};
	Wallp.Crawler.HtmlCrawler.superclass.prototype.constructor.call(this, defaults.extend(o || {}));
};

Class.extend(Wallp.Crawler.HtmlCrawler, Wallp.Crawler.JSONCrawler, function(proto) {
	var _userAgent = '';
	proto.extend({
		getUserAgent : function() {
			return _userAgent;
		},
		setUserAgent : function(userAgent) {
			_userAgent = userAgent;
			return this;
		},
		search : function(term) {
			this.setSearchTerm(term);
			
			var self = this, 
				httpClient = this.getHttpClient(), 
				url = this.getSearchUrl();
			var request = httpClient.request('GET', url, {
				host : this.getUrl(),
				'User-Agent' : this.getUserAgent()
			});
			request.end();
			request.on('response', function(response) {
				var responseBody = "";
				response.setEncoding('utf8');
				response.addListener("data", function(chunk) {responseBody += chunk});
				response.addListener("end", function() {
					var _crawledImages = [],
						_img;
					self.getResultSet(responseBody, function(images) {
						self.emit('response', images, responseBody);
						if (images && images.length > 0) {
							(function(){
								var _iterationsCount = 0;
								function _increaseIteration() {
									if (++_iterationsCount == images.length) {
										self.emit('end', _crawledImages);
									}
								}
								for(var i=0;i<images.length;i++) {
									self.getResult(images[i], function(_img) {
										_crawledImages.push(_img);
										self.emit('data', _img);
										_increaseIteration();
									});
								}
							}());
						}
					});
				})
			});
			return this;
		}
	});
	return proto;
});

Wallp.Crawler.GoogleImagesHtml = function(o) {
	var defaults = {
		url:'www.google.com',
		imageSize:'l',
		resultsSetSize:20
	};
	Wallp.Crawler.GoogleImagesHtml.superclass.prototype.constructor.call(this, defaults.extend(o || {}));
};

Class.extend(Wallp.Crawler.GoogleImagesHtml, Wallp.Crawler.HtmlCrawler, function(proto) {
	proto.extend({
		getQueryParams : function() {
			var _iSize = this.getImageSize(),
				tbs = '';
			if (_iSize) {
				tbs += 'isz:' + _iSize;
			}
			return {
				q : this.getSearchTerm(),
				tbs : tbs,
				start : (this.getPage() - 1) * this.getResultsSetSize(),
				hl:'en',
				gbv:1
			};
		},
		getSearchUrl : function() {
			return '/images?' + qs.stringify(this.getQueryParams());
		},
		getResultSet : function(body, cb) {
			var self = this;
			Apricot.parse(body, function(doc) {
				var _results = [];
				function _pushResult(result) {
					_results.push(result);
					if (_results.length == doc.matches.length) {
						cb.call(self, _results);
					}
				}
				doc.find('#ImgCont a').each(function(a) {
					var urlObject = urlParser.parse(a.href, true);
					_pushResult(urlObject.query);
				});
			});
		},
		getResult : function(img, cb) {
			cb.call(this, {
				id : hashlib.md5(img.imgurl),
				width : parseInt(img.w),
				height : parseInt(img.h),
				url : img.imgurl,
				referer : img.imgrefurl,
				thumbnail : {
					width : parseInt(img.tbnw),
					height : parseInt(img.tbnh)
				}
			});
		}
	});
	return proto;
});