var couchdb = require('couchdb');

couchdb.Db.prototype.fetchAllDocs = function(query, data, cb) {
	if (!cb) {
		cb = data;
		if (!cb && typeof(query) == 'function') {
			cb = query;
			query = null;
		}
		data = null;
	}
	return this.request({
		method: 'POST',
		path: '/_all_docs',
		data: data,
		query: query
	}, cb); 
};