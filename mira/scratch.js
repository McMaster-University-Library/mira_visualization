

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
        })
        .attr("class","dataGroup");

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