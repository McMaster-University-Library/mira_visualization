/*
JavaScript to create visualization
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global Vars
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const margin = {top: 0, right: 0, bottom: 0, left: 0};
var mira_members_data_pull = {} // key: macid val: dict(key: csv file attribute, val: attribute value)
var faculty_members = {}  // key: faculty val: list of macid
var project_members = {"project":{}, "grant":{}}  // key: project or grant, value: {dict key: name, val: list of macid}
var coauthor_network = {}  // key: macid val: list of coauthor macid
var dots = {}  // key: macid val: dataGroup (for the dot)
gData = []
coauthor_origin = ""
active_faculty = "All"
csv_file = "mira_members94.csv"
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pulling co-author Data
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function get_mira_data(){

    d3.csv(csv_file).then(function(data){
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


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Visual Elements
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function visuals() {

    d3.select("g").remove()  // remove former drawn graphs

    var availWidth = window.innerWidth - margin.left - margin.right;
    var availHeight = window.innerHeight - margin.top - margin.bottom;

    const svg = d3.select("#miraVis").attr('width', availWidth.toString()).attr('height', availHeight.toString()),
        width = +availWidth,
        height = +availHeight,
        domainWidth = width - margin.left - margin.right,
        domainHeight = height - margin.top - margin.bottom;


// Add d3 zoom feature to svg
    svg.call(d3.zoom()
        .scaleExtent([1, 32])
        //  .translateExtent([[-margin.left, -margin.top], [width, height]])
        .translateExtent([[-margin.left, -margin.top], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed));

    function zoomed() {
        var transform = d3.event.transform;
        g.attr("transform", transform);
    }

// Scales
    const x = d3.scaleLinear()
        .domain(padExtent([0, 200]))
        .range(padExtent([0, domainWidth]));

    const y = d3.scaleLinear()
        .domain(padExtent([0, 200]))
        .range(padExtent([domainHeight, 0]));

    const g = svg.append("g")
        .attr("transform", "translate(" + margin.top + "," + margin.top + ")");

    g.append("rect")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "#eaf1f8");

//Add x-axis
/*
    const xAxis = g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + y.range()[0] / 2 + ")")
        .call(d3.axisBottom(x).ticks(0));

*/
    g.append("text")
    // .attr("transform", "translate(" + x.range()[1] /2 + "," + (y.range()[1]-margin.top)+ ")")
        .attr("transform", "translate(" + x.range()[1] / 2 + "," + (y.range()[1]) + ")")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle")
        .attr("dy", "1em")
        .text("POLICY")


    g.append("text")
        .attr("transform", "translate(" + x.range()[1] / 2 + "," + (domainHeight - 24) + ")")
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle")
        .text("PRODUCT or SERVICE"),
        console.log(domainHeight)

