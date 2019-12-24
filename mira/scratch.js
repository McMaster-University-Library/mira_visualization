

                gData_object.append("axis")
                    .attr("x1", x)
                    .attr("y1", y)
                    .attr("x2", x)
                    .attr("y2", y)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");




                function draw_lines(macid) {
                    d3.selectAll("line").remove();  // remove former lines

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
                                    .attr("stroke", "black");
                            }
