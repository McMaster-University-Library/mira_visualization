/*
JavaScript to create visualization
Code below is just for learning d3.js
I plan to improve it
*/

const svg = d3.select("#miraVis"),
    margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    domainWidth = width - margin.left - margin.right,
    domainHeight = height - margin.top - margin.bottom;

// Scales
const x = d3.scaleLinear()
    .domain(padExtent([1,200]))
    .range(padExtent([0, domainWidth]));

const y = d3.scaleLinear()
    .domain(padExtent([1,200]))
    .range(padExtent([domainHeight, 0]));

const g = svg.append("g")
    .attr("transform", "translate(" + margin.top + "," + margin.top + ")");

g.append("rect")
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "#F6F6F6");

//Add x-axis
const xAxis= g.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + y.range()[0] / 2 + ")")
    .call(d3.axisBottom(x).ticks(0));

g.append("text")
    //.attr("transform", "translate(" + x.range()[1] /2 + "," + y.range()[1] + ")")
    .attr("transform", "translate(" + x.range()[1] /2 + "," + y.range()[1] + ")")
    .style("text-anchor", "middle")
    .attr("dy", "1em")
    .text("POLICY")

    g.append("text")
    .attr("transform", "translate(" + x.range()[1] / 2 + "," + y.range()[0] + ")")
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("PRODUCT or SERVICE");

//Add y-axis
g.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + x.range()[1] / 2 + ", 0)")
    .call(d3.axisLeft(y).ticks(0));

g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y",-22)
    .attr("x",-280 )
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Practice & Application");

g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 950)
    .attr("x",-280 )
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("THEORY & DISCOVERY");

/*
csv file contains macid,position,first_name,last_name,email,mira_url_name,primary_faculty,x_value,y_value
Don't need mira_url_name since this can be created using first_name & last_name columns
 */
d3.csv("mira_members.csv").then(function(mira_members) {
    // Prepare data. Coerce the strings for coordinates to numbers.
    mira_members.forEach(function (d) {
        d.x_value = +d.x_value;
        d.y_value = +d.y_value;
        d.first_name = d.first_name;
        d.last_name = d.last_name;
        d.macid = d.macid;
        d.faculty2 = d.primary_faculty;
        d.primary_faculty = d.primary_faculty.replace(/\s+/g, '');
    });

    // Define 'div' to contain the tooltip
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip card card-shadow")
        .style("opacity", 0);

    function update(faculty, mira_members) {

        const gDots = g.selectAll("g.dot").data(function (d) {
            if (faculty!="All") return mira_members.filter(function (d) {
                return d.faculty2 == faculty;
            });
            else {return mira_members }
        });

        var gData = gDots.enter().append('g')
            .attr("id", function (d) {
                return d.macid;
            });

        gData.append("circle")
            .attr("class", function (d) {
                return "dot " + d.primary_faculty;
            })
            .attr("r", "7")
            .attr("cx", function (d) {
                return x(d.x_value);
            })
            .attr("cy", function (d) {
                return y(d.y_value);
            })
            // Tooltip events
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(
                    d.first_name+ " "+d.last_name +
                    "<br/>Department: "  + d.faculty2 +
                    "<br>MIRA projects (pull projects)<br>" +
                    '<br><a href= "https://mira.mcmaster.ca/team/bio/'+
                    d.first_name.toLowerCase() + '-'+d.last_name.toLowerCase() +
                    '" target="_blank">View Profile Page' +
                    "</a>")
                    .style("left", (d3.event.pageX +15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("click", function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", .9);
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
            });

        gData.append("text").text(function (d) {
            return d.first_name + " " + d.last_name;
        })
            .attr("class", function (d) {
                return "dotText " + d.primary_faculty;
            })
            .attr("x", function (d) {
                return x(d.x_value);
            })
            .attr("y", function (d) {
                return y(d.y_value) - 10;
            });
        gDots.exit().remove();
    }

    // Event listener for faculty filter
    d3.select("#facultyFilter").on("change", function (d) {
        var faculty = d3.select(this).property("value")
        d3.selectAll(".dot").style("opacity",0)
        d3.selectAll(".dotText").style("opacity",0)
        d3.selectAll("."+faculty).style("opacity",1)

        // run the update function with this selected option
        update(faculty, mira_members)
    })

    update("All", mira_members)
});

function padExtent(e, p) {
    if (p === undefined) p = 1;
    return ([e[0] - p, e[1] + p]);
}

