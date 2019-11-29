/*
JavaScript to create visualization
Code below is just for learning d3.js
I plan to improve it
*/

var mira_members_data_pull = {} // key: macid val: dict(key: csv file attribute, val: attribute value)
var faculty_members = {}  // key: faculty val: list of macid
var project_members = {"project":{}, "grant":{}}  // key: project or grant, value: {dict key: name, val: list of macid}
var coauthor_network = {}  // key: macid val: list of coauthor macid
var dots = {}  // key: macid val: dataGroup (for the dot)


function get_mira_data(){

    d3.csv("mira_members.csv").then(function(data){
        for (i = 0; i < data.length; i++){
            get_coauthor_xml(data[i]["macid"])
            mira_members_data_pull[data[i]["macid"]] = data[i]

            // intializing faculty list if it isn't there already
            faculty_members[data[i]["primary_faculty"]] = faculty_members[data[i]["primary_faculty"]] || [];
            faculty_members[data[i]["primary_faculty"]].push(data[i]["macid"])
        }
    })
/*
    d3.csv("project_grant.csv").then(function(data){

        for (i = 0; i < data.length; i++){
            //intializing project member list if it isn't there already
            pg = data[i]["project_grant"]
            pg_name = data[i]["name"]
            project_members[pg][pg_name] = project_members[pg][pg_name] || [];
            project_members[pg][pg_name].push(data[i]["macid"])
        }
    })
 */
}

function get_coauthor_xml(member_macid) {
    url = "https://vivovis.mcmaster.ca/visualizationData?vis=coauthorship&uri=https%3A%2F%2Fvivovis.mcmaster.ca%2Findividual%2F" + member_macid + "&vis_mode=coauthor_network_download"
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            sort_coauthor_xml(member_macid, this);
        }
        if (this.status >= 400) {
            xhttp.abort()
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();

}

function sort_coauthor_xml(member_macid, xml) {
    /*
     This function updates the global variable coauthor_network by adding a new member as a key. The value is a list
     of all corresponding macids associated with that author, including that author itself
     */
    var xmlDoc = xml.responseXML;
    mac_ids = [];
    nodes  = xmlDoc.getElementsByTagNameNS("http://graphml.graphdrawing.org/xmlns", "node");
    for (i = 0; i < nodes.length; i++) {
        data_nodes = nodes[i].getElementsByTagNameNS("http://graphml.graphdrawing.org/xmlns", "data");
        for (j = 0; j < data_nodes.length; j++) {

            // extracting the co-author macids
            if(data_nodes[j].getAttribute("key") == "url") {
                experts_url_base = "https://experts.mcmaster.ca/individual/";
                experts_url = data_nodes[j].textContent;
                mac_id = experts_url.substring(experts_url_base.length, experts_url.length);
                mac_ids.push(mac_id) ;
            }
        }
    }
    coauthor_network[member_macid] = mac_ids  // update global variable
}

get_mira_data();


const svg = d3.select("#miraVis"),
    margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    domainWidth = width - margin.left - margin.right,
    domainHeight = height - margin.top - margin.bottom;

// Add d3 zoom feature to svg
svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 8])
    .on("zoom", zoomed));

function zoomed() {
    g.attr("transform", d3.event.transform);
}


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
        dots[d.macid] = d

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
            else {return mira_members}
        });

        var gData = gDots.enter().append('g')
            .attr("id", function (d) {
                return d.macid;
            })
            .attr("class","dataGroup");

        gData.append("circle")
            .attr("class", function (d) {
                return "dot " + d.primary_faculty;
            })
            .attr("r", "5")
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
                    "<div class='text-right'><button onclick='d3.selectAll(\".tooltip\").style(\"opacity\",0);'>Close</button></div>" +
                    "<span class='tooltipName'>"+d.first_name+ " "+d.last_name +
                    "</span><p>" + d.position + "</p>" +
                    "Department: "  + d.faculty2 +
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
            //return d.first_name + " " + d.last_name;
            return d.last_name;
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
    d3.selectAll("#facultyFilter button").on("click", function (d) {
        //  console.log("event logged")
        var faculty = d3.select(this).text().replace(/[^a-zA-Z ]/g, "")

        //Remove previous points
        d3.selectAll(".dataGroup").remove();

        // run the update function with this selected option
        update(faculty, mira_members)
        draw_lines(coauthor_start)
    })

    update("All", mira_members)


    function draw_lines(macid) {
        console.log("draw")
        const start = dots[macid];
        for (i=0; i < coauthor_network[start.macid].length; i++){
            if (coauthor_network[start.macid][i] in dots){

                end = dots[coauthor_network[start.macid][i]]
                g.append("line")
                    .attr("x1", function (d) {
                        return x(start.x_value);
                    })    // x position of the first end of the line
                    .attr("y1", function (d) {
                        return y(start.y_value);

                    })     // y position of the first end of the line
                    .attr("x2", x(end.x_value))     // x position of the second end of the line
                    .attr("y2", y(end.y_value))    // y position of the second end of the line
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");

            }
        }
    }

    coauthor_start = ""
    // Event listener for coauthor lines
    d3.selectAll(".dataGroup").on("click", function (d) {
        console.log("event logged with this event listener")
        d3.selectAll("line").remove();
        coauthor_start = this.id
        draw_lines(this.id)


    })

});

function padExtent(e, p) {
    if (p === undefined) p = 1;
    return ([e[0] - p, e[1] + p]);
}

