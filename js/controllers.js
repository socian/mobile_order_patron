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

mod.factory('appModel', function() {
	return new AppModel();
});

mod.factory('orderModel', function() {
	return new OrderModel();
});

mod.factory('ws', function() {
	return new AutobahnWebSocket();
}); 

mod.controller('NavigationController', function($scope, $location) {
	$scope.onClickScan = function() {
		if(! confirm('Do you want to leave this page?')) return
		$location.path('/scan');	
	}
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
	$scope.status = "";
	this.loadAppData = function() {
		$scope.status = "Loading application data";
		//$http.get( "http://192.168.2.4/mobile_order_club/platforms/android/assets/www/cupsbandung.json" ).success(function(data) {
		$http.get( appModel.data.path ).success(function(data) {
			appModel.data.location = data.location;
			appModel.data.menu = data.menu;
			appModel.data.config = data.config;
			
			/*
			if(confirm('Please confirm this location: ' + appModel.data.location.name)) {
				_this.checkInternetConnection();	
			}
			
			else $location.path('/scan');
			*/
			_this.checkInternetConnection();
		});
		
	}
	
	// if the wifiCheck is set true check the internet connection
	this.checkInternetConnection = function() {
		$scope.status = "Checking internet connection";
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
		$scope.status = "Create the web socket connection";
		ws.onopen = function() {
			$scope.$apply(function() {
				$location.path('/menuorder');	
			})
		}
		
		ws.onerror= function(err) {
			alert(err);
			$scope.$apply(function() {
				$location.path('/scan');
			});
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
	$scope.locationAddress = appModel.data.location.address;
	
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
			if(data == null) {
				_this.storage.removeItem('order_id');
				return;
			}
			orderModel.data = data;
			$scope.$apply(function() {
				
				$scope.items = orderModel.data.items;
				$scope.orderTotal = orderModel.data.total;
				$scope.orderStatus = orderModel.data.status;	
				$scope.orderId = orderModel.data.orderid;
				
				// store the order id into a cookie
				_this.storage.setItem('order_id', orderModel.data.orderid);
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
		alert("WSERROR: " + err);
		$scope.$apply(function() {
			$location.path('/scan');
		});
	}
	
	// check if we have an open order
	// by looking for the existing order id
	this.storage = window.localStorage;
	var oid = this.storage.getItem('order_id');
	
	if(oid != null) {
		var msg = {command:'GET_ORDER',data:{orderid:oid}}
		ws.send(JSON.stringify(msg));
	}
	
});
