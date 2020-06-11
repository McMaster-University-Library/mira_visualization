/*
  JavaScript to create visualization - accessible version
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
        for (let i = 0; i < data.length; i++) {
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
    url = "/visualizationData?vis=coauthorship&uri=https%3A%2F%2Fvivovis.mcmaster.ca%2Findividual%2F" + member_macid + "&vis_mode=coauthor_network_download"
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

    d3.selectAll(".dataGroup").remove()  // remove former cards

    var availWidth = window.innerWidth - margin.left - margin.right;
    var availHeight = window.innerHeight - margin.top - margin.bottom;

    const textsvg = d3.select("#miraVis");
    const g = textsvg.append("div").attr('class','row');


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

        const gDots = g.selectAll("dataGroup").data(mira_members);
        gData = gDots.enter().append('div')

        // Event listener for faculty filter
        d3.selectAll("#facultyFilter button").on("click", function (d) {
            var faculty = d3.select(this).text().replace(/[^a-zA-Z ]/g, "")
            d3.selectAll('#facultyFilter button').classed('active',false)
            d3.select(this).classed('active', true)
            d3.select('#projectInfo div').remove();
            d3.select('#projectInfo').classed('active',false);
            // run the update function with this selected option
            faculty_filter(faculty)
          //  draw_lines(coauthor_origin)
        })

        // Event listener for project filter
        d3.selectAll(".triggerProjectFilter").on("click", function (d) {
            var projectId=  this.getAttribute('data-project-filter');
            //faculty_filter(active_faculty)  // select dots belonging to any faculty
            d3.selectAll('#facultyFilter button').classed('active',false);
            d3.selectAll('#projectFilter button').classed('active',false);
            d3.select(this).classed('active', true);
            d3.selectAll('#facultyFilter button .All').classed('active', true);
            if (projectId=='All') {
                d3.select('#projectInfo div').remove();
                d3.select('#projectInfo').classed('active',false);
                faculty_filter('All');
            } else {
                project_filter(projectId);
            }
        })

        // Initial start up
        faculty_filter(active_faculty)
    });

    function getCoauthors(macid) {
        d3.select('#'+macid+' .coauthors').html(function (d) {
            var coauthorContents='';
            var coMacid='';
            var printHeader=true;
            for (let i = 0; i < coauthor_network[macid].length; i++) {
                coMacid=coauthor_network[macid][i];
                if (mira_members_data_pull[coMacid]!=undefined && i>0) {
                    if (printHeader) {
                        coauthorContents+="<strong>Co-authors with</strong><br>";
                        printHeader=false;
                    }
                    coauthorContents+=mira_members_data_pull[coMacid].first_name+' '+mira_members_data_pull[coMacid].last_name+' from Faculty of '+mira_members_data_pull[coMacid].primary_faculty+"<br>";
                }
            }
            return coauthorContents;
        });

        return coauthor_network[macid];
    }

    function faculty_filter(faculty) {

        d3.selectAll(".dataGroup:empty").attr('style', 'display: block;');
        d3.selectAll(".dotText").remove();  //Remove previous names
        active_faculty = faculty  //Set active faculty global var
        active = gData.filter(function (d) {
            if (faculty == "All" || d["faculty2"] == faculty || d.macid == coauthor_origin) {
                return true
            } else {
                return false
            }
        })


            .attr("id", function (d) {
                return d.macid;
            })
            .attr("class", "dataGroup card card-shadow col-md-4 mx-auto")
            .on("click", function (d) {
                getCoauthors(this.id);
            });


        active.append("div").html(function (d) {
            var htmlcontents="<h2><a href='#collapseFilter"+d.macid+"' class='collapsed' data-toggle='collapse' aria-expanded='false' aria-controls='collapseFilter"+d.macid+"'>"+d.first_name+" "+d.last_name+
                "</a></h2>, Faculty of "+d.faculty2+"<br>Research output is ";
            if (d.y_value>100) {
                htmlcontents+="Policy"
            } else {
                htmlcontents+="Product or Service"
            }
            htmlcontents+=".<br> Research type is ";
            if (d.x_value<100) {
                htmlcontents += "Practice & Application"
            } else {
                htmlcontents += "Theory & Discovery"
            }
            htmlcontents+=".<br><div id='collapseFilter"+d.macid+"' class='collapse'>"+
                "<div class='coauthors mt-2'></div>";

            htmlcontents+='<br><a href= "https://mira.mcmaster.ca/team/bio/' +
                d.first_name.toLowerCase() + '-' + d.last_name.toLowerCase() +
                '" target="_blank">View Profile Page' +
                "</a></div>";

            return htmlcontents;
        })
            .attr("class", function (d) {
                return "dotText " + d.primary_faculty;
            });

        d3.selectAll('.dataGroup:empty').attr('style','display: none;')
    }

    function project_filter(projectId) {
        d3.selectAll(".dataGroup:empty").attr('style', 'display: block;');
        d3.selectAll(".dotText").remove();  // Remove previous names
        d3.select('#projectInfo div').remove();
        d3.select('#projectInfo').classed('active',true);
        pg_members = pg[projectId]["members"]
        pg_pi = pg[projectId]["pi"]

        active = gData.filter(function (d) {
            if (pg_members.includes(d.macid)) {
                return true
            } else {
                return false
            }
        });

        d3.select('#projectInfo').append("div").html(function (d) {
            var projectInfo="";
            projectInfo+="<strong>Selected project/grant: "+pg[projectId].blurb_title+"</strong>";
            projectInfo+="<p>"+pg[projectId].blurb+"</p>";
            return projectInfo;
        });


        active.append("div").attr('class','dotText').html(function (d) {
            var htmlcontents="<h2><a href='#collapseFilter"+d.macid+"' class='collapsed' data-toggle='collapse' aria-expanded='false' aria-controls='collapseFilter"+d.macid+"'>"+d.first_name+" "+d.last_name+
                "</a></h2>, Faculty of "+d.faculty2;

            if (pg_pi.includes(d.macid)){
                htmlcontents+=" <strong>PI</strong>";
            }

            htmlcontents+="<br>Research output is ";
            if (d.y_value>100) {
                htmlcontents+="Policy"
            } else {
                htmlcontents+="Product or Service"
            }
            htmlcontents+=".<br> Research type is ";
            if (d.x_value<100) {
                htmlcontents += "Practice & Application"
            } else {
                htmlcontents += "Theory & Discovery"
            }

            htmlcontents+=".<br><div id='collapseFilter"+d.macid+"' class='collapse'>"+
                "<div class='coauthors mt-2'></div>"+
                '<br><a href= "https://mira.mcmaster.ca/team/bio/' +
                d.first_name.toLowerCase() + '-' + d.last_name.toLowerCase() +
                '" target="_blank">View Profile Page' +
                "</a></div>";

            return htmlcontents;
        })

        d3.selectAll('.dataGroup:empty').attr('style','display: none;')

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
