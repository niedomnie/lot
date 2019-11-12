// 
//    License GPL.
//    Copyrights 2017-2019 Artur Koźmiński niedomnie@gmail.com
//
//    Axis: 
//        x - from bottom to top
//        y - from left to right
//
//    TODO: 
//        1. labels should be printed over other objects (in document later, so needs to be collected separatelly)
//        2. show = false should not calculate (no only does not print)
//        3. point should be shown even if there are no figures
//        4. style: "none", type: "line"|"path" - does not draw
//        5. factorType == 'ABC' does not work in some cases
//

var H, W, EXTREMUM, MARGIN = 20;
var debug = false;

function error(msg) {
  alert(msg);
  throw new Error(msg);
}

        var geometry = {
//            factorType: Math.random() > 0.5 ? 'ab': 'ABC',
            factorType: 'ab',
//            factorType: 'ABC',

            isRealNaN: function(a) {
                return isNaN(a) && a !== undefined;
            },

            distance: function(p1, p2) {
                return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            },

            distancePointFromLine: function(p, factors) {
                if(this.factorType === 'ab') {
                    return Math.abs(factors.a * p.x + -1 * p.y + factors.b) / Math.sqrt(factors.a * factors.a + 1);
                } else {
                    return Math.abs(factors.A * p.x + factors.B * p.y + factors.C) / Math.sqrt(factors.A * factors.A + factors.B * factors.B);
                }
            },

            distanceParallelFunctions: function(factors1, factors2) {            
                if(factors1.a !== undefined) {
                    if(factors1.a !== factors2.a) return NaN;
                    else if(isNaN(factors1.a))      return Math.abs(factors1.x - factors2.x);
                    return Math.abs(factors1.b-factors2.b)/Math.sqrt(1+factors1.a*factors2.a); // although factors1.a == factors2.a
                } else {
                    if(factors1.A * factors2.B !== factors2.A * factors1.B) return NaN;
                    else if(factors2.B === 0) return NaN; // TODO
                    var C2 = factors1.C * factors2.B / factors2.B;
                      return Math.abs(factors1.C-C2)/Math.sqrt(factors1.B*factors1.B*+factors1.A*factors1.A);
                }
            },

	    pointFromPoint: function(factors, p, distance) {
                var pTmp = this.yByXandFactors(p.x * 1.1, factors);
                var dTmp = this.distance(pTmp, p);
  	        return {x: p.x - distance * (pTmp.x - p.x) / dTmp, y: p.y - distance * (pTmp.y - p.y) / dTmp};		    
//              d*d = (x2-p.x)*(x2-p.x) + (x2*a+b-p.y) * (x2*a+b-p.y);
//	        d*d = x2*x2 - 2*x2*p.x + p.x*p.x + (x2*a+b)*(x2*a+b) - 2*p.y*x2*a - 2*p.y*b + p.y*p.y;
//	        d*d = x2*x2 - 2*x2*p.x + p.x*p.x + x2*x2*a*a + 2*x2*a*b + b*b - 2*p.y*x2*a - 2*p.y*b + p.y*p.y;
//	        x2*x2(1+a*a) + (-2*p.x + 2*a*b + 2.p.y*a)*x2 + p.x*.p.x + b*b - 2*.p.y*b + p.y *.py - d * d = 0;
	    },

            pointBetween: function(p1, p2, distanceFromP1, oppositeRatio) {
                var d = this.distance(p1, p2);
                var ratio = distanceFromP1 / d;
                if(oppositeRatio) ratio = 1/ratio;
                return {x: (p2.x-p1.x) * ratio + p1.x , y: (p2.y-p1.y) * ratio + p1.y};
            },

            pointAhead: function(p, factors, distanceFromP) {
                var pTmp = this.yByXandFactors(p.x * 10, factors);
                log('pointAhead', 'pTmp', pTmp, 'p', p, 'h', 'factors', factors);

                var pX;
		if(factors.a === 0) { // y does not change == b
		//debugger;
                    pX = this.pointOnHorizontalLineInDistance(p, distanceFromP);
		} else if(isNaN(factors.a)) { // not able to calculate y => x == b
	//	debugger;
                    pX = this.pointOnVerticalLineInDistance(p, -distanceFromP);
                } else {
                    pX = this.pointBetween(p, pTmp, distanceFromP);
                }
                return pX;
            },            
    
            pointAlongside: function(p1, p2, distanceFromP2) {
                var pTmp = this.pointBetween(p1, p2, distanceFromP2);
                return {x: p2.x + (pTmp.x - p1.x), y: p2.y + (pTmp.y - p1.y)};
            },

            pointOnHorizontalLineInDistance: function(p, distance) {
                return {x: p.x + distance, y: p.y};
            },

            pointOnVerticalLineInDistance: function(p, distance) {
                return {x: p.x, y: p.y + distance};
            },
            
            lineThroughPoints: function(p1, p2) {
                if(this.factorType === 'ABC') {
                    var A = -(p2.y - p1.y);
                    var B = p2.x - p1.x;
                    var C = p1.x * p2.y - p1.y * p2.x;
                    return {A, B, C};
                } else if(p2.x === p1.x) {
                    return {a: NaN, b: p2.x}; // special value that not possible to calculate factors
                } else {
                    var a = (p2.y - p1.y)/(p2.x - p1.x);
//                    var b = p1.y - a * p1.x; // less operations but not so precise and dependend
                    var b = (p1.y * p2.x - p1.x * p2.y) / (p2.x - p1.x);
//                    log('lineThroughPoints', 'a', a, 'b', b);
                    return {a, b};
                }
            },
            
            linePerpendicularThroughPoint: function(factors, p) {
                if(this.factorType === 'ab') {
                    if(isNaN(factors.a)) {
                        return {a: 0, b: factors.b};
                    } else if(factors.a === 0) {
                        return {a: NaN, b: factors.b};
                    } else {
                        var a = -1/factors.a;
                        var b = p.y - p.x * a;            
                        return {a, b};
                    }
                } else {
                    return {A: factors.B, B: -factors.A, C: factors.A * p.y - factors.B * p.x};
                }
            },

	    lineParallelThroughPoint: function(factors, p) {
	        if(this.factorType == 'ab') {
		    return {a: factors.a, b: p.y - factors.a * p.x};
		} else {
		    return {A: factors.A, B: factors.B, C: -A*p.x - B*p.y};
		}
	    },

            lineThroughLine: function(factors1, factors2) {
                var x,y;
                if(factors1.a !== undefined) {
                    x = (factors2.b - factors1.b) / (factors1.a - factors2.a);
//                    y = factors1.a * x + factors1.b; // less operations but not so precise and dependend
                    y = (factors1.b * factors2.a - factors2.b * factors1.a) / (factors2.a - factors1.a);
//                    log('lineThrougLine', 'x', x, 'y', y, 'factors1', factors1, 'factors2', factors2);
                } else {
                    var w = factors1.A * factors2.B - factors2.A * factors1.B;
                    x = (factors2.C * factors1.B - factors1.C * factors2.B ) / w; 
                    y = (factors2.A * factors1.C - factors1.A * factors2.C ) / w;
                }
                return {x, y};
            },

            pointWhenLineThroughPerpendicularLine: function(factors, p) {
                var pX;
                if(this.factorType === 'ab' && isNaN(factors.a)) {
                    pX = {x: factors.b, y: p.y};
                } else {
                    var perpendicularFactors = this.linePerpendicularThroughPoint(factors, p);
                    if(perpendicularFactors.a !== undefined && isNaN(perpendicularFactors.a)) {
                        pX = {x: factors.b, y: p.y}
                    } else {
                        pX = this.lineThroughLine(factors, perpendicularFactors);                
                    }
                }
                return pX;
            },

        /* wcięcie liniowe w przód - linearSelection? intersection? */
            linearSelection: function(pL /*A*/, pP /*B*/, distanceL /*b*/, distanceP /*a*/) { // exchanged points & distances from wiki (empirically verified)
                var distanceLP = this.distance(pL, pP); 
                if(distanceL < 0 || distanceP < 0) error('linear indentation: distances are negative: ' + distanceL + ' ' + distanceP);
                if(distanceL + distanceP < distanceLP) error('linear indentation: distances are too small: ' + distanceL + ' ' + distanceP);
                if(Math.abs(distanceL - distanceP) > distanceLP
		  && distanceL + distanceP < distanceLP) error('linear indentation: distances are too different:' + distanceL + ' ' + distanceP);

                var Ca = -distanceL * distanceL + distanceP * distanceP + distanceLP * distanceLP; // cartonian
                var Cb =  distanceL * distanceL - distanceP * distanceP + distanceLP * distanceLP;
                var Cc =  distanceL * distanceL + distanceP * distanceP - distanceLP * distanceLP;
                var _4P = Math.sqrt(Ca * Cb + Ca * Cc + Cb * Cc);
                // log(Ca, Cb, Cc, distanceL, distanceP, distanceLP)
                var pX = {
                            x: ( pP.x * Cb  + pP.y * _4P + pL.x * Ca  - pL.y * _4P) / (Ca + Cb),
                            y: (-pP.x * _4P + pP.y * Cb  + pL.x * _4P + pL.y * Ca)  / (Ca + Cb)
                         };
                return pX;
            },
    
            /*  wciecie kątowo-liniowe - kombinowane (w przód) 
                sin(kat przeciwny a)/sin(kat przeciwny c) = a/c, sin(kat przeciwny a) - tw. sinusow
                sin(kat przeciwny a)/sin(kat przeciwny b + kat przeciwny c)=a/c    <= sin(180-alfa)=sin(alfa)
                sin (α + β) = sin α · cos β + sin β ·cos α
                symbol hausbrandta - tez mozna 
                @param anglePLX [degrees]
            */
            combinedSelection: function(pL, pP, distanceL, anglePLX) {        
                log('combinedSelection', 'pL', pL, 'pP', pP, 'distanceL', distanceL, 'anglePLX', anglePLX);
                var distanceLP = this.distance(pL, pP); 
//              var angleLXP = Math.asin(distanceLP * Math.sin(this.degrees_to_radians(anglePLX))/distanceL);
//              log('combinedSelection', 'angleLXP[rad]', angleLXP, 'angleLXP[deg]', this.radians_to_degrees(angleLXP) );
                var azimuthLP = this.azimuth(pL, pP);
                var azimuthLX = azimuthLP + this.degrees_to_radians(anglePLX);
                var pX = { x: pL.x + distanceL * Math.cos(azimuthLX),
                           y: pL.y + distanceL * Math.sin(azimuthLX)
                         };
                log('combinedSelection', 'distanceLP', distanceLP, 'azimuthLP', azimuthLP, 'azimuthLX', azimuthLX, 'azimuthLX[deg]', this.radians_to_degrees(azimuthLX), 'pX', pX);
                return pX;
            },

            azimuth: function (pL, pP) {
                var azimuthL = Math.atan( (pP.y - pL.y) / (pP.x - pL.x) );
                if(pP.x < pL.x) azimuthL += Math.PI;
                else if(pP.y < pL.y) azimuthL += 2 * Math.PI;
                log('azimuth',  pL, pP, (pP.y - pL.y) , (pP.x - pL.x), (pP.y - pL.y) / (pP.x - pL.x), azimuthL);
                return azimuthL;
            },

            area: function(points) {
                var index = (i) => (i+points.length) % points.length;
                return Math.abs(points.reduce((acu,elem,idx,arr) => acu + elem.x * (arr[index(idx+1)].y - arr[index(idx-1)].y), 0) / 2);
            },
            
            perimeterAndDistances: function(points, open) {
                var index = (i) => (i+points.length) % points.length;
                return points.reduce((acu,elem,idx,arr) => {
                    if(open && idx === points.length - 1) return acu;
                    let distance = this.distance(elem, arr[index(idx-1)]);
                    acu.distances.push(distance);
                    acu.perimeter += distance;
                    return acu;
                }, { perimeter: 0, distances: [] });
            },

            perimeter: function(points) {
                return this.perimeterAndDistances(points).perimeter;    
            },

            length: function(points) {
                return this.perimeterAndDistances.perimeter(points, true).perimeter;    
            },

            distances: function(p, points) {                
                return points.map((elem,idx,arr) => this.distance(elem, p));
            },
            
            yByXandFactors: function(x, factors) {
//                log('yByXandFactors', x);
                if(this.factorType === 'ab') {
                    if(isNaN(factors.a)) return {x, y: NaN};
		    else                 return {x, y: factors.a * x + factors.b};
                } else if(factors.B === 0) {
                    return {x, y: NaN }; // special value for vertical line
                } else {
                    return {x, y: -(factors.A * x + factors.C) / factors.B };
                }
            },
            
            xByYandFactors: function(y, factors) {
                if(this.factorType === 'ab') {
                    if(factors.a === 0)      return {x: NaN, y: y};
                    else                     return {x: (y - factors.b) / factors.a, y: y};
                } else {
                    if(factors.A === 0)      return {x: NaN, y: y};
                    else                     return {x: (factor.B * y + factor.C) / factor.A, y};
                }
            },

            isProgressive: function(prevPosition, position, factors) {
                if(this.factorType === 'ab') {
                    if(isNaN(factors.a)) return factors.b >= 0;
                    else                  return (factors.a >= 0 ? 1 : -1) * (prevPosition.x < position.x? 1 : -1) > 0;
                } else {
                    if(isNaN(factors.A)) return -factors.C / factors.B >= 0;
                    else                  return (-factors.A / factors.B >= 0 ? 1 : -1) * (prevPosition.x < position.x? 1 : -1) > 0;
                }
            },

            rectangularOffset: function (p1, p2, distanceFromP1, perpendicularDistance) {
                var pB = this.pointBetween(p1, p2, distanceFromP1, false);
                if(perpendicularDistance === 0) return pB;
                var f = this.lineThroughPoints(p1, p2);
                var fp = this.linePerpendicularThroughPoint(f, pB);
                //log('f', f, 'fp', fp)
                var pX = pointAhead(pB, fp, perpendicularDistance);
                return pX;
            },

            ab: function(A, B, C) {
                return {a: -A/B, b: -C/B};
            },

            ABC: function(a, b) {
                return {A: a, B: -1, C: b};
            },

            radians_to_degrees: function(radians) {
                return radians * (180/Math.PI);
            },

            degrees_to_radians: function(degrees) {
                return degrees * Math.PI / 180;
            },

            rectangle: function(p1, p2, perpendicularDistance) {
                var f = this.lineThroughPoints(p1, p2);

                var fp = this.linePerpendicularThroughPoint(f, p2);
                var p3 = this.pointAhead(p2, fp, -perpendicularDistance);
                
                fp = this.linePerpendicularThroughPoint(f, p1);
                var p4 = this.pointAhead(p1, fp, -perpendicularDistance);

                var corners = [p1, p2, p3, p4];
                return corners;
            }           
        };

    function log(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18) {
        if(debug === true)
            console.log(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17, a18);
    }

        function countSizes(svgElem) {
            W = svgElem.getAttribute('width');            
            H = svgElem.getAttribute('height');
            log('WEIGHT', W, 'HEIGHT', H);
//            log('WIDTH', W, 'HEIGHT', H);
            svgElem.setAttribute('height', ((H * XSIZE / SIZE) | 0));
            svgElem.setAttribute('width', ((W * YSIZE / SIZE) | 0));
            H -= 3 * MARGIN;
            W -= 3 * MARGIN;
            log('WIDTH', W, 'HEIGHT', H);
        }

        function calculateExtremum(figures) {
            var start = {maxX: 0, minX: -1, maxY: 0, minY: -1};
            EXTREMUM = figures.reduce((acuM, e) => e.points.reduce((acu, v) => ({
                    minX: acu.minX < 0 ? v.x : Math.min(acu.minX, v.x), 
                    maxX: Math.max(acu.maxX, v.x), 
                    minY: acu.minY < 0 ? v.y : Math.min(acu.minY, v.y), 
                    maxY: Math.max(acu.maxY, v.y), 
                }), acuM), start);
            XSIZE = EXTREMUM.maxX-EXTREMUM.minX;
            YSIZE = EXTREMUM.maxY-EXTREMUM.minY;
            SIZE = Math.max(XSIZE, YSIZE);
            log('SIZE', SIZE, 'XSIZE', XSIZE, 'YSIZE', YSIZE, 'EXTREMUM', EXTREMUM, 'y incrementing right, x incrementing top');            
        }

        function scaleX(x) {
            return H - ((x - EXTREMUM.minX) * H / SIZE) + MARGIN - (SIZE-XSIZE) * H / SIZE;
        }

        function scaleY(y) {
            return ((y - EXTREMUM.minY) * W / SIZE) + MARGIN - (SIZE-YSIZE) * W / SIZE;
        }

        function text(indent, txt,  x, y, shiftX, shiftY) {
            if(txt == "") return "";
            return indent + '<text x="'+x+'" y="'+y+'" text-anchor="begin">'
                 + indent + '\t<tspan dx='+shiftX+' dy='+shiftY+'>'+txt+'</tspan>'
                 + indent + '</text>'
        }

        function format(x) {
            return x.toFixed(2);
        }

        function formatPoint(p) {
//              if(p.mark) return Object.assign({}, p, {x: format(p.x), y: format(p.y), mark: getMarkRaw(p.mark)});
//              else          return Object.assign({}, p, {x: format(p.x), y: format(p.y)});
              return Object.assign({}, p, {x: format(p.x), y: format(p.y)});
        }

        function formatPointsTable(points) {
            return points.map(p => formatPoint(p));
        }

        function formatDBPoints(obj) {
//            return Object.keys(obj).map(k => Object.assign({}, obj[k], {mark: k})).map(p => formatPoint(p));
            return Object.keys(obj).map(k => formatPoint(obj[k]));
        }

        function formatFigures(figures) {
            figures.forEach(e => { 
                e.points = formatPointsTable(e.points); 
                if(e.area) e.area = format(e.area); 
                if(e.distances) e.distances = e.distances.map(e => format(e));
                if(e.distances0) e.distances0 = e.distances0.map(e => format(e));
                if(e.perimeter) e.perimeter = format(e.perimeter);
            });            
            return figures;
        }

        function measureFigures(figures, geometry) {
            figures.forEach(e => {
                if(e.type === "polygon" || e.type === "path") {
                    e.area = geometry.area(e.points);
                    e = Object.assign(e, geometry.perimeterAndDistances(e.points));
                } else {
                    e.distances0 = geometry.distances(e.points[0], e.points);
                }
            });
        }            

        function rand(arg) {        
            return ((isNaN(arg) ? arg.split("").reduce((a,e,i) => a+e.charCodeAt(i), 0) : arg*1000) % 2 == 0) ? -1 : 1;
        }

        function drawPoint(p, pointsDrawn) {
            var label = getLabel(p.mark);
//            log('point', p, 'label', label, 'length', p.mark ? p.mark.split(":").length: undefined);
            if(label) {
                if(pointsDrawn[label]) return ''; // drawn point - so for the same label the point will not be printed
                pointsDrawn[label] = true;
            }

            const SHIFT = 4;
            var xShift = rand(label ? label : p.x) * SHIFT, yShift = rand(label ? label : p.y) * SHIFT, sY = scaleY(p.y), sX = scaleX(p.x);
            if(label !== undefined) return text('\n\t', label, sY, sX, xShift, yShift);  
            else                    return text('\n\t', "x=" + p.x, sY, sX, xShift, yShift)
                                         + text('\n\t', "y=" + p.y, sY, sX, xShift, yShift + Math.abs(yShift));
        }

        function getLabel(mark) {
            if(mark) {
                var parts = mark.split(":");
                if(parts.length === 1)         return mark;
                else if(parts.length === 2) return parts[1];
            }
            return undefined;
        }

        function drawPolygon(name, polygon, clss, pointsDrawn) {
//            log('drawPolygon', name, 'polygon', polygon);
            var ret = '\n<g id="' + name + '">';
            var polygonPoints = polygon.reduce((acu, v) => acu + scaleY(v.y) + ',' + scaleX(v.x) + ' ', '');
            polygonPoints = polygonPoints.substring(0, polygonPoints.length-1);
            var lc = clss ? ' class="'+clss+'"' : '';
            ret += '\n\t<polygon' + lc + ' points="' + polygonPoints + '"/>'
            filtered = polygon.filter(x => x.mark !== "");
            ret += filtered.reduce((acu, v) => acu + drawPoint(v, pointsDrawn), '');
            ret += '\n</g>';
//            log('drawPolygon', name, 'ret', ret);
            return ret;
        }

        function drawLines(name, points, clss, pointsDrawn) {
            if(clss === 'none') return '';
            var p0 = points[0];
            var lc = clss ? ' class="'+clss+'"' : '';
            return points.slice(1).reduce((a, e) => {
                return a + '\n\t<line' + lc + ' name="'+name+'" x1="' + scaleY(p0.y) + '" y1="' + scaleX(p0.x) + '" x2="' + scaleY(e.y) + '"y2="' + scaleX(e.x) + '"/>'
                 + drawPoint(e, pointsDrawn);

            }, drawPoint(p0, pointsDrawn));
        }

        function drawPath(points, clss, pointsDrawn) {
            if(clss === 'none') return '';
            var retPoints = '';
            var lc = clss ? ' class="'+clss+'"' : '';
            var ret = "\n\t<path" + lc + " d=\"" +
                points.reduce((a, e, i) => {
                        retPoints += drawPoint(e, pointsDrawn);
                    return a + " " + (i === 0 ? "M" : "L") + scaleY(e.y) + " " + scaleX(e.x);
                }, '').slice(1) +
                "\"\n/>" + retPoints;
            log('path', ret);
            return ret;
        }

        /*
            @return e.g. [{name: "house", type: "polygon", points: [{x:,y:},...]}, {name:"building_area_ref", type: "line", style: "dash", points: [{x:,y:},...]}
        */
        function figures(acu, lot, g, dbPoints) {
//            log('figures', Object.keys(lot));
            var ret = Object.keys(lot).map(k => {
                acu.idx++;
                var e = lot[k];
                var figuresRet = [];
                if(e.show == false) return [];
                log(acu.idx, 'figures', 'name', k, 'def' ,e);

                var figure = {name: k, type: e.type};
                if(e.style) figure.style = e.style;

                if(e.points) { // load database
                    e.points.filter(e => e.mark).forEach(e => setPoint(e.mark, e, dbPoints));
                    figure.points = e.points;
                    if(!e.corners)
                        figuresRet.push(figure);                    
                } 
                
                if(e.operations) {                
                    runOperations(acu.idx, k, e.operations, g, dbPoints);
                }

                if(e.corners) {
                    if(e.points)     figure = Object.assign({}, figure);
                    figure.points = corners2points(k, e.corners, dbPoints);
                    figuresRet.push(figure);
                }

                if(e.children) 
                    figuresRet = figuresRet.concat(figures(acu, e.children, g, dbPoints)); // flat map

                log(acu.idx, 'figures', 'name', k, 'ret', figuresRet);
                return figuresRet;
            });
            return ret.reduce((a,v) => a.concat(v), []); // flat map and removing empties
//            return ret;
        }

        function corners2points(name, corners, dbPoints) {
            return corners.map(c => loadPoint(name, c, dbPoints));
        }

        function setPoint(name, p, dbPoints) {
            var copy = Object.assign({}, p, {mark: name}); // clone because dbPoints should be immutable
            log("setPoint", name, copy);

            var mark = getMarkRaw(name);
            dbPoints[mark] = copy;
        }

        function getMarkRaw(mark) {
             return mark.split(":")[0];
        }

        function loadPoint(element, name, dbPoints) {
            if(!dbPoints[name]) error('name ' + element + ' no mark(corner): ' + name);
            var t = Object.assign({}, dbPoints[name]); // clone because dbPoints should be immutable
            return t;
        }

        /*
            return svg
        */
        function drawSvg(elements) {
            var pointsDrawn = {};
            return elements.reduce((a,e) => {
                 switch(e.type) {
                    case "polygon": return a + drawPolygon(e.name, e.points, e.style, pointsDrawn);
                    case "line":    return a + drawLines(e.name, e.points, e.style, pointsDrawn);
                    case "path":     return a + drawPath(e.points, e.style, pointsDrawn);
                    default:        { error('wrong type ' + e.type + ' for ' + e.name); return a; }
                }
            }, '');
        }        

        function reverseCmd(state, g) { 
	    return {position: state.prevPosition, prevPosition: state.position, factors: g.lineThroughPoints(state.prevPosition, state.position)};
	}

        function parallelCmd(distance, state, g, point) {
            let factors = g.lineParallelThroughPoint(state.factors, point);
            let position = g.pointFromPoint(factors, point, distance);
	    return {position, prevPosition: state.position, factors};
	}

	function movetoCmd(params, state, g, dbPoints) {
            let cmdIdx = params[0] === "moveto" ? 1 : 0; 
            let type = params[cmdIdx]; 
            let distance = !isNaN(params[cmdIdx + 1]) ? parseFloat(params[cmdIdx + 1]) : undefined;
            let point = isNaN(params[cmdIdx + 1]) && params[cmdIdx + 1] != undefined ? loadPoint(name, params[cmdIdx + 1], dbPoints) : undefined;
            let point2 = params.length > cmdIdx + 2 ? (isNaN(params[cmdIdx + 2]) ? loadPoint(name, params[cmdIdx + 2], dbPoints) : parseFloat(params[cmdIdx + 2])) : undefined;
 	    switch(type) {
        	case "l": // across left
		   distance = -distance;	    
		case "r": // across right
                case "across":    return acrossCmd(distance, state, g); 
		case "h": // go ahead == alongside
		case "alongside": return alongsideCmd(distance, state, g);
		case "t": // go head from tail == between
                case "between":   return betweenCmd(distance, state, g);                  
                case "y":         return yCmd(distance, state, g);
                case "x":         return xCmd(distance, state, g);
                case "n": // nearest
                case "nearest":   return nearestCmd(distance, state, g, point);
		case "c": // cross == intersection
                case "intersection": return intersectionCmd(distance, state, g, point, point2);
		case "a": // angle
                case "angle":     return angleCmd(distance, state, g, point2);
		case "v": // reverse H<->T
                case "reverse":   return reverseCmd(state, g);
		case "b": // go back 
		     return alongsideCmd(-distance, state, g);
		case "p": // parallel from point
	             return parallelCmd(distance, state, g, point2);
                default: 
                    throw error('not recognized moveto type ' + type);
            }
	}

        function markCmd(params, state, g, dbPoints) {
           var getMark = ps => ps.slice(1).join(":");
           let mark = getMark(params);
           if(state.indentation) {
               setPoint(mark, Object.assign({}, state.indentation), dbPoints);
               state.indentation = undefined;
           } else {
//               if(params.length >= 1) state.position = Object.assign({}, state.position, { mark: params[1] }); // give labels
//               else                   state.position = Object.assign({}, state.position); // without mark -> with positions
//               state.position = Object.assign({}, state.position, { mark });
               state.position = Object.assign({}, state.position);
               setPoint(mark, state.position, dbPoints);
           }
	   return state;
        }

        function indentationCmd(params, state, g, dbPoints) {
            state.indentation = g.linearSelection(state.prevPosition, state.position, parseFloat(params[1], dbPoints), parseFloat(params[2], dbPoints));
	    return state;
	}

        function courseCmd(params, state, g, dbPoints) {
            var prevPosition, position;
       	    prevPosition = loadPoint(name, params[1], dbPoints);
            position = loadPoint(name, params[2], dbPoints);
            state = { prevPosition, position, factors: Object.assign({}, g.lineThroughPoints(prevPosition, position)) };
	    return state;
	}

        function runOperations(idx, name, operations, g, dbPoints) {
            log(idx, 'operations name', name, 'operations', operations);
            var state = { position: undefined, prevPosition: undefined, factors: undefined, indentation: undefined };
            operations.forEach((op,i) => {
                log(idx, i, 'operation name', name, op);
                var params = op.split(":");
                switch(params[0]) {				
		    case "l": // across left
		    case "r": // across right
                    case "h": // go ahead == alongside
		    case "b": // go back
		    case "t": // go ahead from tail == between
		    case "y": // move y
		    case "x": // move x
                    case "n": // nearest
		    case "v": // reverse H<->T
		    case "c": // cross == intersection
		    case "a": // angle
                    case "p": // parallel from point
                    case "moveto":
		        state = movetoCmd(params, state, g, dbPoints);
                        break;
		    case "m": // mark
                    case "mark":
		        state = markCmd(params, state, g, dbPoints);
                        break;
		    case "o": // orientation == course
                    case "course":
                        state = courseCmd(params, state, g, dbPoints);
                        break;
		    case "d": // distance == indentation
                    case "indentation":
                        state = indentationCmd(params, state, g, dbPoints);
                        break;
                    default:
                        error('not recognized oparation ' + params[0]);                    
                }
                log(idx, i, 'operations name', name, op, 'state', state);
            });
        }

        function acrossCmd(distance, state, g) {
            var position, prevPosition = state.position, factors = state.factors;
//                    if(state.position.mark === "nwee" && state.prevPosition.mark === "nwwe") debugger;
            factors = g.linePerpendicularThroughPoint(state.factors, state.position);
            log('acrossCmd state.factors', state.factors, 'factors', factors);
            position = g.pointAhead(state.position, factors, g.isProgressive(state.prevPosition, state.position, factors) ? distance: -distance);
            return { position, factors, prevPosition };
	}
    
        function alongsideCmd(distance, state, g) {
            var position, prevPosition = state.position, factors = state.factors;
//          position = g.pointAhead(state.position, state.factors, distance);
            position = g.pointAlongside(state.prevPosition, state.position, distance);
            return { position, factors, prevPosition };
	}
		    
        function betweenCmd(distance, state, g) {
            var factors = state.factors;
            var prevPosition = state.prevPosition;
            var position = g.pointBetween(state.prevPosition, state.position, distance);
            return { position, factors, prevPosition };
	}

        function yCmd(distance, state, g) {
            var prevPosition = state.position;
            var position = Object.assign({}, state.position, { y: state.position.y + distance });
            var factors = g.lineThroughPoints(state.position, position);
            return { position, factors, prevPosition };
	}

        function xCmd(distance, state, g) {
            var prevPosition = state.position;
            var position = Object.assign({}, state.position, { x: state.position.x + distance });
            var factors = g.lineThroughPoints(state.position, position);
            return { position, factors, prevPosition };
	}

        function nearestCmd(distance, state, g, point) {
	    var prevPosition = point;
            var position = g.pointWhenLineThroughPerpendicularLine(state.factors, prevPosition);
            var factors = g.lineThroughPoints(point, position);
//          log('point nearest', position, 'factors', factors);
            return { position, factors, prevPosition };
	}

        function intersectionCmd(distance, state, g, point, point2) {
            var prevPosition = state.position;
            var tmpFactors = g.lineThroughPoints(point, point2);
            var position = g.lineThroughLine(state.factors, tmpFactors);
            var factors = g.lineThroughPoints(state.position, position);
            log('point intersection', 'point', point, 'point2', point2, 'position', position, 'tmpFactors', tmpFactors, 'factors', factors);
            return { position, factors, prevPosition };
        }

        function angleCmd(distance, state, g, point2) {
            var prevPosition = state.position;
            let alongsidePoint = g.pointAlongside(state.prevPosition, state.position, 10); // 10m - good for usual lot dimensions & precision
            var position = g.combinedSelection(state.position, alongsidePoint, distance, point2);
            var factors = g.lineThroughPoints(position, prevPosition);
            return { position, factors, prevPosition };
        }

        function stringifyJSON(v, indent) {
//          return JSON.stringify(v, null, 4); // orginal version
          if(indent === undefined) indent = '';
          let ret, tmp;
          if(Array.isArray(v)) {
             let childComplex = Object.keys(v).find(k => Array.isArray(v[k]) || v[k] instanceof Object);
             ret = v.reduce((a, e) => {
               return a + stringifyJSON(e, indent + '  ') + ',';
             }, '');
             ret = ' [' +
               ret.slice(0, ret.length - 1) + 
               (childComplex ? '\n'+ indent : '') + ']';
          } else if(v instanceof Object) {
             let childComplex = Object.keys(v).find(k => Array.isArray(v[k]) || v[k] instanceof Object);
             ret = Object.keys(v).reduce((a,k) => {
        //       log('key', k, 'a', JSON.stringify(a, null, 0));
               return a + (childComplex ? '\n' + indent + '    ' + k : ' ' + k) + ":" + stringifyJSON(v[k], indent + '    ') + ",";
             }, '');
        //    log('ret.obj', JSON.stringify(ret), '\n');
             ret = '\n' + indent + '{' +
             ret.slice(0, ret.length - 1) +
                  (childComplex ? '\n' + indent : ' ') + '}';
          } else if(typeof v === 'string') {
             if(isNaN(v))  ret = '"' + v + '"';
             else            ret = v;
          } else {
             ret = v;
          }
         //  log('ret', JSON.stringify(ret), '\n');
          return ret;
        }

        function generate(svgElem, figuresElem, pointsElem, lot) {
            //calculate
            var dbPoints = {};

            var figs = figures({idx: 0}, lot, geometry, dbPoints);
//            log('dbPoints', dbPoints);
//            log('figs', figs);            
            var formattedPoints = formatDBPoints(dbPoints);
            log('points', formattedPoints);
            measureFigures(figs, geometry);
            var formattedFigures = formatFigures(figs);
            log('figures', formattedFigures);
            figuresElem.innerHTML += "figures:<br/>" + stringifyJSON(formattedFigures);
            pointsElem.innerHTML += "points:<br/>" + stringifyJSON(formattedPoints);            

            // draw
            var svg = '';
//            maxSize(lot);
            calculateExtremum(figs);
            countSizes(svgElem);
            var drawFigures = drawSvg(figs);
            svg += drawFigures;

            log('svg:', svg);
            svgElem.innerHTML = svg + svgElem.innerHTML;
       }

     function main(svgName, figuresName, pointsName) {
//       var params = window.location.search.substring(1).split("&").map(v => v.split("=")).reduce((map, [key, value]) => map.set(key, decodeURIComponent(value)), new Map());
       var params = window.location.search.substring(1).split("&").map(v => v.split("=")).reduce((map, [key, value]) => { map[key] = decodeURIComponent(value); return map; }, {}); 
       
       if(params.debug) debug = true;       
       console.logLimit = 2000;
//       log('lot.json', JSON.stringify(lot, null, 4));
       generate(document.getElementById(svgName), document.getElementById(figuresName), document.getElementById(pointsName), lot);

       if(params.ro)
         window.open('data:text/html;charset=utf-8,' + escape(document.documentElement.outerHTML)); // keeps script section
//       window.open('data:text/html;charset=utf-8,' + escape(document.documentElement.innerHTML)); // keeps script section
//          var win = window.open(); win.document.write('<html><head><title>Generated HTML of  ' + location.href + '</title></head><pre>' + document.documentElement.innerHTML.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></html>'); win.document.close(); void 0; // keeps script section
     }
