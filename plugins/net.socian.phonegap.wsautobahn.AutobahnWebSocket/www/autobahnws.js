cordova.define("net.socian.phonegap.wsautobahn.AutobahnWebSocket.autobahnws", function(require, exports, module) {
function AutobahnWebSocket() {
	
	var _this = this;
	
	this.onopen = function() {};
	this.onmessage = function() {};
	this.onerror = function() {};
	
	this.connect = function(host) {
		cordova.exec(_this.onopenHandler, null , 'AutobahnWebSocket', 'onopen', []);
		cordova.exec(_this.onmessageHandler, null , 'AutobahnWebSocket', 'onmessage', []);
		cordova.exec(null, _this.onerrorHandler, 'AutobahnWebSocket', 'onerror', []);
		
		var param = {'wshost' : host};
		cordova.exec(_this.onopenHandler, _this.errorHandler, 'AutobahnWebSocket', 'connect', [param]);
	}
	
	this.onopenHandler = function() {
		_this.onopen.apply(_this.onopen, []);
	}
	
	this.onmessageHandler = function(msg) {
		_this.onmessage.apply(_this.onmessage, [msg]);
	}
	
	this.onerrorHandler = function(err) {
		_this.onerror.apply(_this.onerror, [err]);
	}
	
	this.send = function(message) {
		var param = {'wsmessage':message};
		cordova.exec(null, _this.onerror, 'AutobahnWebSocket', 'send', [param]);
	}
}
module.exports = AutobahnWebSocket;

});
