/**
 * Created by wdverme on 04/08/2015.
 */
fancySocialDeckApp
    .controller('LoginCtrl', function ($scope, $state, $location, OpenFB) {
        sessionStorage.clear();
        $scope.facebookLogin = function () {

            OpenFB.login('email,manage_pages').then(
                function () {
                    //OpenFB.get('/oauth/access_token',{grant_type: 'fb_exchange_token',client_id:'1581349792132388',client_secret:'e7924995670b44fbb157556b86765963',fb_exchange_token:sessionStorage.getItem('fbtoken')})
                    OpenFB.get('/oauth/access_token',{grant_type: 'fb_exchange_token',client_id:'866144803475098',client_secret:'cf38f0e41a0e4c4f160426e1788a139f',fb_exchange_token:sessionStorage.getItem('fbtoken')})
                        .success(function(data) {
                            var regex = /access_token=(.*?)(&|$)/;
                            var newToken = regex.exec(data)[1];
                            if (newToken){
                                sessionStorage.setItem('fbtoken', newToken);
                            }

                            $location.path('/deck');
                        });
                },
                function () {
                    alert('OpenFB login failed');
                });
        };
    })

    .controller('OptionsCtrl', function($scope, $state, OpenFB){
        $scope.options = {
            selectedAccount: null
        };

        function loadAccount(accountId, accessToken) {
                OpenFB.get('/{account-id}'.replace('{account-id}', accountId), {access_token: accessToken})
                    .success(function(data){
                        var newAccount = {
                            id: accountId,
                            accessToken: accessToken,
                            picture: 'http://graph.facebook.com/{page_id}/picture'.replace('{page_id}', accountId),
                            name: data.name
                        };

                        if (!$scope.accounts){
                            $scope.accounts = [newAccount];
                        } else {
                            $scope.accounts.push(newAccount);
                        }
                    });
        }

        function loadAccounts() {
            $scope.accounts = undefined;

            OpenFB.get('/{user-id}/accounts'.replace('{user-id}', $scope.user.id))
                .success(function (data, status) {
                    for (var i = 0; i < data.data.length; i++) {
                        loadAccount(data.data[i].id, data.data[i].access_token);
                    }
                });
        }

        OpenFB.get('/me', {fields: 'id,email,name,picture'})
            .success(function(data, status){
                $scope.user = data;
                loadAccounts();
            });

        $scope.initialize = function () {
            sessionStorage.setItem('currentAccount', JSON.stringify($scope.options.selectedAccount));
            $state.go('deck');
        };

        $scope.logout = function () {
            OpenFB.logout();
            sessionStorage.clear();
            $state.go('login');
        };
    })

    .controller('DeckCtrl', function ($scope, $state, $window, $filter, $interval, OpenFB) {
        OpenFB.get('/me', {fields: 'id,email,name,picture'})
            .success(function(data, status){
                $scope.user = data;
            });

        if (sessionStorage.getItem('currentAccount') && sessionStorage.getItem('currentAccount')  != "undefined") {
            $scope.currentAccount = JSON.parse(sessionStorage.getItem('currentAccount'));
        }

        function formatDateNumber (number) {
            if (number.toString().length == 1){
                return "0" + number;
            }
            return number.toString();
        }

        $scope.feeds = [];

        function loadFacebookFeeds(callback) {
            OpenFB.get('/{account-id}/feed'.replace('{account-id}', $scope.currentAccount.id), {access_token: $scope.currentAccount.accessToken, fields: 'full_picture,message,from,created_time'})
                .success(function (data, status, headers) {
                    var feeds = $filter('orderBy')(data.data, "created_time", false);

                    for (var i = 0; i < feeds.length; i++) {
                        var found = $filter('filter')($scope.feeds, (function(item){
                            if(item.id == 'img_' + feeds[i].id) {
                                return true;
                            }
                            return false;
                        }), true);

                        if(found.length === 0){
                            var newItem = {
                                id: 'img_' + feeds[i]['id'],
                                name: feeds[i]['from']['name'],
                                message: feeds[i]['message'],
                                icon: 'facebook',
                                displayed: false
                            };

                            var fromPicture = 'http://graph.facebook.com/{from-id}/picture?type=large'.replace('{from-id}', feeds[i]['from']['id']);
                            var fullPicture = feeds[i]['full_picture'];

                            if (fullPicture) {
                                newItem.picture = fullPicture;
                                newItem.avatar = fromPicture;
                            } else {
                                newItem.picture = fromPicture;
                            }

                            var createdTime = new Date(feeds[i]['created_time']);
                            var dateToDisplay = "";
                            if (createdTime.toDateString() == new Date().toDateString()) {
                                dateToDisplay = formatDateNumber(createdTime.getHours()) + ':' + formatDateNumber(createdTime.getMinutes()) + ' hs.';
                            } else {
                                dateToDisplay = formatDateNumber(createdTime.getDay()) + '/' + formatDateNumber(createdTime.getMonth()) + '/' + createdTime.getYear();
                            }
                            newItem.date = dateToDisplay;

                            $scope.feeds.push(newItem);
                        }
                    }

                    callback();
                });
        }

        $scope.displayImages = [];

        function refreshFeed(callback) {
            loadFacebookFeeds(function(){
                $scope.lastRefresh = new Date().toLocaleString();
                callback();
            });
        }

        $scope.lastDispayedIndex = -1;
        $scope.lastImageUsed = -1;
        $scope.nextAction = 'expand';

        function expand(feed) {
            $scope.nextAction = 'shrink';

            var picture = new Image();
            if(feed.avatar) {
                picture.src = feed.avatar;
            } else {
                picture.src = feed.picture;
            }

            picture.onload = function(){
                $scope.currentAvatar = picture.src;
                $scope.currentMessage = feed.message;
                $scope.currentUser = feed.name;
                $scope.icon = feed.icon;
                $scope.$apply();
                $('body').scrollTo('#'+feed.id, 1000, function(){
                    zoomwall.expand($('#'+feed.id)[0]);
                    if($('#message').css('display') === 'none') {
                        $('#message').css('display', 'block').addClass('bounceInUp').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                            $('#message').removeClass('bounceInUp');
                        });
                    }
                });
            };
        }

        function shrink() {
            $scope.nextAction = 'expand';
            var currentFeed = $scope.feeds[$scope.feedToShrink];
            if(currentFeed){
                zoomwall.shrink($('#'+currentFeed.id)[0]);

                if($('#message').css('display') === 'block') {
                    $("#message").addClass('bounceOutDown').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                        $('#message').css('display', 'none').removeClass('bounceOutDown');
                        $scope.currentAvatar = "";
                        $scope.currentMessage = "";
                        $scope.currentUser = "";
                        $scope.icon = "";
                        $scope.$apply();
                    });
                }
            }
        }

        function getNonDisplayedFeed() {
            return  $filter('filter')($scope.feeds, {displayed: false}, true)[0];
        }

        function displayANewMessage(){
            if($scope.nextAction === 'expand') {
                var nextFeed = getNonDisplayedFeed();

                if(!nextFeed) {
                    $scope.lastDispayedIndex = $scope.lastDispayedIndex + 1;

                    if ($scope.lastDispayedIndex > $scope.feeds.length - 1) {
                        $scope.lastDispayedIndex = 0;
                    }

                    nextFeed = $scope.feeds[$scope.lastDispayedIndex];
                }
                nextFeed.displayed = true;
                $scope.feedToShrink = $scope.feeds.indexOf(nextFeed);

                var found = $filter('filter')($scope.displayImages, {id: nextFeed.id}, true)[0];

                if(!found) {
                    var picture = new Image();
                    picture.src = nextFeed.picture;

                    picture.onload = function () {
                        $scope.displayImages.push({
                            id: nextFeed.id,
                            url: picture.src
                        });
                        $scope.$apply();
                        setTimeout(function(){
                            $("#zoomwall img").removeAttr("style");
                            zoomwall.create(document.getElementById('zoomwall'), true);
                            expand(nextFeed);
                        }, 500);
                    }
                } else {
                    expand(nextFeed);
                }
            } else {
                shrink();
            }
        }

        if(!$scope.currentAccount || typeof($scope.currentAccount) == 'undefined' || $scope.currentAccount == null) {
            $state.go('options');
        } else {
            refreshFeed(displayANewMessage);

            var refreshInterval = $interval(function(){
                refreshFeed(displayANewMessage);
            }, 8000);

            $scope.$on('$destroy', function() {
                if (angular.isDefined(refreshInterval)) {
                    $interval.cancel(refreshInterval);
                    refreshInterval = undefined;
                }
            });
        }

        $scope.menu = function () {
            $(".menu-bar").toggleClass("menu-bar-hidden");
        };

        $scope.logout = function () {
            OpenFB.logout();
            sessionStorage.clear();
            $state.go('login');
        };

        $scope.options = function () {
            $state.go('options');
        };

        $scope.fullScreenMode = false;
        $scope.fullScreen = function () {

            if(!$scope.fullScreenMode){
                var doc = document.documentElement;
                if(doc.requestFullscreen) {
                    doc.requestFullscreen();
                } else if(doc.mozRequestFullScreen) {
                    doc.mozRequestFullScreen();
                } else if(doc.webkitRequestFullscreen) {
                    doc.webkitRequestFullscreen();
                } else if(doc.msRequestFullscreen) {
                    doc.msRequestFullscreen();
                }

                $scope.menu();
            } else {
                if(document.exitFullscreen) {
                    document.exitFullscreen();
                } else if(document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if(document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        };

        $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange',function(){
            $scope.fullScreenMode = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
        });
    });