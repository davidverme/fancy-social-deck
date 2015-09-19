/**
 * Created by wdverme on 23/06/2015.
 */

var fancySocialDeckApp = angular.module('fancySocialDeck', ['ui.router', 'openfb'])
    .run(function ($rootScope, $state, $window, OpenFB) {

        OpenFB.init('1581349792132388', 'http://localhost:63342/fancy-social-desk/oauthcallback.html');
        //OpenFB.init('1581349792132388', 'http://natyydavid.com/fancysocialdeck/oauthcallback.html');
        //OpenFB.init('866144803475098', 'http://natyydavid.com/fancysocialdeck/oauthcallback.html');

        $rootScope.$on('$stateChangeStart', function(event, toState) {
            if (toState.name !== "login" && !$window.sessionStorage['fbtoken']) {
                $state.go('login');
                event.preventDefault();
            }
        });

        $rootScope.$on('OAuthException', function() {
            $state.go('login');
        });

    });