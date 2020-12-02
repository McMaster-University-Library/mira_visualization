/*
  JavaScript to create visualization
  Developed by David Bai and Debbie Lawlor, McMaster University Library
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global Vars and API Calls
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const margin = {top: 2, right: 2, bottom: 1, left: 2};

// API CALL "/mira_members.json"
// returns list of dict representing each member in mira. Key in each dict shown below.
// keys: "email", "first_name", "last_name", "macid", "mira_bio_url", "position", "primary_faculty", "x_value", "y_value"

// API CALL "/pg,json"
// returns dict of projects/grants, key = id of project, val= {"members":[], "pi":[], "blurb_title:"", "blurb":""}
var pg = pg || {}
d3.json("shared_assets/pg.json").then(function(data){
   pg.json = data
})

// API CALL "/coauthornetwork.json"
// returns dict. Key: macid val: list of coauthor macids (list of macids include the original author as well).
var coauthor_network = coauthor_network || {}
d3.json("shared_assets/coauthor_network.json").then(function(data){
   coauthor_network.json = data
})


// Other Variables used in D3 Visualization
var dots = {}  // key: macid val: dataGroup (for the dot)
var gData = [] //list of dict keys: "email", "first_name", "last_name", "macid", "mira_bio_url", "position", "primary_faculty", "x_value", "y_value"
var coauthor_origin = ""  // Keeps track of the point the user clicked on last
var active_faculty = "All"  // Keeps track of the faculty the user clicked on last
var active_project = false  // Keeps track of the project the user clicked on last


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Project grant filter initialization
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
d3.json("shared_assets/levels.json").then(function(levels){
    // levels = {} holds all the levels information key=level val=dict of next levels or concatenated id
    generateProjectFilters(levels);
})


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
    d3.select('#collapseFilter').attr('style','max-height: '+(+window.innerHeight - margin.top - margin.bottom-100)+'px;');
}


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
        .attr("transform", "translate(" + x.range()[1] / 2 + "," + (domainHeight - 29) + ")")
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle")
        .text("PRODUCT or SERVICE"),

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0)
        .attr("x", -domainHeight / 2)
        .attr("dy", "0.95em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle leftTitle")
        .text("PRACTICE & APPLICATION");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", (domainWidth - 29))
        .attr("x", -domainHeight / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .attr("class", "axisTitle rightTitle")
        .text("THEORY & DISCOVERY");

    // horizontal axis
    g.append("line")
        .attr("transform", "rotate(-90)")
        .attr("x1", d3.select(".rightTitle").attr('x')) // x position of the first end of the line
        .attr("y1", d3.select(".rightTitle").attr('y'))
        .attr("x2", d3.select(".leftTitle").attr('x')) // x position of the first end of the line
        .attr("y2", d3.select(".leftTitle").attr('y') + 27)
        .attr("stroke-width", 3)
        .attr("stroke", "black")
        .attr("opacity", ".7")

    // Vertical axis
    g.append("line")
        .attr("x1", domainWidth / 2) // x position of the first end of the line
        .attr("y1", 28)
        .attr("x2", domainWidth / 2) // x position of the first end of the line
        .attr("y2", domainHeight - 27)
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

    d3.json("shared_assets/mira_members.json").then(function (mira_members) {

        // dots is a global variable documented at the top
        mira_members.forEach(function (d) {
            dots[d.macid] = d
        })

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
            d3.selectAll('#projectFilter button').classed('active', false);
            d3.selectAll('#facultyFilter button').classed('active', false);
            d3.select(this).classed('active', true);
            d3.selectAll('#facultyFilter .All').classed('active', true);
            if (projectId=='All') {
                faculty_filter('All');
            } else {
                project_filter(projectId);
            }
        })

        // Event listener for coauthor lines
        d3.selectAll(".dataGroup").on("click", function (d) {
            draw_lines(this.id)
            if (active_project != false){
                project_filter(active_project)
            } else {
                faculty_filter(active_faculty)
            }
        })

        // Event listener to remove coauthor lines and tooltips when clicking on canvas
        d3.select("#miraVis").on("click", function (e) {

            if (event.target.tagName != "circle") {
                coauthor_origin = ""

                d3.selectAll(".coauthor_line").remove()
                d3.selectAll(".tooltip").remove()

                if (active_project != false){
                    project_filter(active_project)
                } else {
                    faculty_filter(active_faculty)
                }

            }
        })
        
        // Initial start up
        if (active_project != false){
            project_filter(active_project)
        } else {
            faculty_filter(active_faculty)
        }
        draw_lines(coauthor_origin)
    });


    function faculty_filter(faculty) {
        active_project = false
        active_faculty = faculty  //Set active faculty global var
        d3.selectAll("circle").remove();  // Remove previous points
        d3.selectAll(".dotText").remove();  // Remove previous names

        const projectKeys=Object.keys(pg.json); // get all project keys

        // function is used to pull a listing of researcher's projects to be displayed in modal window
        function memberProjects(projectKeys, macid) {
            let memberProjectsText="";
            for (projectKey in projectKeys) {
                var keyvalue=projectKeys[projectKey];
                if (pg.json[keyvalue]['members'].includes(macid)) {
                    memberProjectsText+="<div class='pb-2'>"+pg.json[keyvalue]['blurb_title']+"</div>";
                }
            }
            return memberProjectsText;
        }

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
                        .duration(400)
                        .style("opacity", .95);
                    tooltip.html(
                        "<span class='tooltipName'>" + d.first_name + " " + d.last_name +
                        "</span><button class='pull-right' onclick='d3.selectAll(\".tooltip\").remove();'><span class='glyphicon glyphicon-remove' aria-hidden='true'><span class='sr-only'>Close</span></span></button>" +
                        "<p>Faculty: " + d.faculty2 +
                        '</p><div class="memberprojects m-2"><strong>Projects</strong><br>'+ memberProjects(projectKeys, d.macid)+'</div>'+
                        '<a href="'+d.mira_bio_url+'" target="_blank">View Profile Page' +
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
        d3.selectAll(".coauthor_line").remove();  // remove former lines
        coauthor_origin = ""

        pg_members = pg.json[projectId]["members"]
        pg_pi = pg.json[projectId]["pi"]

        var projectInfo="<strong>"+pg.json[projectId].blurb_title+"</strong>"+
            "<p>"+pg.json[projectId].blurb+"</p>";

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
                        "<p>Faculty: " + d.faculty2 +
                        "</p><div class='p-2' id='projectInfo'>" + projectInfo +
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

        try{
            for (i = 0; i < coauthor_network.json[macid].length; i++) {
                if (coauthor_network.json[macid][i] in dots) {
                    if (active_faculty == "All" || active_faculty == dots[coauthor_network.json[macid][i]].faculty2) {
                        const end = dots[coauthor_network.json[macid][i]]

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
        }catch(e){
           // console.log('coauthor_network.json[macid] is undefined at start-up');
        }

        d3.selectAll("circle").raise()
        if (macid!=='') {
            d3.select("#" + macid).raise()
        }
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
setTimeout(function(){visuals()}, 500)


window.onresize = function invoke_visuals() {visuals()}  // redraw to fit window
