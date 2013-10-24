'use strict';


// Declare app level module which depends on filters, and services
angular.module('orderApp', [
  'ngRoute',
  'orderApp.filters',
  'orderApp.services',
  'orderApp.directives',
  'orderApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
	
  $routeProvider.when('/menuorder', {templateUrl: 'partials/menuorder.html', controller: 'OrderController'});
  $routeProvider.when('/scan', {templateUrl: 'partials/scan.html', controller: 'ScanController'});
  $routeProvider.when('/initialize', {templateUrl: 'partials/initialize.html', controller: 'InitializeController'});
  $routeProvider.otherwise({redirectTo: '/scan'});
}]);
