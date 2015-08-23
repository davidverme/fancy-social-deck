/**
 * Created by wdverme on 04/08/2015.
 */
fancySocialDeckApp
    .config(function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('login', {
                url: '/login',
                templateUrl: 'templates/login.html',
                controller: 'LoginCtrl'
            })
            .state('options', {
                url: '/options',
                templateUrl: 'templates/options.html',
                controller: 'OptionsCtrl'
            })
            .state('deck', {
                url: '/deck',
                templateUrl: 'templates/deck.html',
                controller: 'DeckCtrl'
            });
        $urlRouterProvider.otherwise('/deck');
});