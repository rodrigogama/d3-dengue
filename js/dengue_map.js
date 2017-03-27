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

    svg.append("rect")
        .attr({ width: width, height: height })
        .style("fill", "none")
        .style("stroke", "black");

    var projection = d3.geo.mercator()
        .scale(1100)
        .translate([1650, 105]);

    var path = d3.geo.path()
        .projection(projection);

    // SVG filter for the gooey effect
    // Code taken from http://tympanus.net/codrops/2015/03/10/creative-gooey-effects/
    var defs = svg.append("defs");
    var filter = defs.append("filter").attr("id", "gooeyCodeFilter");
    
    filter.append("feGaussianBlur")
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
    filter.append("feBlend")
        .attr("in", "SourceGraphic")
        .attr("in2", "gooey")
        .attr("operator", "atop");

    // Scale from 0 to max number of cases of all the time
    var maxCases = [];
    dengue_cases.forEach(function(d) {
        var highest = Number.NEGATIVE_INFINITY;
        var tmp;
        // finds the max value of the current state
        for (var i = d.record.length-1; i >= 0; i--) {
            tmp = d.record[i].numberOfCases;
            if (tmp > highest) highest = tmp;
        }
        maxCases.push(highest);
    });

    // Radius scale
    var rScale = d3.scale.sqrt()
        .domain([0, d3.max(maxCases)])
        .range([0, 20]);

    createMap().then(function() {
        console.log("Done.");
    });

    /////////////////////////////////////

    function createMap() {
        var deferred = $.Deferred();

        d3.json("data/brazil_states.topo.json", function (error, br) {
            if (error) throw error;

            var states = topojson.feature(br, br.objects.states).features;

            // Group for holding the map paths
            svg.map = svg.append("g").attr("class", "map");
                
            svg.map.selectAll("path") // Draws all the states
                .data(states)
                .enter().append("path")
                    .attr("d", path)
                    .attr("class", function(d) { return "state " + d.properties.postal; })
                    .on("mouseover", function(d) { showTooltip(d.properties.postal); })
                    .on("mouseout",  function(d) { removeTooltip(d.properties.postal); });

            svg.map.append("path") // Line between the states
                .datum(topojson.mesh(br, br.objects.states, function(a, b) { return a !== b; }))
                .attr("class", "mesh")
                .attr("d", path);

            // Appends the circle cases on each state
            showDengueCases();
        });

        deferred.resolve();
        return deferred.promise();
    }

    function showDengueCases() {
        var deferred = $.Deferred();

        dengue_cases.forEach(function(state) {
            var element = d3.select(".state." + state.uf).node(); // Get the DOM element from a D3 selection.
            var bbox = element.getBBox(); // Use the native SVG interface to get the bounding box
            var coordinates = [bbox.x + bbox.width/2, bbox.y + bbox.height/2]; // The center of the bounding box

            // Appends circles that represent the number of dengue cases on each state by year.
            svg.map.selectAll("circle." + state.uf)
                .data(state.record)
                .enter().append("circle")
                    .attr("id", function(d) { return "circle-" + state.uf + "-" + d.year; })
                    .attr("r",  function(d) { return rScale(d.numberOfCases) * 2; })
                    .attr("cx", coordinates[0])
                    .attr("cy", coordinates[1])
                    .attr("class", "cases")
                    .style("opacity", 0.85)
                    .style("visibility", function(d) { return d.year === 2015 ? "visible" : "hidden"; })
                    .on("mouseover", function() { showTooltip(state.uf); })
	                .on("mouseout",function() { removeTooltip(state.uf); });
        });

        // Recentering paths that are not in a good position.
        d3.selectAll("[id*=circle-ES]")
            .attr("cx", function(d) { return parseFloat(d3.select(this).attr("cx")) - 100; });
        d3.selectAll("[id*=circle-RN]")
            .attr("cx", function(d) { return parseFloat(d3.select(this).attr("cx")) - 50; })
            .attr("cy", function(d) { return parseFloat(d3.select(this).attr("cy")) + 50; });
        d3.selectAll("[id*=circle-PI]")
            .attr("cx", function(d) { return parseFloat(d3.select(this).attr("cx")) + 20; });
        d3.selectAll("[id*=circle-SC]")
            .attr("cx", function(d) { return parseFloat(d3.select(this).attr("cx")) + 20; });
        d3.selectAll("[id*=circle-RJ]")
            .attr("cx", function(d) { return parseFloat(d3.select(this).attr("cx")) + 10; })
            .attr("cy", function(d) { return parseFloat(d3.select(this).attr("cy")) + 5; });

        deferred.resolve();
        return deferred.promise();
    }

    /***********************************************
     ************** Tooltip functions **************
     ***********************************************/

    function showTooltip(state) {
        var cases = 0;
        var element = d3.selectAll("circle[id^='circle-"+ state +"']").filter(function(d) {
            cases = d.numberOfCases;
            return this.style.visibility === "visible";
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

    function removeTooltip(state) {
        var element = d3.selectAll("circle[id^='circle-"+ state +"']").filter(function(d) {
            return this.style.visibility === "visible";
        });

        // Hide the tooltip
        $(".popover").each(function() {
            $(this).remove();
        }); 
        
        // Fade out the bright circle again
        element.style("opacity", 0.85);   
    }

})();