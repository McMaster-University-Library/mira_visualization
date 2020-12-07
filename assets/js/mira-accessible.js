/*
  JavaScript to create visualization -accessible version
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
var pg = pg || {};
d3.json("shared_assets/pg.json").then(function(data){
  pg.json = data
});

// API CALL "/coauthornetwork.json"
// returns dict. Key: macid val: list of coauthor macids (list of macids include the original author as well).
var coauthor_network = coauthor_network || {};
d3.json("shared_assets/coauthor_network.json").then(function(data){
  coauthor_network.json = data
});

// Other Variables used in D3 Visualization
var dots = {};  // key: macid val: dataGroup (for the dot)
var gData = []; //list of dict keys: "email", "first_name", "last_name", "macid", "mira_bio_url", "position", "primary_faculty", "x_value", "y_value"
var coauthor_origin = "";  // Keeps track of the point the user clicked on last
var active_faculty = "All"; // Keeps track of the faculty the user clicked on last
var active_project = false;  // Keeps track of the project the user clicked on last

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Project grant filter initialization
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
d3.json("shared_assets/levels.json").then(function(levels){
    // levels = {} holds all the levels information key=level val=dict of next levels or concatenated id
    generateProjectFilters(levels);
});

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

  d3.selectAll(".dataGroup").remove();  // remove former cards

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

  d3.json("shared_assets/mira_members.json").then(function (mira_members) {
    // dots is a global variable documented at the top
    mira_members.forEach(function (d) {
      dots[d.macid] = d
    });

    const gDots = g.selectAll("g.dot").data(mira_members);
    gData = gDots.enter().append('div');

    // Event listener for faculty filter
    d3.selectAll("#facultyFilter button").on("click", function (d) {
      var faculty = d3.select(this).text().replace(/[^a-zA-Z ]/g, "");
      d3.selectAll('#facultyFilter button').classed('active',false);
      d3.select(this).classed('active', true);
      d3.select('#projectInfo div').remove();
      d3.select('#projectInfo').classed('active',false);
      // run the update function with this selected option
      faculty_filter(faculty)
    });

    // Event listener for project filter
    d3.selectAll(".triggerProjectFilter").on("click", function (d) {
      var projectId=  this.getAttribute('data-project-filter');
      //faculty_filter(active_faculty)  // select dots belonging to any faculty
      d3.selectAll('#facultyFilter button').classed('active',false);
      d3.selectAll('#projectFilter button').classed('active',false);
      d3.select(this).classed('active', true);
      d3.selectAll('#facultyFilter button .All').classed('active', true);
      if (projectId==='All') {
        d3.select('#projectInfo div').remove();
        d3.select('#projectInfo').classed('active',false);
        faculty_filter('All');
      } else {
        project_filter(projectId);
      }
    });

    // Initial start up
    faculty_filter(active_faculty)
  });

  function getCoauthors(macid) {
    d3.select('#'+macid+' .coauthors').html(function (d) {
      var coauthorContents='';
      var coMacid='';
      var printHeader=true;

      try{
        for (i = 0; i < coauthor_network.json[macid].length; i++) {
          coMacid = coauthor_network.json[macid][i];
          if (dots[coMacid] !== undefined && i > 0) {
            if (printHeader) {
              coauthorContents += "<strong>Co-authors with</strong><br>";
              printHeader = false;
            }
            coauthorContents += dots[coMacid].first_name + " " + dots[coMacid].last_name + " from " + dots[coMacid].primary_faculty + "<br>";
          }
        }
      }catch(e){
        // console.log('error');
      }
      return coauthorContents;
    });
  }

  function getMemberProjects(macid) {
    const projectKeys=Object.keys(pg.json); // get all project key
    d3.select('#'+macid+' .memberprojects').html(function (d) {
      var printHeader=true;
      var memberProjectsText='';
      try{
        for (projectKey in projectKeys) {
          var keyvalue=projectKeys[projectKey];
          if (pg.json[keyvalue]['members'].includes(macid)) {
            if (printHeader) {
              memberProjectsText += "<strong>Projects</strong><br>";
              printHeader = false;
             }
             memberProjectsText+="<div class='pb-2'>"+pg.json[keyvalue]['blurb_title']+"</div>";
          }
        }
      }catch(e){
           // console.log('coauthor_network.json[macid] is undefined at start-up');
      }
      return memberProjectsText;
    });
  }

  function faculty_filter(faculty) {
    d3.selectAll(".dataGroup:empty").attr('style', 'display: block;');
    d3.selectAll(".dotText").remove();  //Remove previous names
    active_faculty = faculty;  //Set active faculty global var
    active = gData.filter(function (d) {
      if (faculty == "All" || d["faculty2"] == faculty || d.macid == coauthor_origin) {
        return true;
      } else {
        return false;
      }
    })

    .attr("id", function (d) {
      return d.macid;
    })
    .attr("class", "dataGroup card card-shadow col-md-4 mx-auto").on("click", function (d) {
      getCoauthors(this.id);
      getMemberProjects(this.id);
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

      htmlcontents+="<div class='memberprojects mt-2'></div>";
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
    pg_members = pg.json[projectId]["members"];
    pg_pi = pg.json[projectId]["pi"];

    active = gData.filter(function (d) {
      return pg_members.includes(d.macid);
    });

    d3.select('#projectInfo').append("div").html(function (d) {
      var projectInfo="";
      projectInfo+="<strong>Selected project/grant: "+pg.json[projectId]['blurb_title']+"</strong>";
      projectInfo+="<p>"+pg.json[projectId].blurb+"</p>";
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
        "<div class='memberprojects mt-2'></div>"+
        '<br><a href= "https://mira.mcmaster.ca/team/bio/' +
        d.first_name.toLowerCase() + '-' + d.last_name.toLowerCase() +
        '" target="_blank">View Profile Page' +
        "</a></div>";

        return htmlcontents;
    });

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
setTimeout(function(){visuals()}, 500); // initialization
