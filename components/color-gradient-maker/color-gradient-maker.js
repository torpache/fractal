(function () {
    'use strict';

    angular
        .module('color-gradient-maker', [])
        .directive('colorGradientMaker', [colorGradientMaker]);

    function colorGradientMaker() {
        var tmpl = ''
        +'<div>'
        +'<div class="color-grad">'
        +'<canvas class="color-grad-histogram" width="567" height="40"></canvas>'
        +'<slider ng-model="positions"></slider>'
        +'<canvas class="color-grad-mini-canvas" width="567" height="30"></canvas>'
        +'<div class="color-grad-color-box-holder">'
        +'<color-box ng-model="colorStart" position="5px"></color-box>'
        +'<color-box ng-model="colorMiddle" position="50%"></color-box>'
        +'<color-box ng-model="colorEnd" position="90%" ></color-box>'
        +'</div>'
        +'</div>'
        +'<div class="color-grad-color-button" ng-click="recolor()" ng-if="fractal.fractalImg.length!==0">'
        +   '<div class="color-grad-arrow-right">'
        +   '</div>'
        +'</div>'
        +'</div>'
        
        var colorNormalForm = function (color) {
        var colorForm = {
            r: color[0],
            g: color[1],
            b: color[2],
            alpha: color[3],
            color: "rgba(" + color[0] + ',' + color[1] + "," + color[2] + "," + color[3] + ")"
        }
        return colorForm;
        }
        var calculateSlopes=function(color1,color2,color3){
           var slope1 = [color2.r - color1.r, color2.g - color1.g, color2.b - color1.b, color2.alpha - color1.alpha];
           var slope2 = [color3.r - color2.r, color3.g - color2.g, color3.b - color2.b, color3.alpha - color2.alpha];
        return{slope1:slope1, slope2:slope2}
        }
        var colorPixel = function (pixelNumber,slopes, width, position,color1,color2,color3){
        var slope1=slopes.slope1;
        var slope2=slopes.slope2;
        var gradpoint = position.middle /width;
        var startPoint = position.start /width;
        var endPoint = position.end /width;
        var red;
        var green;
        var blue;
        var alpha;
        var color;
        if (pixelNumber <= startPoint) {
            red = color1.r;
            green = color1.g;
            blue = color1.b;
            alpha = color1.alpha;
           
        }
        else if (pixelNumber < gradpoint) {
            red = color1.r + slope1[0] * (pixelNumber - startPoint) / (gradpoint - startPoint);
            green = color1.g + slope1[1] * (pixelNumber - startPoint) / (gradpoint - startPoint);
            blue = color1.b + slope1[2] * (pixelNumber - startPoint) / (gradpoint - startPoint);
            alpha = color1.alpha + slope1[3] * (pixelNumber - startPoint) / (gradpoint - startPoint);
        
        }
        else if (pixelNumber < endPoint) {
            red = color2.r + slope2[0] * (pixelNumber - gradpoint) / (endPoint - gradpoint);
            green = color2.g + slope2[1] * (pixelNumber - gradpoint) / (endPoint - gradpoint);
            blue = color2.b + slope2[2] * (pixelNumber - gradpoint) / (endPoint - gradpoint);
            alpha = color2.alpha + slope2[3] * (pixelNumber - gradpoint) / (endPoint - gradpoint);
         
        }
        else {
            red = color3.r;
            green = color3.g;
            blue = color3.b;
            alpha = color3.alpha;
         

        }
         color = 'rgba(' + math.floor(red) + ',' + math.floor(green) + ',' + math.floor(blue) + ',' + alpha + ')';
        return color;


    }
        
        return {
            restrict: 'AE',
            template: tmpl,
            replace: true,
            scope: {
                coloring:'=',
                fractal:'='
            },

            link: function ($scope, $element, $attributes) {
                var histogramContext=$element[0].childNodes[0].childNodes[0].getContext('2d');
                var histoWidth=$element[0].childNodes[0].childNodes[0].clientWidth;
                var histoHeight=$element[0].childNodes[0].childNodes[0].clientHeight;
                var gradientWidth=$element[0].childNodes[0].childNodes[2].clientWidth;
                var gradientHeight=$element[0].childNodes[0].childNodes[2].clientHeight;
                var gradientContext=$element[0].childNodes[0].childNodes[2].getContext('2d');
                $scope.colorStart={};
                $scope.colorMiddle={};
                $scope.colorEnd={};
                $scope.positions={};
                if($attributes.positions){
                    $scope.positions=JSON.parse($attributes.positions);
                }
                if($attributes.colorstart){
                    $scope.colorStart=colorNormalForm(JSON.parse($attributes.colorstart));
                    $scope.colorMiddle=colorNormalForm(JSON.parse($attributes.colormiddle));
                    $scope.colorEnd=colorNormalForm(JSON.parse($attributes.colorend));
                }
                $scope.$watchCollection('positions',function(newVal,oldVal){
                   updateGradient()
                });
                $scope.$watchCollection('colorStart',function(newVal,oldVal){
                   updateGradient()
                });
                $scope.$watchCollection('colorMiddle',function(newVal,oldVal){
                   updateGradient()
                });
                $scope.$watchCollection('colorEnd',function(newVal,oldVal){
                   updateGradient()
                });
                var updateGradient=function(){
                    gradientContext.fillStyle="white";
                    gradientContext.fillRect(0, 0, gradientWidth, gradientHeight);
                    var colorList=[];
                    for(var i=0;i<gradientWidth;i++){
                    var slopes=calculateSlopes($scope.colorStart,$scope.colorMiddle,$scope.colorEnd);
                    var color=colorPixel(i/gradientWidth,slopes,gradientWidth,$scope.positions,$scope.colorStart,$scope.colorMiddle,$scope.colorEnd);
                    gradientContext.fillStyle=color;
                    gradientContext.fillRect(i, 0, 1, gradientHeight);
                    colorList.push(color);
                    }
                    $scope.coloring.setColorList(colorList); 
                };
                $scope.coloring.drawHistogram=function(){
                    updateHistogram();
                };
                $scope.recolor=function(){
                    $scope.fractal.values.active='drawing';
                    setTimeout(function(){$scope.fractal.drawFractal();$scope.fractal.values.active='none';$scope.$apply();}, 10);
                };
                var updateHistogram=function() {
                var max = Math.max.apply(null, $scope.coloring.histogram);
                var normalized = $scope.coloring.histogram.map(function (num) {
                    return num / max;
                });
                var bins = normalized.length;
                histogramContext.clearRect(0, 0, histoWidth, histoHeight);
                histogramContext.fillStyle = 'white';
                for (var i = 0; i < bins; i++) {
                    histogramContext.fillRect(math.floor(i * histoWidth / bins), histoHeight - normalized[i] * histoHeight, math.floor(histoWidth / bins), normalized[i] * histoHeight);
                }

                };

                

              
            }
        };
    }
})();


