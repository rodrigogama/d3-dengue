(function() {
    var width = 1300 || window.innerWidth;
    var height = 800 || window.innerHeight;

    var container = d3.select("#chart");
    
    // Creates and configures the basic svg
    var svg = container.append("svg")
        .attr("id", "svg-dengue-cases")
        .attr({ width: width, height: height })
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + width + " " + height)
        .style("max-width", "100%");

    // SVG border
    svg.append("rect")
        .attr({ width: width, height: height })
        .style("fill", "none")
        .style("stroke", "black");    

    // SVG filter for the gooey effect
    // Code taken from http://tympanus.net/codrops/2015/03/10/creative-gooey-effects/
    var defs = svg.append("defs");
    var filter = defs.append("filter").attr("id", "gooeyCodeFilter");
    var filterCluster = defs.append("filter").attr("id", "gooeyCodeFilterCluster");

    filter.append("feGaussianBlur")
        .attr("in","SourceGraphic")
        .attr("stdDeviation", "10")
        //to fix safari: http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
        .attr("color-interpolation-filters", "sRGB") 
        .attr("result", "blur");
    filterCluster.append("feGaussianBlur")
        .attr("in","SourceGraphic")
        .attr("stdDeviation", "10")
        //to fix safari: http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
        .attr("color-interpolation-filters", "sRGB") 
        .attr("result", "blur");

    filter.append("feColorMatrix")
        .attr("class", "blurValues")
        .attr("in", "blur")
        .attr("mode", "matrix")
        .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5")
        .attr("result", "gooey");
    filterCluster.append("feColorMatrix")
        .attr("class", "blurValuesCluster")
        .attr("in", "blur")
        .attr("mode", "matrix")
        .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5")
        .attr("result", "gooey");

    filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "gooey")
        .attr("operator", "atop");
    filterCluster.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "gooey")
        .attr("operator", "atop");

    // Setting up the map
    var projection = d3.geo.mercator()
        .scale(1100)
        .translate([1650, 105]);

    var path = d3.geo.path()
        .projection(projection);

    // Creating Brazil's map
    var map = createMap(svg, path);

    // Creates the legend on the left side, which will be placed the clusters by region
    var leftLegend = createLeftSideLegend(svg);

    // Radius scale
    var max = getMax(dengue_cases, "numberOfCases");
    var rScale = d3.scale.sqrt()
        .domain([0, max]) // Input: from 0 to max number of cases of all the time
        .range([0, 20]);  // Output: radius from 0 to 20

    // Put the cases locations as well as its radius into the data itself
    dengue_cases.forEach(function(d) {
        d.record.forEach(function(e) {
            e.radius = rScale(e.numberOfCases) * 2;
        });
        d.x = projection([d.lat, d.lon])[0];
        d.y = projection([d.lat, d.lon])[1];
    });

    // Wrapper for the dengue cases
    var casesWrapper = svg.append("g")
        .attr("class", "casesWrapper")
        .style("filter", "url(#gooeyCodeFilter)");

    // Wrapper for the clusters of dengue cases
    var casesClusterWrapper = svg.append("g")
        .attr("class", "casesClusterWrapper")
        .style("filter", "url(#gooeyCodeFilterCluster)");

    // Most recent year, used to show its data first
    var lastYear = dengue_cases[0].record[dengue_cases[0].record.length-1].year;

    // Get center coordinates of the map, so that all the circles are located at the same place.
    var bbox = map.node().getBBox();
    var coordinates = [bbox.x + bbox.width/2, bbox.y + bbox.height/2]; // The center of map
    
    // Place the cases circles
    placeCases(lastYear, coordinates);
    
    // Circle over all others
    var coverCircleRadius = 40;
    
    casesWrapper.append("circle")
        .attr("class", "casesCover")
        .attr("r", coverCircleRadius)
        .attr("cx", coordinates[0])
        .attr("cy", coordinates[1]);

    var legendScaleX = d3.scale.linear()
        .domain([0, width])
        .range([0, parseFloat(leftLegend.attr("width"))+200]);

    var legendScaleY = d3.scale.linear()
        .domain([0, height])
        .range([0, parseFloat(leftLegend.attr("height"))]);

    // Calculate the centers for each region
    var centers = getCenters("region", [width, height/0.8]);
    centers.forEach(function(d) {
        d.y = legendScaleY(d.y - 100) + 360;
        d.x = legendScaleX(d.x - 200);
        d.total = (function() {
            return 700000;
        })();
    });

    // Wrapper for the region labels
    var labelWrapper = svg.append("g")
        .attr("class", "labelWrapper")
        .attr("transform", "translate(0, "+height/2.2+")");
        
    // Append the region labels
    labelWrapper.selectAll(".label")
        .data(centers)
        .enter().append("text")
        .attr("class", "label")
        .style("opacity", 1)
        .attr("transform", function (d) {
            return "translate(" + (d.x) + ", " + (d.y - 60 - 380) + ")"; 
        })
        .text(function (d) { return d.region });

    // Append the region total cases labels
    labelWrapper.selectAll(".label-cluster")
        .data(centers)
        .enter().append("text")
        .attr("class", "label-cluster")
        .style("opacity", 1)
        .attr("transform", function (d) {
            return "translate(" + (d.x) + ", " + (d.y - 40 - 380) + ")"; 
        })
        .text(function (d) { return d.total + " casos"; });

    // Set-up the force
    var force = d3.layout.force()
        .gravity(.02)
        .charge(0)
        .on("tick", tick(centers, "region"));

    loop();	
    setInterval(loop, 15000);
    
    function loop() {
        showCases();
        setTimeout(backToCenter, 12000);
    }

    /*******************************************************************************************
     *********************************** Left-side cluster functions ***************************
     *******************************************************************************************/

    function createLeftSideLegend(svg) {
        var width = parseFloat(svg.attr("width")) / 2.9;
        var height = parseFloat(svg.attr("height")) / 2;

        var legendGroup = svg.append("g")
            .attr("class", "leftLegendWrapper")
            // .attr({ width: width, height: height })
            .attr("transform", "translate(5, "+ height +")")

        var legend = legendGroup.append("rect")
            .attr({ width: width, height: height / .975 })
            .attr({ x: 0, y: -15 })
            .style("fill", "none")
            .style("stroke", "green");

        return legend;
    }

    /*******************************************************************************************
     ************************************** Map functions **************************************
     *******************************************************************************************/

    /** @function createMap
     *  @description Creates the geographic map of Brazil.
    */
    function createMap(svg, path) {
        var states = topojson.feature(brazilMap, brazilMap.objects.states).features;

        // Group for holding the map paths
        var map = svg.append("g").attr("class", "map");
            
        map.selectAll("path") // Draws all the states
            .data(states)
            .enter().append("path")
                .attr("d", path)
                .attr("class", function(d) { return "state " + d.properties.postal; });

        map.append("path") // Line between the states
            .datum(topojson.mesh(brazilMap, brazilMap.objects.states, function(a, b) { return a !== b; }))
            .attr("class", "mesh")
            .attr("d", path);

        return map;
    }

    /** @function placeCases
     *  @description Places the circles that corresponds to dengue cases on each state.
    */
    function placeCases(year, coordinates) {
        casesWrapper.selectAll(".cases")
            .data(dengue_cases)
            .enter().append("circle")
                .attr("id", function(d) { return "circle-" + d.uf; })
                .attr("class", "cases")
                .attr("r", function(d) {
                    var obj = d.record.filter(function(e) { return e.year === year; });
                    return obj[0].radius;
                })
                .attr("cx", coordinates[0]) // map center coordinates
                .attr("cy", coordinates[1]);

        casesClusterWrapper.selectAll(".clusters")
            .data(dengue_cases)
            .enter().append("circle")
                .attr("id", function(d) { return "cluster-" + d.uf; })
                .attr("class", "cluster")
                .attr("r", function(d) {
                    var obj = d.record.filter(function(e) { return e.year === year; });
                    return obj[0].radius;
                })
                .attr("cx", coordinates[0]) // map center coordinates
                .attr("cy", coordinates[1]);
    }

    /*******************************************************************************************
     ************************************ Tooltip functions ************************************
     *******************************************************************************************/
    /** @function showTooltip
     *  @description Shows a tooltip with the number of dengue cases for a given state.
    */
    function showTooltip(state) {
        var cases = 0;
        var element = d3.select("#circle-" + state);

        dengue_cases.forEach(function(d) {
            d.record.forEach(function(e) {
                if (e.year === lastYear && d.uf === state)
                    cases = e.numberOfCases; 
            });
        });

        // Define and show the tooltip using bootstrap popover;
        $(element).popover({
            placement: "auto top", // place the tooltip above the item
            container: "#chart", // the name (class or id) of the container
            trigger: "manual",
            html : true,
            content: function() { // the html content to show inside the tooltip
                return "<span style='font-size: 11px; text-align: center;'>Número de casos: " + cases + "</span>"; }
        });
        $(element).popover("show");

        // Make chosen circle more visible
        element.style("opacity", 1);
    }

    /** @function removeTooltip
     *  @description Hides a tooltip with the number of dengue cases for a given state.
    */
    function removeTooltip(state) {
        var element = d3.select("#circle-" + state);

        // Hide the tooltip
        $(".popover").each(function() {
            $(this).remove();
        }); 
        
        // Fade out the bright circle again
        element.style("opacity", 0.85);   
    }

    /*******************************************************************************************
     *********************************** Animation functions ***********************************
     *******************************************************************************************/
    /** @function placeCases
     *  @description Moves the cases of dengue from the center to their actual states within Brazil.
    */
    function showCases() {
        // Stop the force layout (in case you move backward)
        force.stop();

        // Make the cover circle shrink
        d3.selectAll(".casesCover")
            .transition().duration(2000)
            .attr("r", 0);

        // Put the cases in center of each state
        d3.selectAll(".cases")
            .transition("move").duration(2000)
            .delay(function(d, i) { return i * 20; })
            .attr("r", function(d) {
                var obj = d.record.filter(function(e) { return e.year === lastYear; });
                return obj[0].radius = obj[0].radius;
            })
            .attr("cx", function(d) { return d.x = projection([d.lat, d.lon])[0]; })
            .attr("cy", function(d) { return d.y = projection([d.lat, d.lon])[1]; })
            .call(endAllTransitions, function() {
                // Set tooltips after the animation is done.
                d3.selectAll(".cases")
                    .on("mouseover", function(d) { showTooltip(d.uf); })
                    .on("mouseout", function(d) { removeTooltip(d.uf); });

                d3.selectAll(".state")
                    .on("mouseover", function(d) { showTooltip(d.properties.postal); })
                    .on("mouseout",  function(d) { removeTooltip(d.properties.postal); });
            });

        // Put the clusters in the legend at the left side
        d3.selectAll(".cluster")
            .transition("move").duration(2000)
            .delay(function(d, i) { return i * 20; })
            .attr("r", function(d) {
                var obj = d.record.filter(function(e) { return e.year === lastYear; });
                return obj[0].radius = obj[0].radius;
            })
            .attr("cx", function(d) {
                var region = centers.filter(function(center) { return center.region === d.region; });
                return d.x = region[0].x; 
            })
            .attr("cy", function(d) { 
                var region = centers.filter(function(center) { return center.region === d.region; });
                return d.y = region[0].y;
             })
             .call(endAllTransitions, clusterByRegion)

        // Around the end of the transition above make the circles see-through a bit
        d3.selectAll(".cases")
            .transition().duration(2000).delay(1000)
            .style("opacity", 0.85)
            .style("stroke-opacity", 1);
            

        // "Remove" gooey filter from cities during the transition
        // So at the end they do not appear to melt together anymore
        d3.selectAll(".blurValues")
            .transition().duration(4000)
            .attrTween("values", function() { 
                return d3.interpolateString("1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5", 
                                            "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 6 -5"); 
            });
    }

    /** @function clusterByRegion
     *  @description Cluster all the cases based on the region of the state
    */
    function clusterByRegion() {
        // Start force again
        force.start();


    }

    /** @function backToCenter
     *  @description Move the circles back to the center location again
    */
    function backToCenter() {
        // Stop the force layout
        force.stop();
        
        // Hide the tooltip
        $(".popover").each(function() {
            $(this).remove();
        }); 

        // Make the cover circle to its true size again
        d3.selectAll(".casesCover")
            .transition().duration(3000).delay(500)
            .attr("r", coverCircleRadius);

        // Move the cities to the 0,0 coordinate
        d3.selectAll(".cases")
            .style("stroke-opacity", 0)
            .transition().duration(2000)
            .delay(function(d, i) { return i * 10; })
            .attr("cx", coordinates[0])
            .attr("cy", coordinates[1]);

        // Remove tooltips
        d3.selectAll(".cases")
            .on("mouseover", null)
            .on("mouseout", null);

        d3.selectAll(".state")
            .on("mouseover", null)
            .on("mouseout", null);

        // Move the clusters to the 0,0 coordinate
        d3.selectAll(".cluster")
            .transition().duration(2000)
            .delay(function(d, i) { return i * 10; })
            .attr("cx", coordinates[0])
            .attr("cy", coordinates[1]);

        d3.selectAll(".blurValues")
            .transition().duration(1000).delay(1000)
            .attrTween("values", function() {
                return d3.interpolateString("1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -6",
                                            "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5");
            });

        // d3.selectAll(".blurValuesCluster")
        //     .transition().duration(1000).delay(1000)
        //     .attrTween("values", function() {
        //         return d3.interpolateString("1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -6",
        //                                     "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5");
        //     });
    }

    /*******************************************************************************************
     ************************************* Helper functions ************************************
     *******************************************************************************************/

    function getMax(arr, vname) {
        var max = [];
        
        arr.forEach(function(d) {
            var highest = Number.NEGATIVE_INFINITY;
            var tmp;
            // finds the max value of the current state
            for (var i = d.record.length-1; i >= 0; i--) {
                tmp = d.record[i][vname];
                if (tmp > highest) highest = tmp;
            }
            max.push(highest);
        });

        return d3.max(max);
    }

    function tick(centers, vname) {
        var foci = {};
        for (var i=0; i < centers.length; i++)
            foci[centers[i].region] = centers[i];

        return function (e) {
            for (var i = 0; i < dengue_cases.length; i++) {
                var o = dengue_cases[i];
                var f = foci[o[vname]];
                o.y += (f.y - o.y) * e.alpha;
                o.x += (f.x - o.x) * e.alpha;
            }

            d3.selectAll(".cluster")
                .each(collide(.5))
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        };
    }

    function getCenters(vname, size) {
        var centers = [], 
            mapping,
            flags = [];

        for (var i=0; i < dengue_cases.length; i++) {
            if (flags[dengue_cases[i][vname]]) continue;
            
            flags[dengue_cases[i][vname]] = true;
            centers.push({ region: dengue_cases[i][vname], value: 1 });
        }

        centers.sort(function(a, b) { return d3.descending(a.region, b.region); });
        
        mapping = d3.layout.pack()
            .sort(function(d) { return d[vname]; })
            .size(size);
        mapping.nodes({children: centers});

        return centers;
    }

    function collide(alpha) {
        var quadtree = d3.geom.quadtree(dengue_cases);
        var padding = 0;
        var maxRadius = getMax(dengue_cases, "radius")

        return function (d) {
            var r = d.radius + maxRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    function endAllTransitions(transition, callback) { 
        if (!callback) callback = function() { };
        if (transition.size() === 0) callback();

        var n = 0;
        transition
            .each(function() { ++n; })
            .each("end", function() {
                if (!--n) 
                    callback.apply(this);
        });
    }

})();