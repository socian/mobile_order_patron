'use strict';

/* Controllers */
var mod = angular.module('orderApp.controllers', []);

function AppModel() {
	this.data = {
		path : "",
		menu : [],
		location : {}
	};
	
	this.cache = function() {
		
	}
}

function OrderModel() {
	
	var _this = this;
	
	this.data = {
		items : [],
		status : 0,
		total : 0,
		orderid: ''
	}
	
	this.clear = function() {
		_this.data.items = [];
		_this.data.status = 0;
		_this.data.total = 0;		
	}
	
	this.countTotal = function() {
		var total = 0;
		for(var i=0; i<_this.data.items.length; i++) {
			var item = _this.data.items[i];
			total += Number(item.price);
		}
		_this.data.total = total;
	}
}

var cookieWrapper = {
	put:function(c_name, value, exdays) {
		var exdate=new Date();
		exdate.setDate(exdate.getDate() + exdays);
		var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
		document.cookie=c_name + "=" + c_value;
	},
	get:function(c_name) {
		var c_value = document.cookie;
		var c_start = c_value.indexOf(" " + c_name + "=");

		if (c_start == -1) {
			c_start = c_value.indexOf(c_name + "=");
		}
		
		if (c_start == -1) {
			c_value = null;
		}
		else {
			c_start = c_value.indexOf("=", c_start) + 1;
			var c_end = c_value.indexOf(";", c_start);
			if (c_end == -1) {
				c_end = c_value.length;
			}
			
			c_value = unescape(c_value.substring(c_start,c_end));
		}
		return c_value;
	},
	remove:function(c_name) {
		
	}
}


mod.factory('appModel', function() {
	return new AppModel();
});

mod.factory('orderModel', function() {
	return new OrderModel();
});

mod.factory('ws', function() {
	return new AutobahnWebSocket();
}); 

mod.factory('cookie', function() {
	return cookieWrapper;
});


mod.controller('ScanController', function($scope, $location, appModel) {
	$scope.scanLocation = function() {
		
		// dev shortcut
		appModel.data.path = "cupsbandung.json";
		$location.path('/initialize');
		return;
		
		cordova.plugins.barcodeScanner.scan(function(result) {
			if(result.cancelled) return;
			var qrObj = JSON.parse(result.text);
			appModel.data.path = qrObj.path; 
			$scope.$apply(function() {
				$location.path('/initialize');
			});

		}, function(error) {
			alert("Scanning failed: " + error);
		});
	}
});

mod.controller('InitializeController', function($scope, $http, $location, appModel, ws) {
	
	var _this = this;
	
	this.loadAppData = function() {
		//$http.get( "http://192.168.2.4/moframe/platforms/android/assets/www/cupsbandung.json" ).success(function(data) {
		$http.get( appModel.data.path ).success(function(data) {
			alert('data loaded');
			appModel.data.location = data.location;
			appModel.data.menu = data.menu;
			appModel.data.config = data.config;
			
			if(confirm('Please confirm this location: ' + appModel.data.location.name)) {
				_this.checkInternetConnection();	
			}
			else $location.path('/scan');
		});
		
	}
	
	// if the wifiCheck is set true check the internet connection
	this.checkInternetConnection = function() {
		alert('check internet connection');
		if(appModel.data.config['wificheck'] == "true") {
			// check the internet connection	
			
			var networkState = navigator.network.connection.type;
			if(networkState != Connection.WIFI) {
				alert('You need to connect to the location WIFI');
				
				// dev only
				_this.createWSConnection();
			}
			else _this.createWSConnection();
		}
		else _this.createWSConnection();
	}
	
	this.createWSConnection = function() {
		alert("create ws connection");
		ws.onopen = function() {
			alert('connection is open :-)');
			$scope.$apply(function() {
				$location.path('/menuorder');	
			})
		}
		
		ws.onerror= function(err) {
			alert(err);
		}
		
		var host = appModel.data.config['wshost'];
		ws.connect(host);
	}
	
	// start the controller
	this.loadAppData();
});

mod.controller('OrderController', function($scope, $http, $location, appModel, orderModel, ws) {
	
	var _this = this;
		
	orderModel.clear();
	$scope.orderTotal = orderModel.data.total;
	$scope.orderStatus = orderModel.data.status;
	
	$scope.menu = appModel.data.menu;
	$scope.locationName = appModel.data.location.name;

	$scope.onAddItem = function(index) {
		var item = appModel.data.menu[index];
		orderModel.data.items.push(item);
		orderModel.countTotal();
		
		$scope.items = orderModel.data.items;
		$scope.orderTotal = orderModel.data.total;
	}
	
	$scope.onRemoveItem = function(index) {
		orderModel.data.items.splice(index,1);
		$scope.items = orderModel.data.items;
		
		orderModel.countTotal();
		$scope.orderTotal = orderModel.data.total;
	}
	
	$scope.onClearOrder = function() {
		if(! confirm('Do you want to clear your order?')) return;
		orderModel.clear();
		orderModel.countTotal();
		$scope.items = orderModel.data.items;
		$scope.orderTotal = orderModel.data.total;
	}
	
	$scope.onSubmitOrder = function() {
		var msg = "";
		for(var i=0; i<orderModel.data.items.length; i++) {
			var item = orderModel.data.items[i];
			msg += item.name + " " + item.price + " EUR\n";
		}
		msg += "\nTotal: " + orderModel.data.total + " EUR";
		
		if(! confirm( msg )) return;
		
		var msg = {command:'NEW_ORDER', data:orderModel.data }
		ws.send( JSON.stringify(msg) );
	}
	
	$scope.onRescanLocation = function() {
		$location.path('/scan');
	}
	
	//--------------------//
	// web socket
	//--------------------//
	
	this.handler = {
		'ORDER_UPDATE' : function(data) {
			orderModel.data = data;
			$scope.$apply(function() {
				$scope.items = orderModel.data.items;
				$scope.orderTotal = orderModel.data.total;
				$scope.orderStatus = orderModel.data.status;	
				$scope.orderId = orderModel.data.orderid;
			});
			
		}
	}
	
	ws.onmessage = function(message) {
		var msg = angular.fromJson(message);
		var handler = _this.handler[msg.command];
		if(handler != null) {
			handler.apply(handler, [msg.data]);
		}
	}
	
	ws.onerror = function(err) {
		alert(err);
	}
	
	//var host = appModel.data.config['wshost'];
	//ws.connect(host);
});
