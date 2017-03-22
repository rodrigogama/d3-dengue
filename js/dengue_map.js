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
    d3.entries(dengue_cases)[1].value.forEach(function(d) {
        d.states.forEach(function(d) {
            maxCases.push(d3.max(d.cases));
        });
    });

    // Radius scale
    var rScale = d3.scale.sqrt()
        .range([0, 14])
        .domain([0, d3.max(maxCases)]);

    createMap().then(function() {
        // showDengueCases().then(function() {
            console.log("Done.");
        // });
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
                    .attr("class", function(d) { return "state " + d.properties.postal; });

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

        dengue_cases.years.forEach(function(year) {
            dengueCasesByYear(year);
        });

        deferred.resolve();
        return deferred.promise();
    }

    function dengueCasesByYear(year) {
        var data   = getData();
        var states = ["RO","AC","AM","RR","PA","AP","TO","MA","PI","CE","RN","PB","PE","AL","SE","BA","MG","ES","RJ","SP","PR","SC","RS","DF","GO","MT","MS"]; 

        svg.map.selectAll("circle.cases")
            .data(data)
            .enter().append("circle")
                .attr("r", function(d) { return 5 ;})
                .attr("cx", function(d) {
                    console.log(d);
                    return path.centroid(d)[0];
                })
                .attr("cy", function(d) {
                    return path.centroid(d)[1];
                })
                // .attr("cx", projection([0,0])[0])
                // .attr("cy", projection([0,0])[1])
                .style("fill", "black")
                .style("opacity", year === 2016 ? 1 : 0);

        function getData() {
            return [1,1,1,1,1,1,1];
        }
    }

})();