//Add y-axis
    /*
    g.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + x.range()[1] / 2 + ", 0)")
        .call(d3.axisLeft(y).ticks(0));
*/


    g.append("text")
        .attr("transform", "rotate(-90)")
        //    .attr("y",-margin.left)
        .attr("y", 0)
        .attr("x", -domainHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle leftTitle")
        .text("PRACTICE & APPLICATION");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", (domainWidth - 24))
        .attr("x", -domainHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle rightTitle")
        .text("THEORY & DISCOVERY");


    g.append("line")
        .attr("transform", "rotate(-90)")
        .attr("x1", d3.select(".rightTitle").attr('x')) // x position of the first end of the line
        .attr("y1", d3.select(".rightTitle").attr('y'))
        .attr("x2", d3.select(".leftTitle").attr('x')) // x position of the first end of the line
        .attr("y2", d3.select(".leftTitle").attr('y') + 24)
        .attr("stroke-width", 4)
        .attr("stroke", "black")

    g.append("line")
        //.attr("transform", "rotate(-90)")
        .attr("x1", domainWidth / 2) // x position of the first end of the line
        .attr("y1", 24)
        .attr("x2", domainWidth / 2) // x position of the first end of the line
        .attr("y2", domainHeight - 24)
        .attr("stroke-width", 4)
        .attr("stroke", "black")


    function padExtent(e, p) {
        if (p === undefined) p = 1;
        return ([e[0] - p, e[1] + p]);
    }


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Controlling Dots and Lines
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /*
    csv file contains macid,position,first_name,last_name,email,mira_url_name,primary_faculty,x_value,y_value
    Don't need mira_url_name since this can be created using first_name & last_name columns
     */


    d3.csv(csv_file).then(function (mira_members) {
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

        const gDots = g.selectAll("g.dot").data(mira_members);

        gData = gDots.enter().append('g')
            .attr("id", function (d) {
                return d.macid;
            })
            .attr("class", "dataGroup");


        // Event listener for faculty filter
        d3.selectAll("#facultyFilter button").on("click", function (d) {
            //  console.log("event logged")
            var faculty = d3.select(this).text().replace(/[^a-zA-Z ]/g, "")
            // run the update function with this selected option
            faculty_filter(faculty)
            draw_lines(coauthor_origin)
        })

        // Event listener for coauthor linesx
        d3.selectAll(".dataGroup").on("click", function (d) {
            console.log("event logged with this event listener")

            draw_lines(this.id)
            faculty_filter(active_faculty)

        })

        // Event listener to remove coauthor lines and tooltips when clicking on canvas
        d3.select("#miraVis").on("click", function (e) {

            if (event.target.tagName != "circle") {
                coauthor_origin = ""
                d3.selectAll(".coauthor_line").remove()
                d3.selectAll(".tooltip").remove()
                faculty_filter(active_faculty)
            }
        })

        // Initial start up
        faculty_filter(active_faculty)
        draw_lines(coauthor_origin)
    });


    function faculty_filter(faculty) {

        d3.selectAll("circle").remove();  //Remove previous points
        d3.selectAll(".dotText").remove();  //Remove previous names
        active_faculty = faculty  //Set active faculty global var
        active = gData.filter(function (d) {
            if (faculty == "All" || d["faculty2"] == faculty || d.macid == coauthor_origin) {
                return true
            } else {
                return false
            }
        })

        active.append("circle")
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
            .on("mouseover", function (d) {

                var current_tooltip = document.getElementsByClassName("tooltip")

                if (current_tooltip.length > 0 && current_tooltip[0].getAttribute("macid") != d.macid){
                    d3.selectAll(".tooltip").remove()
                }

                current_tooltip = document.getElementsByClassName("tooltip")
                if (current_tooltip.length == 0) {
                    // Define 'div' to contain the tooltip
                    var tooltip = d3.select("body")
                        .append("div")
                        .attr("class", "tooltip card card-shadow")
                        .attr("macid", d.macid)
                        .style("opacity", 0);


                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(
                        //"<div class='text-right'><button onclick='d3.selectAll(\".tooltip\").remove();'>Close</button></div>" +
                        "<span class='tooltipName'>" + d.first_name + " " + d.last_name +
                        "</span><p>" + d.position + "</p>" +
                        "Department: " + d.faculty2 +
                        "<br>MIRA projects (pull projects)<br>" +
                        '<br><a href= "https://mira.mcmaster.ca/team/bio/' +
                        d.first_name.toLowerCase() + '-' + d.last_name.toLowerCase() +
                        '" target="_blank">View Profile Page' +
                        "</a>")
                        .style("left", (d3.event.pageX + 10) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");

                }

            })


        active.append("text").text(function (d) {
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

        d3.selectAll("circle").raise()
    }


    function draw_lines(macid) {
        d3.selectAll(".coauthor_line").remove();  // remove former lines
        coauthor_origin = macid;  //set global coauthor variable

        for (i = 0; i < coauthor_network[macid].length; i++) {
            if (coauthor_network[macid][i] in dots) {
                if (active_faculty == "All" || active_faculty == dots[coauthor_network[macid][i]].faculty2) {
                    const end = dots[coauthor_network[macid][i]]

                    gData_object = gData.filter(function (d) {
                        if (d.macid == end.macid) {
                            return true
                        } else {
                            return false
                        }
                    })

                    gData_object.append("line")
                        .attr("x1", function (d) {
                            return x(dots[macid].x_value);  // x position of the first end of the line
                        })
                        .attr("y1", function (d) {
                            return y(dots[macid].y_value);  // y position of the first end of the line
                        })
                        .attr("x2", x(end.x_value))     // x position of the second end of the line
                        .attr("y2", y(end.y_value))    // y position of the second end of the line
                        .attr("stroke-width", 4)
                        .attr("stroke", "black")
                        .attr("class", "coauthor_line");

                    /*
                    gData_object.append("line")
                        .attr("x1", 200) // x position of the first end of the line

                        .attr("y1", 200)

                        .attr("x2", 100)     // x position of the second end of the line
                        .attr("y2", 100)    // y position of the second end of the line
                        .attr("stroke-width", 4)
                        .attr("stroke", "black");
*/
                }
            }
        }
        d3.selectAll("circle").raise()
        d3.select("[id=" + macid + "]").raise()
    }

    $('#collapseFilter').on('show.bs.collapse', function () {
        $('.filters a').addClass('active');
    });

    $('#collapseFilter').on('hide.bs.collapse', function () {
        $('.filters a').removeClass('active');
    });
}


visuals() // initialization
window.onresize = function invoke_visuals() {visuals()}  // redraw to fit window