var __global__ = (typeof window !== 'undefined')?window:global;

Object.prototype.extend = Object.prototype.extend || function(proto) {
	for (var i in proto || {}) {
		this[i] = proto[i];
	}
	return this;
};

__global__.Class = (function(c) {
	
	function abstractClass(o) {
		this.setOptions(o || {});
	}
	
	abstractClass.prototype = (function(proto) {
		proto.setOptions = function(o) {
			var __method__;
			for (var i in o || {}) {
				__method__ = 'set' + i.substr(0,1).toUpperCase() + i.substr(1);
				if (this[__method__] && typeof this[__method__] == "function" ) {
					this[__method__].call(this, o[i]);
				}
			}
			return this;
		}
		return proto;
	}(abstractClass.prototype));
	
	return {
		namespace : function(ns) {
			if (!ns.split) return false;
			var o = __global__, parts = ns.split('.');
			for (var i=0;i<parts.length;i++) {
				o = o[parts[i]] = o[parts[i]] || new Object;
			}
			return o;
		},
		extend : function(subClass, superclass, o) {
			var proto = (typeof o == 'function')?o(subClass.prototype):(function(proto){
				proto.extend(o);
				return proto;
			})(subClass.prototype);
			/*var __class__ = function(){};
			__class__.prototype = superclass.prototype;
			subClass.prototype = new __class__;*/
			subClass.prototype = new superclass;
			for (var i in proto) {
				subClass.prototype[i] = proto[i];
			}
			subClass.prototype.constructor = subClass;
			subClass.superclass = superclass;
		},
		Abstract : abstractClass
	}
}(__global__.Class = __global__.Class || {}));
