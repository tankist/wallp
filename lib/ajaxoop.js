var $a = Array.prototype.slice.call;
Object.$extensions = ['$super','$_super','$_self'];

/**
 * Core object Ajax - namespace for the most classes in this library
 */
var Ajax = {
	extend : function( dest, src, ext) {
		var ext = ext || true;
		for (var i in src) {
			dest[i] = src[i];
			if (ext) Object.$extensions.push( i);
		}
		if (ext) Object.$extensions = Object.$extensions.uniq();
		return dest;
	},
	isElement   : function( obj) { return (obj && obj.nodeType && obj.nodeType == 1) ? true : false; },
	isArray     : function( obj) { return (obj && obj.constructor === Array); },
	isFunction  : function( obj) { return (obj && obj.constructor === Function); },
	isRegExp    : function( obj) { return (obj && obj.constructor === RegExp); },
	isString    : function( obj) { return (typeof obj == 'string'); },
	isNumber    : function( obj) { return (typeof obj == 'number'); },
	isBoolean   : function( obj) { return (typeof obj == 'boolean'); },
	isObject    : function( obj) { return (obj && !(Ajax.isArray( obj) || Ajax.isFunction( obj) || Ajax.isSimple( obj))); },
	isNull      : function( obj) { return (obj === null); },
	isUndefined : function( obj) { return (obj === 'undefined' || obj === undefined || obj === 'unknown'); },
	isSimple    : function( obj) { return (Ajax.isString( obj) || Ajax.isNumber( obj) || Ajax.isBoolean( obj) || Ajax.isRegExp( obj));}
};

/**
 * OOP implementation: classes definition, inheritance, polymorphism
 */
Ajax.Class = function() {
	/**
	 * Parsing passed arguments, defining variables
	 */
	var _args = $a(arguments),
		parent = (_args.length > 1 ? _args.shift() : null),
		declaration = _args.shift() || {},
		constructor = 'constructor';
	/**
	 * Check if passed arguments are valid
	 */
	if (parent && !Ajax.isFunction( parent)) {
		throw new TypeError( 'in class definition - first argument is not a parent class constructor!');
	}
	if (declaration && (!Ajax.isObject( declaration) || declaration == window || declaration == $d || declaration == $b || Ajax.isElement( declaration))) {
		throw new TypeError( 'in class definition - ' + (_args.length > 1 ? 'second' : 'passed') + ' argument is not a class declaration object!');
	}
	/**
	 * Dynamically creating constructor for class
	 */
	var _class = function() {
		this[constructor].apply( this, $a( arguments));
	};
	/**
	 * Inherit all parent properties
	 */
	if (parent) { 
		var _parent = Function.blank;
		_parent.prototype = parent.prototype;
		_class.prototype  = new _parent;
	}
	/**
	 * Writing class definition (polymorphism icluded)
	 */
	if (declaration) {
		for (var property in declaration) {
			_class.prototype[property] = declaration[property];
		}
		// line below is to fix bug with constructors in IE
		_class.prototype[constructor] = declaration[constructor] || Function.blank;
	}
	/**
	 * Defining special accessors-properties, which can be obtained in classes declaration
	 * as this.$parent, this.$_parent and this.$_self get access to manipulating with
	 * parent class its methods and properties
	 */
	_class.prototype.$super  = parent ? parent.prototype : Function.blank.prototype;
	_class.prototype.$_super = parent ? parent : Function.blank;
	_class.prototype.$_self  = _class;
	/**
	 * Returns dynamically created constructor
	 */
	return _class;
};

Ajax.extend( Function.prototype, {
	blank : function() {},

	bind : function() {
		if (arguments.length < 2 && Ajax.isUndefined( arguments[0])) return this;
		var f = this, args = $a( arguments), object = args.shift();
		return function() { return f.apply( object, args.concat( $a( arguments))); };
	}
}, true);