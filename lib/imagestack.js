require('./core');
var events = require('events');

function LimitedImageStack(o) {
	Class.Abstract.prototype.setOptions.call(this, o);
	LimitedImageStack.superclass.prototype.constructor.call(this);
}

Class.extend(LimitedImageStack, events.EventEmitter, function(proto) {
	var _imagesCount = 0,
		_savedImagesCount = 0,
		_savedImages = {},
		_imagesHash = [];
	proto.extend({
		setImagesCount : function(iC) {
			_imagesCount = iC;
			return this;
		},
		getImagesCount : function() {
			return _imagesCount;
		},
		appendImage : function(imageBlob) {
			var self = this;
			if (!imageBlob.id) {
				throw new Error('Wrong image blob provided');
			}
			_savedImages[imageBlob.id] = imageBlob;
			_imagesHash.push(imageBlob.id);
			_savedImagesCount++;
			this.emit('append', imageBlob, _savedImagesCount, this);
			if (_savedImagesCount == this.getImagesCount()) {
				self.emit('end', _imagesHash, _savedImages, _savedImagesCount, this);
			}
		}
	});
	
	return proto;
});

exports.LimitedImageStack = LimitedImageStack;