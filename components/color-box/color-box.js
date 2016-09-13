(function () {
    'use strict';

    angular
        .module('color-box', [])
        .directive('colorBox', [colorBox]);

    function colorBox() {
        var tmpl = ''
        +'<div  class="color-box" >'
        +'        <div ng-click="toggle()" class="color-box-inset color-box-color" ng-style="{\'background-color\':colorPicker.color, left:position}"></div>'
        +'        <color-picker class="color-box-color-picker" ng-show="colorPickerShow" click-outside="colorPickerClose()"  ng-model="colorPicker" ></color-picker>'
        +'</div>'   
        return {
            restrict: 'AE',
            template: tmpl,
            replace: true,
            require: '?ngModel',
            scope: {
            },

            link: function ($scope, $element, $attributes, ngModel) {
                $scope.position=$attributes.position;
                $scope.colorPickerShow=false;
                $scope.colorPicker={};
                $scope.colorPickerClose=function(){
                     $scope.colorPickerShow=false;
                };
                $scope.toggle=function(){
                    $scope.colorPickerShow=!$scope.colorPickerShow;
                }
                
                $scope.$watchCollection('colorPicker',function(newVal,oldVal){
                   ngModel.$setViewValue($scope.colorPicker);
                });
                
                if (ngModel) {
                    ngModel.$render = function () {
                        if (ngModel.$viewValue) {
                            $scope.colorPicker = ngModel.$viewValue;
                            }
                         else {
                            $scope.colorPicker={
                                r:25,
                                g:255,
                                b:60,
                                alpha:255,
                                color: "rgba(" + 25 + ',' + 255 + "," + 60 + "," + 255 + ")"
                                
                            }
                        }
                    };
                }

              
            }
        };
    }
})();

