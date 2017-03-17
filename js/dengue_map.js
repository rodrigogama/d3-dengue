(function() {
    var width = 1300 || window.innerWidth;
    var height = 800 || window.innerHeight;

    var container = d3.select("#chart");
    
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

    d3.json("data/brazil_states.topo.json", function (error, data) {
        if (error) throw error;

        var states = topojson.feature(data, data.objects.states).features;

        svg.append("g")
            .selectAll("path")
            .data(states)
            .enter().append("path")
                .attr("d", path)
                .attr("class", function(d) { return "regiao " + d.properties.postal; });
    });
})();