/*
  JavaScript to create visualization
  Developed by David Bai and Debbie Lawlor, McMaster University Library
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global Vars
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const mira_members_csv = "mira_members.csv"
const project_grants_csv = "project_grant.csv"
const margin = {top: 0, right: 0, bottom: 0, left: 0};
var mira_members_data_pull = {} // key: macid val: dict(key: csv file attribute, val: attribute value)
var faculty_members = {}  // key: faculty val: list of macid
var coauthor_network = {}  // key: macid val: list of coauthor macid
var dots = {}  // key: macid val: dataGroup (for the dot)
var gData = []
var coauthor_origin = ""
var active_faculty = "All"
var active_project = false
var levels = {}  // holds all the levels information key=level val=dict of next levels or concatenated id
var pg = {}  // project and grant data, key = id of project, val= {"members":[], "pi":[], "blurb_title:"", "blurb":""}
var current_levels = 1


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Pulling co-author and Project/Grant Data
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function get_mira_data(){

    // member data
    d3.csv(mira_members_csv).then(function(data){
        for (i = 0; i < data.length; i++){
            get_coauthor_xml(data[i]["macid"])
            mira_members_data_pull[data[i]["macid"]] = data[i]

            // initializing faculty list if it isn't there already
            faculty_members[data[i]["primary_faculty"]] = faculty_members[data[i]["primary_faculty"]] || [];
            faculty_members[data[i]["primary_faculty"]].push(data[i]["macid"])
        }
    })


    //project grant data
    d3.csv(project_grants_csv).then(function(data){

        for (i = 0; i < data.length; i++) {
            const row = data[i]
            const key = row["level1"] + row["level2"] + row["level3"]

            // filling the levels variable
            levels[row["level1"]] = typeof(levels[row["level1"]]) === 'undefined' ? {} : levels[row["level1"]];

            // If level ends at level1
            if (row["level2"].length == 0) {
                levels[row["level1"]] = key
            } else { // proceed to levels 2 and 3
                cur_item = levels[row["level1"]][row["level2"]]
                levels[row["level1"]][row["level2"]] = typeof(cur_item) === 'undefined' ? {} : cur_item;
            }

            // If level ends at level2
            if (row["level3"].length == 0) {
                levels[row["level1"]][row["level2"]] = key
            } else { // proceed to level3
                cur_item = levels[row["level1"]][row["level2"]][row["level3"]]
                levels[row["level1"]][row["level2"]][row["level3"]] = typeof(cur_item) === 'undefined' ? {} : cur_item;
            }

            // If level ends at level3
            if (row["level3"].length > 0) {
                levels[row["level1"]][row["level2"]][row["level3"]] = key
            }


            // filling the project grants variable (pg)
            var base = {"members": [], "pi": [], "blurb_title":"", "blurb":""}
            pg[key] = typeof(pg[key]) === 'undefined' ? base : pg[key];
            pg[key]["members"].push(row["macid"])

            if (row["pi"] == "TRUE"){
                pg[key]["pi"].push(row["macid"])
            }

            if (row["blurb_title"].length > pg[key]["blurb_title"].length){
                pg[key]["blurb_title"] = row["blurb_title"]
            }

            if (row["blurb"].length > pg[key]["blurb"].length){
                pg[key]["blurb"] = row["blurb"]
            }
        }
        generateProjectFilters(levels);

    })
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

function generateProjectFilters(levels) {
    const pf=d3.select('#projectFilter');
    let pc1=0;
    Object.keys(levels).forEach(function (level1) {
        if (typeof levels[level1] === 'object' && level1 !== null) {
            // Level 1 contains a second level
            pf.append("button").attr('class', 'projectFilter level1 collapsed').attr('id', 'button'+pc1).attr('data-toggle','collapse').attr('href','#collapsePLevel1'+pc1).attr('aria-expanded','false').attr('aria-controls','collapsePLevel1'+pc1).text(level1);
            pf.append("div").attr('class', 'collapse').attr('id', 'collapsePLevel1'+pc1);
            let pc2=0;
            let pfLevel1=d3.select('#collapsePLevel1'+pc1);
            Object.keys(levels[level1]).forEach(function (level2) {
                if (typeof levels[level1][level2] === 'object' && levels[level1][level2] !== null) {
                    //Level 2 contains a third level
                    pfLevel1.append("button").attr('class', 'projectFilter level2 collapsed').attr('id', 'button'+pc2).attr('data-toggle','collapse').attr('href','#collapsePLevel2'+pc2).attr('aria-expanded','false').attr('aria-controls','collapsePLevel2'+pc2).text(level2);
                    pfLevel1.append("div").attr('class', 'collapse').attr('id', 'collapsePLevel2'+pc2);
                    Object.keys(levels[level1][level2]).forEach(function (level3) {
                        d3.select('#collapsePLevel2'+pc2).append("button").attr('class', 'projectFilter level3 triggerProjectFilter').attr('data-project-filter',levels[level1][level2][level3]).text(level3);
                    });
                } else {
                    //Level 2 does not contain a third level
                    pfLevel1.append("button").attr('class', 'projectFilter level2 triggerProjectFilter').attr('data-project-filter',levels[level1][level2]).text(level2);
                }
                pc2++;
            });
        } else {
            // Level 1 doesn't contain further levels
            pf.append("button").attr('class', 'projectFilter level1 triggerProjectFilter').attr('data-project-filter',levels[level1]).text(level1);
        }
        pc1++;
    });
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
    const zoom=d3.zoom()
        .scaleExtent([1, 40])
        //  .translateExtent([[-margin.left, -margin.top], [width, height]])
        .translateExtent([[-margin.left, -margin.top], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    function zoomed() {
        var transform = d3.event.transform;
        g.attr("transform", transform);
    }

    svg.call(zoom);

    d3.select("#zoomIn").on("click", function() {
        svg.transition().call(zoom.scaleBy, 1.5);
    });

    d3.select("#zoomOut").on("click", function() {
        svg.transition().call(zoom.scaleBy, 0.5);
    });

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
        .attr("y2", d3.select(".leftTitle").attr('y') + 27)
        .attr("stroke-width", 3)
        .attr("stroke", "black")
        .attr("opacity", ".7")

    g.append("line")
        .attr("x1", domainWidth / 2) // x position of the first end of the line
        .attr("y1", 28)
        .attr("x2", domainWidth / 2) // x position of the first end of the line
        .attr("y2", domainHeight - 23)
        .attr("stroke-width", 3)
        .attr("stroke", "black")
        .attr("opacity", ".7")


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


    d3.csv(mira_members_csv).then(function (mira_members) {
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

            var faculty = d3.select(this).text().replace(/[^a-zA-Z ]/g, "")

            d3.selectAll('#projectFilter button').classed('active',false)
            d3.selectAll('#facultyFilter button').classed('active',false)
            d3.select(this).classed('active', true)

            active_project = false

            // run the update function with this selected option
            faculty_filter(faculty)
            draw_lines(coauthor_origin)
        })

        // Event listener for project filter
        d3.selectAll(".triggerProjectFilter").on("click", function (d) {
            var projectId = this.getAttribute('data-project-filter');

            d3.selectAll('#projectFilter button').classed('active', false)
            d3.selectAll('#facultyFilter button').classed('active', false)
            d3.select(this).classed('active', true)

            project_filter(projectId)

        })

        // Event listener for coauthor lines
        d3.selectAll(".dataGroup").on("click", function (d) {
            draw_lines(this.id)
            faculty_filter(active_faculty)

        })

        // Event listener to remove coauthor lines and tooltips when clicking on canvas
        d3.select("#miraVis").on("click", function (e) {

            console.log("123123123123")
            if (event.target.tagName != "circle") {
                coauthor_origin = ""

                d3.selectAll(".coauthor_line").remove()
                d3.selectAll(".tooltip").remove()
                console.log("123123")

                if (active_project != false){
                    project_filter(active_project)
                } else {
                    faculty_filter(active_faculty)
                }

            }
        })

        // Initial start up
        faculty_filter(active_faculty)
        draw_lines(coauthor_origin)

    });


    function faculty_filter(faculty) {

        active_faculty = faculty  //Set active faculty global var
        d3.selectAll("circle").remove();  // Remove previous points
        d3.selectAll(".dotText").remove();  // Remove previous names

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
                        .style("opacity", 0);


                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(
                        "<span class='tooltipName'>" + d.first_name + " " + d.last_name +
                        "</span><button class='pull-right' onclick='d3.selectAll(\".tooltip\").remove();'><span class='glyphicon glyphicon-remove' aria-hidden='true'><span class='sr-only'>Close</span></span></button>" +
                        "<p>" + d.position + "</p>" +
                        "Department: " + d.faculty2 +
                        '<br><a href="'+d.mira_bio_url+'" target="_blank">View Profile Page' +
                        "</a>")
                        .style("left", function () {
                            var eventX=d3.event.pageX
                            var tooltipWidth=this.offsetWidth
                            if (eventX + tooltipWidth > availWidth) {
                                return (eventX - tooltipWidth)+"px";
                            } else {
                                return (eventX + 10)+"px";
                            }
                        })
                        .style("top", function () {
                            var eventY=d3.event.pageY
                            var tooltipHeight=this.offsetHeight
                            if (eventY + tooltipHeight > availHeight) {
                                return (eventY - tooltipHeight)+"px";
                            } else {
                                return (eventY - 28)+"px";
                            }
                        });

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


    function project_filter(projectId) {

        active_project = projectId  //Set active project global var
        d3.selectAll("circle").remove();  // Remove previous points
        d3.selectAll(".dotText").remove();  // Remove previous names

        pg_members = pg[projectId]["members"]
        pg_pi = pg[projectId]["pi"]

        var projectInfo="<strong>"+pg[projectId].blurb_title+"</strong>"+
            "<p>"+pg[projectId].blurb+"</p>";

        active = gData.filter(function (d) {
            if (pg_members.includes(d.macid)) {
                return true
            } else {
                return false
            }
        })

        active.append("circle")
            .attr("class", function (d) {
                return "dot " + d.primary_faculty;
            })
            .attr("r", function (d) {
                if (pg_pi.includes(d.macid)){
                    return "9"
                } else {
                    return "7"}
            })
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
                        .style("opacity", 0);


                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(
                        "<span class='tooltipName'>" + d.first_name + " " + d.last_name +
                        "</span><button class='pull-right' onclick='d3.selectAll(\".tooltip\").remove();'><span class='glyphicon glyphicon-remove' aria-hidden='true'><span class='sr-only'>Close</span></span></button>" +
                        "<p>" + d.position + "</p>" +
                        "Department: " + d.faculty2 +
                        "<div class='p-2' id='projectInfo'>" + "<strong>Selected MIRA project/grant</strong><br>" + projectInfo +
                        '</div><a href="'+d.mira_bio_url+'" target="_blank">View Profile Page' +
                        "</a>")
                        .style("left", function () {
                            var eventX=d3.event.pageX
                            var tooltipWidth=this.offsetWidth
                            if (eventX + tooltipWidth > availWidth) {
                                return (eventX - tooltipWidth)+"px";
                            } else {
                                return (eventX + 10)+"px";
                            }
                        })
                        .style("top", function () {
                            var eventY=d3.event.pageY
                            var tooltipHeight=this.offsetHeight
                            if (eventY + tooltipHeight > availHeight) {
                                return (eventY - tooltipHeight)+"px";
                            } else {
                                return (eventY - 28)+"px";
                            }
                        });

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
                        .attr("stroke-width", 2)
                        .attr("stroke", "#5e6a71")
                        .attr("class", "coauthor_line");

                }
            }
        }
        d3.selectAll("circle").raise()
        d3.select("[id=" + macid + "]").raise()
    }


    $('#collapseFilter').on('show.bs.collapse', function (e) {
        // Line below to prevent main filters button arrows changing when a collapsed project filter is selected
        if(e.target != this) return;
        $('.filters a').addClass('active');
    });

    $('#collapseFilter').on('hide.bs.collapse', function (e) {
        if(e.target != this) return;
        $('.filters a').removeClass('active');
    });

    $("div[id='projectFilter'] div").on('show.bs.collapse', function () {
      $(this).prevAll("button").first().addClass('active');
    });

    $("div[id^='projectFilter'] div").on('hide.bs.collapse', function () {
        $(this).prevAll("button").first().removeClass('active');
    });

}

visuals() // initialization

window.onresize = function invoke_visuals() {visuals()}  // redraw to fit window