 (function () {
    'use strict';

    return angular.module('slider', []).directive('slider', ['$window', function ($window) {
        // Introduce custom elements for IE8
        $window.document.createElement('slider');

        var tmpl = ''
        +'<div class="slider-holder">'
        +'      <div class="slider-slide">'
        +'      <div class="slider-endcursor slider-begin" ng-style="{left: beginPosition+px}"></div>'
        +'      <div class="slider-endcursor slider-end" ng-style="{left: endPosition+px}"></div>'
        +'      <div class="slider-cursor" ng-style="{left: sliderPosition+px}"></div>'
        +'      <div class="slider-mouse-trap-begin" ng-style="{width: beginPosition+23+px}" ng-mousedown="startDrag($event, \'begin\')"></div>'
        +'      <div class="slider-mouse-trap-slide" ng-style="{left: beginPosition+23+px,width:(endPosition-beginPosition-23)+px}" ng-mousedown="startDrag($event, \'slide\')"></div>'
        +'      <div class="slider-mouse-trap-end"  ng-style="{width: width-endPosition+px, left:endPosition+px}" ng-mousedown="startDrag($event, \'end\')"></div>'
        +'      </div>'
        +'</div>';

        return {
            restrict: 'AE',
            template: tmpl,
            replace: true,
            require: '?ngModel',
            scope: {
            },

            link: function ($scope, $element, $attributes, ngModel) {
            $scope.width = $element[0].clientWidth;
            $scope.sliderPosition = $scope.width / 2;
            $scope.beginPosition = 0;
            $scope.endPosition = $scope.width - 23;
            var dragSubject, dragRect;

                if (ngModel) {
                    ngModel.$render = function () {
                        if (ngModel.$viewValue) {
                            $scope.positions = ngModel.$viewValue;
                            $scope.sliderPosition = $scope.positions.middle;
                            $scope.beginPosition = $scope.positions.start;
                            $scope.endPosition = $scope.positions.end - 23;
                            
                        } else {
                            $scope.positions={};
                            $scope.sliderPosition = $scope.width / 2;
                            $scope.beginPosition = 0;
                            $scope.endPosition = $scope.width - 23;
                        }

                    };
                }

                var dragSubject,
                    dragRect;

                function doDrag(x, y) {
                var slidePercent;
                var x;
                var x1;
                var x2;
                if (dragSubject === 'begin') {
                    x = Math.max(Math.min(x, dragRect.width, $scope.sliderPosition - 23), 0);
                    $scope.beginPosition = x;
                    $scope.positions.start = x;
                }
                if (dragSubject === 'end') {
                    x = Math.max(Math.min(dragRect.width + $scope.beginPosition - dragRect.position + x, dragRect.width + $scope.beginPosition), $scope.sliderPosition + 23);
                    $scope.endPosition = x;
                    $scope.positions.end = x + 23;
                  
                }
                if (dragSubject === 'slide') {
                    x2 = Math.max(Math.min(x, dragRect.width), 0);
                    x1 = Math.max(Math.min(x + $scope.beginPosition, dragRect.width + $scope.beginPosition), 23 + $scope.beginPosition);
                    $scope.sliderPosition = x1;
                    if (x2 < dragRect.width / 2) {
                        slidePercent = (dragRect.width - 2 * x2) / (dragRect.width);
                        $scope.positions.middle = Math.floor(x1 - 18 * slidePercent);
                    }
                    else if (x2 > dragRect.width / 2) {
                        slidePercent = (2 * x2 - dragRect.width) / (dragRect.width);
                        $scope.positions.middle = Math.floor(x1 + 40 * slidePercent);
                    }
                    else {
                        $scope.positions.middle = x1;
                    }
                }
                

            }

                function onMouseMove(evt) {
                    evt.preventDefault();

                    $scope.$apply(function () {
                        doDrag(evt.clientX - dragRect.x, evt.clientY - dragRect.y);
                    });
                }

                $scope.startDrag = function (evt, subject) {
                var rect = evt.target.getBoundingClientRect();
                dragSubject = subject;
                if (subject === 'begin') {
                    var rectSlide = evt.target.nextElementSibling.getBoundingClientRect();
                    dragRect = {
                        x: rect.left,
                        y: rect.top,
                        width: rect.right - rect.left + (rectSlide.right - rectSlide.left),
                        height: rect.bottom - rect.top
                    };
                }
                else if (subject === 'end') {
                    var rectSlide = evt.target.previousElementSibling.getBoundingClientRect();
                    dragRect = {
                        x: rect.left,
                        y: rect.top,
                        position: rect.right - rect.left,
                        width: rect.right - rect.left + (rectSlide.right - rectSlide.left),
                        height: rect.bottom - rect.top
                    };
                }
                else {
                    dragRect = {
                        x: rect.left,
                        y: rect.top,
                        width: rect.right - rect.left,
                        height: rect.bottom - rect.top
                    };
                }

                    doDrag(evt.offsetX || evt.layerX, evt.offsetY || evt.layerY);

                    angular.element($window)
                        .on('mousemove', onMouseMove)
                        .one('mouseup', function () {
                            if (ngModel) {
                            if($scope.positions.mouseUp){
                                $scope.positions.mouseUp=!$scope.positions.mouseUp;
                            }
                            else{
                                $scope.positions.mouseUp=true;
                            }
                            //ngModel.$setViewValue($scope.positions);
                            }
                            angular.element($window).off('mousemove', onMouseMove);
                        });
                };
            }
        };
    } ]);
 })();