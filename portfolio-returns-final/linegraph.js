// Constants
var CAP_WEIGHT = 'cap-weight';
var ROLLING_RETS = 'rolling-rets';
var ROLLING_VOL = 'rolling-vol';
var SIZE = '-size';
var VALUE = '-value';
var ALL = 'all';
var CAP_WEIGHT_SIZE = CAP_WEIGHT + SIZE;
var CAP_WEIGHT_VALUE = CAP_WEIGHT + VALUE;
var ROLLING_RETS_SIZE = ROLLING_RETS + SIZE;
var ROLLING_RETS_VALUE = ROLLING_RETS + VALUE;
var ROLLING_VOL_SIZE = ROLLING_VOL + SIZE;
var ROLLING_VOL_VALUE = ROLLING_VOL + VALUE;
var KEYS = [CAP_WEIGHT,ROLLING_RETS,ROLLING_VOL];
var MAX_INT = 9007199254740992;
var WIDTH = 700, HEIGHT = 320;
var LEFT_PADDING = 20;
var X_AXIS_LABEL = 'Volatility', Y_AXIS_LABEL = 'Return';
var DEFAULT_DATE = "192806";
var DEFAULT_YEAR = 1928;
var DEFAULT_MONTH = 6;
var DEFAULT_INTERVAL = 50;
var MAX_YEAR = 2015;
var MAX_MONTH = 1;
var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
var DATA_COLORS = [["#FF6961", "#FF0800", "#E34234", "#CC0000", "#A40000"],
              ["#FFB347", "#FFA700", "#FF8C00", "#FF6700", "#CC5500"],
              ["#FDFD96", "#FFFF00", "#FFEF00", "#FFDF00", "#ECD540"],
              ["#77DD77", "#85BB65", "#03C03C", "#138808", "#556B2F"],
              ["#92A1CF", "#0000FF", "#002FA7", "#00009C", "#00008B"]];
var QUINTILE_SIZE_COLORS = ["#FF0000", "#FFA500", "#FFFF00", "#00FF00", "#0000FF"]
var QUINTILE_VALUE_COLORS = [DATA_COLORS[0][0],DATA_COLORS[0][1],DATA_COLORS[0][2],DATA_COLORS[0][3],DATA_COLORS[0][4]];

// Global Variables
var domains;
var graphData = {};
var quintileData = {};
var xScale, yScale;
var currentDate = DEFAULT_DATE;
var currentYear = DEFAULT_YEAR;
var currentMonth = DEFAULT_MONTH;
var currentMode = SIZE;
var svg;
var circleQuintileScale;
var dateSlider;
var numberOfPlayClicks = 0;
var timer = null;
var omittedQuintiles = [];
var addedData = [];
var isPlaying = false;

// Load the data, parse it, and save it for later use. Then, draw our chart and fill it.
d3.csv("data/cap-wt.csv", function(error, capdata) {
  d3.csv("data/rolling-rets.csv", function(error,retdata) {
    d3.csv("data/rolling-vol.csv", function(error,voldata) {
      // Recover our non-quintile data.
      for (var i = 0; i < capdata.length; i++) {
        graphData[capdata[i].date] = recoverData(capdata[i],retdata[i],voldata[i]);
      }
      // Load the quintile data, parse it, and save it for later use.
      d3.csv("data/cap-wt-size-quintiles.csv", function(error,capwtsize) {
        d3.csv("data/cap-wt-value-quintiles.csv", function(error,capwtvalue) {
          d3.csv("data/rolling-rets-size-quintiles.csv", function(error,rollingretssize) {
            d3.csv("data/rolling-rets-value-quintiles.csv", function(error,rollingretsvalue) {
              d3.csv("data/rolling-vol-size-quintiles.csv", function(error,rollingvolsize) {
                d3.csv("data/rolling-vol-value-quintiles.csv", function(error,rollingvolvalue) {
                  // Recover our quintile data.
                  for (var i = 0; i < capwtsize.length; i++) {
                    quintileData[capwtsize[i].date] = recoverQuintileData(capwtsize[i],capwtvalue[i],rollingretssize[i],
                                                                         rollingretsvalue[i],rollingvolsize[i],rollingvolvalue[i]);
                  }
                  // Once ALL the data is loaded, add the chart.
                  addChart();
                });
              });
            });
          });
        });
      });
    });
  });
});

// Get the data in the format we need it.
function recoverData(capdata,retdata,voldata) {
  var results = [];
  for (var i = 1; i <= 5; i++) {
    for (var j = 1; j <= 5; j++) {
      var key = "(" + i + "," + j + ")";
      results.push({"x": i, "y": j, "cap-weight": parseFloat(capdata[key]), 
        "rolling-rets": parseFloat(retdata[key]), "rolling-vol": parseFloat(voldata[key])});
    }
  }
  results.sort(compareData);
  return results;
}

// Get the quintile data that we'll need.
function recoverQuintileData(capwtsize,capwtvalue,rollingretssize,rollingretsvalue,rollingvolsize,rollingvolvalue) {
  var results = [];
  for (var i = 1; i <= 5; i++) {
    results.push({"cap-weight-size": parseFloat(capwtsize[i]),"cap-weight-value": parseFloat(capwtvalue[i]),
      "rolling-rets-size": parseFloat(rollingretssize[i]), "rolling-rets-value": parseFloat(rollingretsvalue[i]),
      "rolling-vol-size": parseFloat(rollingvolsize[i]), "rolling-vol-value": parseFloat(rollingvolvalue[i]),
      "x": i});
  }
  results.sort(compareData);
  return results;
}

// Compare two data for cap weight, which is what we sort by, depending on size, value, or all.
function compareData(datum1, datum2) {
  var measure1,measure2;
  if (datum1[CAP_WEIGHT] === undefined) {
    if (currentMode == SIZE) {
      measure1 = parseFloat(datum1[CAP_WEIGHT_SIZE]);
    } else {
      measure1 = parseFloat(datum1[CAP_WEIGHT_VALUE]);
    }
  } else {
    measure1 = parseFloat(datum1[CAP_WEIGHT]);
  }
  if (datum2[CAP_WEIGHT] === undefined) {
    if (currentMode == SIZE) {
      measure2 = parseFloat(datum2[CAP_WEIGHT_SIZE]);
    } else {
      measure2 = parseFloat(datum2[CAP_WEIGHT_VALUE]);
    }
  } else {
    measure2 = parseFloat(datum2[CAP_WEIGHT]);
  }
  return measure2 - measure1;
}

// Filter the data for the value we need, based on whether we're using size or value.
function filterData(data,x){
  var results = [];
  for (var i = 0; i < data.length; i++) {
    if (currentMode == SIZE) {
      if (data[i].x == x) {
        results.push(data[i]);
      }
    } else {
      if (data[i].y == x) {
        results.push(data[i]);
      }
    }
  }
  return results;
}

// Filter the quintiles we want given omitted quintiles
function filterQuintiles() {
  var quintiles = quintileData[currentDate];
  var filtered = [];
  for (var i = 0; i < quintiles.length; i++) {
    var quintile = quintiles[i];
    if (currentMode == SIZE && omittedQuintiles.indexOf(quintile.x) < 0) {
      filtered.push(quintile);
    } else if (currentMode == VALUE && omittedQuintiles.indexOf(quintile.x) < 0) {
      filtered.push(quintile);
    }
  }
  return filtered;
}

// Get the domain for the circle radius for all the data points, using the larger quintile data.
function getQuintileCircleDomain() {
  var max = -1, min = MAX_INT;
  var keys = Object.keys(quintileData);
  for (var i = 0; i < keys.length; i++) {
    var tag = (currentMode == SIZE) ? CAP_WEIGHT_SIZE : CAP_WEIGHT_VALUE;
    var domain = findDomain(quintileData[keys[i]],tag);
    if (domain[0] < min) {
      min = domain[0];
    }
    if (domain[1] > max) {
      max = domain[1];
    }
  }
  return [min,max];
}

// Find the domain for a specific key.
function findDomain(data,key) {
  var max = -1, min = MAX_INT;
  for (var i = 0; i < data.length; i++) {
    if (data[i][key] > max) {
      max = data[i][key];
    }
    if (data[i][key] < min) {
      min = data[i][key];
    }
  }
  return [min,max];
}

// Call our findDomain method across all keys.
function findOverallDomain(key) {
  var max = -1, min = MAX_INT;
  var keys = Object.keys(graphData);
  for (var i = 0; i < keys.length; i++) {
    var domain = findDomain(graphData[keys[i]],key);
    if (domain[0] < min) {
      min = domain[0];
    }
    if (domain[1] > max) {
      max = domain[1];
    }
  }
  return [min,max];
}

// Set the date.
function setDateString() {
  $("#month").text(MONTH_NAMES[currentMonth]);
  $("#year").text(currentYear);
}

// Set our scales (only happens the first time).
function setScales() {
  var xDomain,xRange,yDomain,yRange;
  if (isPlaying) {
    xDomain = findOverallDomain(ROLLING_VOL);
    xRange = xDomain[1] - xDomain[0];
    yDomain = findOverallDomain(ROLLING_RETS);
    yRange = yDomain[1] - yDomain[0]; 
  } else {
    xDomain = findDomain(graphData[currentDate],ROLLING_VOL);
    xRange = xDomain[1] - xDomain[0];
    yDomain = findDomain(graphData[currentDate],ROLLING_RETS);
    yRange = yDomain[1] - yDomain[0];
  }
  xScale = d3.scale.linear()
              .domain([xDomain[0] - (xRange * .1), xDomain[1] + (xRange * .1)])
              .range([0,WIDTH]);
  yScale = d3.scale.linear()
              .domain([yDomain[0] - (yRange * .1), yDomain[1] + (yRange * .1)])
              .range([HEIGHT, 0]);
}

// Add our chart, only called in the beginning.
function addChart() {
  svg = d3.select("#linegraph")
    .append("svg")
    .attr("width", WIDTH+50)
    .attr("height", HEIGHT)
    .attr("class", "graph");

  svg.append('g')
    .attr("class", "chart");

  var circleQuintileDomain = getQuintileCircleDomain();
  circleQuintileScale = d3.scale.sqrt().domain(circleQuintileDomain).range([5,40]);
  setScales();
  addAxes();
  addQuintilePoints();
  addSlider();
  setDateString();
  updateLegend();
}

// Update the chart by redrawing our points and updating scales.
function updateChart() {
  setScales();
  updateAxes();
  addPoints();
}

// Add our slider, which will handle changes in date.
function addSlider() {
  var keys = Object.keys(graphData);
  var minDate = keys[0], maxDate = keys[keys.length-1];
  var minYear = parseInt(minDate.substring(0,4)), minMonth = parseInt(minDate.substring(4,6));
  var maxYear = parseInt(maxDate.substring(0,4)), maxMonth = parseInt(maxDate.substring(4,6));
  dateSlider = d3.slider().scale(d3.time.scale()
    .domain([new Date(minYear,(minMonth-1),1), new Date(maxYear,(maxMonth-1),1)])).axis(d3.svg.axis())
    .value(new Date(DEFAULT_YEAR,DEFAULT_MONTH,1))
    .on("slide", handleSliderChange);
  d3.select('#slider').call(dateSlider);
}

// Function to handle the dragging of our slider.
function handleSliderChange(evt, value) {
  var date = new Date(value);
  var month = date.getMonth();
  var year = date.getFullYear();

  // Only update if it's a new value.
  if (month != currentMonth || year != currentYear) {
    currentMonth = month;
    currentYear = year;
    if ((month+1) >= 10) {
      currentDate = "" + year + (month+1);
    } else {
      currentDate = "" + year + "0" + (month+1);
    }
  }
  setDateString();
  updateChart();
}

// Add the quintile points based on the mode we're in.
function addQuintilePoints() {
  if (currentMode == SIZE) {
    addSizeQuintilePoints();
  } else {
    addValueQuintilePoints();
  }
}

// Add the quintile points for the size, which go along the first row.
function addSizeQuintilePoints() {
  omittedQuintiles = [];
  addedData = [];
  d3.select('svg g.chart').selectAll('circle').remove();
  d3.select('svg g.chart')
    .selectAll('circle')
    .data(quintileData[currentDate])
    .enter()
    .append('circle')
    .attr('class', function(d,i) { return 'circle-' + (d.x); })
    .attr('cx', function(d,i) {
      return xScale(retrieveMeasure(quintileData[currentDate][i],ROLLING_VOL));
    })
    .attr('cy', function(d,i) {
      return yScale(retrieveMeasure(quintileData[currentDate][i],ROLLING_RETS));
    })
    .attr('r', function(d,i) {
      return circleQuintileScale(retrieveMeasure(quintileData[currentDate][i],CAP_WEIGHT));
    })
    .attr('fill', function(d,i) {
      return retrieveColor(quintileData[currentDate][i]);
    })
    .on("mouseover", function(data,i) {
      var div = d3.select("body").append("div")   
     .attr("class", "nvtooltip")               
     .style("opacity", 0);
      div.transition()        
        .duration(200)
        .style("opacity", .9);
      div.html(tooltipHTMLFromData(data))  
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px")
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px");
    })   
    .on("mouseout", function(precinct) {
      d3.selectAll(".nvtooltip").remove();
    })
    .on('click', function(d,i) {
      addDetailPoint(d.x);
    });
  $('#resetbutton').hide();
}

// Add the quintile points for the value, which go along the first column.
function addValueQuintilePoints() {
  omittedQuintiles = [];
  addedData = [];
  d3.select('svg g.chart').selectAll('circle').remove();
  d3.select('svg g.chart')
    .selectAll('circle')
    .data(quintileData[currentDate])
    .enter()
    .append('circle')
    .attr('class', function(d,i) { return 'circle-' + (d.x); })
    .attr('cx', function(d,i) {
      return xScale(retrieveMeasure(quintileData[currentDate][i],ROLLING_VOL));
    })
    .attr('cy', function(d,i) {
      return yScale(retrieveMeasure(quintileData[currentDate][i],ROLLING_RETS));
    })
    .attr('r', function(d,i) {
      return circleQuintileScale(retrieveMeasure(quintileData[currentDate][i],CAP_WEIGHT));
    })
    .attr('fill', function(d,i) {
      return retrieveColor(quintileData[currentDate][i]);
    })
    .on("mouseover", function(data,i) {
      var div = d3.select("body").append("div")   
     .attr("class", "nvtooltip")               
     .style("opacity", 0);
      div.transition()        
        .duration(200)
        .style("opacity", .9);
      div.html(tooltipHTMLFromData(data))  
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px")
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px");
    })   
    .on("mouseout", function(precinct) {
      d3.selectAll(".nvtooltip").remove();
    })
    .on('click', function(d,i) {
      addDetailPoint(d.x);
    });
  $('#resetbutton').hide();
}

// Get the measure we need, depending on the current mode we're in.
function retrieveMeasure(data,type) {
  if (data[type] === undefined) {
    if (currentMode == SIZE) {
      return parseFloat(data[type + SIZE]);
    } else {
      return parseFloat(data[type + VALUE]);
    }
  } else {
    return parseFloat(data[type]);
  }
}

// Get the color we're using for the current data.
function retrieveColor(data) {
  if (data.y === undefined) {
    if (currentMode == SIZE) {
      return QUINTILE_SIZE_COLORS[(data.x)-1];
    } else {
      return QUINTILE_VALUE_COLORS[(data.x)-1];
    }
  } else {
    return DATA_COLORS[(data.x)-1][(data.y)-1];
  }
}

// Add a single detail points, varying based on the mode.
function addDetailPoint(x) {
  d3.select('svg g.chart').selectAll('circle').remove();
  omittedQuintiles.push(x);
  // Go to ALL mode if we have all the quintiles added.
  if (omittedQuintiles.length == 5) {
    $("#size").prop('disabled', false);
    $("#value").prop('disabled', false);
    $("#all").prop('disabled', true);
    $("#resetbutton").hide();
    currentMode = ALL;
    addAllPoints();
  } else {
    addedData = addedData.concat(filterData(graphData[currentDate],x));
    var quintileData = filterQuintiles();
    var data = addedData.concat(quintileData);
    data.sort(compareData);
    d3.select('svg g.chart')
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', function(d,i) {
        var measure = retrieveMeasure(d,ROLLING_VOL);
        return xScale(measure);
      })
      .attr('cy', function(d,i) {
        var measure = retrieveMeasure(d,ROLLING_RETS);
        return yScale(measure);
      })
      .attr('r', function(d,i) {
        var measure = retrieveMeasure(d,CAP_WEIGHT);
        return circleQuintileScale(measure);
      })
      .attr('fill', function(d, i) {
        return retrieveColor(data[i]);
      })
      .on("mouseover", function(data,i) {
        var div = d3.select("body").append("div")
       .attr("class", "nvtooltip")
       .style("opacity", 0);
        div.transition()
          .duration(200)
          .style("opacity", .9);
        div.html(tooltipHTMLFromData(data))
          .style("left", ($('.graph').position().left) + "px")     
          .style("top", ($('.graph').position().top) + "px")
          .style("left", ($('.graph').position().left) + "px")     
          .style("top", ($('.graph').position().top) + "px");
      })
      .on("mouseout", function(precinct) {
        d3.selectAll(".nvtooltip").remove();
      })
      .on("click", function(data,i) {
        // Represents a quintile
        if (data.y === undefined) {
          addDetailPoint(data.x);
        }
      });
    $('#resetbutton').show();
  }
  if (currentMode == SIZE) {
    drawPartialSizeLegend();
  } else if (currentMode == VALUE){
    drawPartialValueLegend();
  } else {
    drawAllLegend();
  }
}

// Add our 25 points.
function addAllPoints() {
  d3.select('svg g.chart').selectAll('circle').remove();
  d3.select('svg g.chart')
    .selectAll('circle')
    .data(graphData[currentDate])
    .enter()
    .append('circle')
    .attr('cx', function(d,i) {
      return xScale(graphData[currentDate][i][ROLLING_VOL])
    })
    .attr('cy', function(d,i) {
      return yScale(graphData[currentDate][i][ROLLING_RETS])
    })
    .attr('r', function(d,i) {
      return circleQuintileScale(graphData[currentDate][i][CAP_WEIGHT]);
    })
    .attr('fill', function(d, i) {return DATA_COLORS[(graphData[currentDate][i].x)-1][(graphData[currentDate][i].y)-1];})
    .on("mouseover", function(data,i) {
      var div = d3.select("body").append("div")   
     .attr("class", "nvtooltip")               
     .style("opacity", 0);
      div.transition()        
        .duration(200)
        .style("opacity", .9);
      div.html(tooltipHTML(i))  
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px")
        .style("left", ($('.graph').position().left) + "px")     
        .style("top", ($('.graph').position().top) + "px");
    })   
    .on("mouseout", function(precinct) {
      d3.selectAll(".nvtooltip").remove();
    });;
}

// A wrapper to add points based on the mode.
function addPoints() {
  setScales();
  if (currentMode == ALL) {
    addAllPoints();
  } else {
    addQuintilePoints();
  }
}

// Draw our axes and their labels.
function addAxes() {
  d3.select('svg g.chart')
    .append("g")
    .attr('transform', 'translate(0,' + (HEIGHT) + ')')
    .attr('id', 'xAxis')
    .call(drawXAxis)
    .append("text")
      .attr("y", 35)
      .attr("x", WIDTH / 2)
      .style("text-anchor", "middle")
      .text(X_AXIS_LABEL);;

  d3.select('svg g.chart')
    .append("g")
    .attr('id', 'yAxis')
    .call(drawYAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x",0 - (HEIGHT / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(Y_AXIS_LABEL);
}

// Change our mode and resort the data based on our new mode.
function changeMode() {
  var keys = Object.keys(quintileData);
  for (var i = 0; i < keys.length; i++) {
    var results = quintileData[keys[i]];
    results.sort(compareData);
    quintileData[keys[i]] = results;
  }
}

// Update our axes. We don't need this, but we may someday.
function updateAxes() {
  d3.select('#xAxis')
    .transition()
    .duration(200)
    .call(drawXAxis);

  d3.select('#yAxis')
    .transition()
    .duration(200)
    .call(drawYAxis);
}

// Draw our x axis.
function drawXAxis(s) {
  s.call(d3.svg.axis()
    .scale(xScale)
    .orient("bottom"));
}

// Draw our y axis.
function drawYAxis(s) {
  s.call(d3.svg.axis()
    .scale(yScale)
    .orient("left"));
}

// Update the legend based on the mode we're in.
function updateLegend() {
  $('.legend').remove();
  $('.legend-circle').remove();
  $('.legend-tooltip').remove();
  if (currentMode == SIZE) {
    drawSizeLegend();
  } else if (currentMode == VALUE) {
    drawValueLegend();
  } else {
    drawAllLegend();
  }
}

// Add our legend for the size view.
function drawSizeLegend() {
  var DIM = 18;
  var legend = svg.selectAll(".legend")
      .data(QUINTILE_SIZE_COLORS)
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate( " + ((DIM+2)*(i-2)) + ",0)"; })
      .on("mouseover", function(data,i) {
        var div = d3.select("body").append("div")   
       .attr("class", "nvtooltip")               
       .style("opacity", 0);
        div.transition()        
          .duration(200)
          .style("opacity", .9);
        div.html("<h3>Click to expand</h3>")  
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px")
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px");
      })   
      .on("mouseout", function(data,i) {
        d3.selectAll(".nvtooltip").remove();
      })
      .on('click', function(d,i) {
        d3.selectAll(".nvtooltip").remove();
        addDetailPoint(i+1);
      });
  legend.append("rect")
    .attr("x", WIDTH - DIM)
    .attr("width", DIM)
    .attr("height", DIM)
    .style("fill", function(d,i) { return d; });

  legend.append("text")
    .attr("x",WIDTH-(DIM/2)-4)
    .attr("dy",-5)
    .text(function(d,i) { return (i+1); });
      
  legend.append("text")
        .attr("x",WIDTH-(DIM/2)+10)
        .attr("dy", -20)
        .text(function(d,i) { if (i == 0) { return "Size Quintile"; } });

  var legendCircle = svg.selectAll(".legend-circle")
      .data(["Area = Capitalization Weight %"])
    .enter().append("g")
      .attr("class", "legend-circle")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*2) + ")");
  legendCircle.append("circle")
    .attr("r", 10)
    .style("fill", "black");
  legendCircle.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
  var tooltip = svg.selectAll(".legend-tooltip")
      .data(["Click circles or legend to expand"])
    .enter().append("g")
      .attr("class", "legend-tooltip")
      .attr("transform", "translate( " + (WIDTH-90) + "," + (DIM*3) + ")");
  tooltip.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
}

// Add our legend for the value view.
function drawValueLegend() {
  var DIM = 18;
  var legend = svg.selectAll(".legend")
      .data(QUINTILE_VALUE_COLORS)
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate( " + ((DIM+2)*(-2)) + "," + i * (DIM+2) + ")"; })
      .on("mouseover", function(data,i) {
        var div = d3.select("body").append("div")   
       .attr("class", "nvtooltip")               
       .style("opacity", 0);
        div.transition()        
          .duration(200)
          .style("opacity", .9);
        div.html("<h3>Click to expand</h3>")  
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px")
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px");
      })   
      .on("mouseout", function(data,i) {
        d3.selectAll(".nvtooltip").remove();
      })
      .on('click', function(d,i) {
        d3.selectAll(".nvtooltip").remove();
        addDetailPoint(i+1);
      });
  legend.append("rect")
    .attr("x", WIDTH - DIM)
    .attr("width", DIM)
    .attr("height", DIM)
    .style("fill", function(d,i) { return d; });

  
  legend.append("text")
    .attr("x",WIDTH-DIM-15)
    .attr("dy", (DIM/2)+4)
    .text(function(d,i) { return (i+1); });
  legend.append("text")
    .attr("transform", "translate(" + (WIDTH-(DIM/2)-45) + "," + 48 + ") rotate(-90)")
    .attr("dy",12)
    .text(function(d,i) { if (i == 2) { return "Value Quintile";} });

  var legendCircle = svg.selectAll(".legend-circle")
      .data(["Area = Capitalization Weight %"])
    .enter().append("g")
      .attr("class", "legend-circle")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*7) + ")");
  legendCircle.append("circle")
    .attr("r", 10)
    .style("fill", "black");
  legendCircle.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
  var tooltip = svg.selectAll(".legend-tooltip")
      .data(["Click circles or legend to expand"])
    .enter().append("g")
      .attr("class", "legend-tooltip")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*8) + ")");
  tooltip.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
}

// Add our legend with our grid. A little bit janky, but not bad.
function drawAllLegend() {
  var DIM = 18;
  for (var x = 0; x < 5; x++) {
    var legend = svg.selectAll(".legend-" + x)
      .data(DATA_COLORS[x])
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate( " + ((DIM+2)*(x-2)) + "," + i * (DIM+2) + ")"; });

    legend.append("rect")
        .attr("x", WIDTH - DIM)
        .attr("width", DIM)
        .attr("height", DIM)
        .style("fill", function(d,i) { return DATA_COLORS[x][i]; });

    if (x == 0) {
      // Left Labels
      legend.append("text")
        .attr("x", WIDTH-DIM-15)
        .attr("dy", (DIM/2)+4)
        .text(function(d,i) { return (i+1); });
      // Left Title
      legend.append("text")
        .attr("transform", "translate(" + (WIDTH-(DIM/2)-45) + "," + 48 + ") rotate(-90)")
        .attr("dy",12)
        .text(function(d,i) { if (i == 2) { return "Value Quintile";} });

    }

    // Top Labels
    legend.append("text")
      .attr("x",WIDTH-(DIM/2)-4)
      .attr("dy",-5)
      .text(function(d,i) { if (i == 0) { return (x+1); } });

    // Top Title
    if (x == 2) {
      legend.append("text")
        .attr("x",WIDTH-(DIM/2)-30)
        .attr("dy", -20)
        .text(function(d,i) { if (i == 0) { return "Size Quintile"; } });
    }
  }
  var legendCircle = svg.selectAll(".legend-circle")
      .data(["Area = Capitalization Weight %"])
    .enter().append("g")
      .attr("class", "legend-circle")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*7) + ")");
  legendCircle.append("circle")
    .attr("r", 10)
    .style("fill", "black");
  legendCircle.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
}

// Add our partial size legend with our grid. Based on the omitted quintiles.
function drawPartialSizeLegend() {
  $('.legend').remove();
  $('.legend-circle').remove();
  $('.legend-tooltip').remove();
  var DIM = 18;
  for (var x = 0; x < 5; x++) {
    var legend = svg.selectAll(".legend-" + (x+1))
        .data(DATA_COLORS[x])
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate( " + ((DIM+2)*(x-2)) + "," + i * (DIM+2) + ")"; });
    if (omittedQuintiles.length > 0) {
      if (x == 0) {
        // Left Labels
        legend.append("text")
          .attr("x", WIDTH-DIM-15)
          .attr("dy", (DIM/2)+4)
          .text(function(d,i) { return (i+1); });
        // Left Title
        legend.append("text")
          .attr("transform", "translate(" + (WIDTH-(DIM/2)-45) + "," + 48 + ") rotate(-90)")
          .attr("dy",12)
          .text(function(d,i) { if (i == 2) { return "Value Quintile";} });
      }
    }
    if (omittedQuintiles.indexOf(x+1) >= 0) {
      legend.append("rect")
        .attr("x", WIDTH - DIM)
        .attr("width", DIM)
        .attr("height", DIM)
        .style("fill", function(d,i) { return DATA_COLORS[x][i]; });
    } else {
      legend.append("rect")
        .attr("x", WIDTH - DIM)
        .attr("width", DIM)
        .attr("height", DIM)
        .attr("fill", function(d,i) {
          return (i == 0) ? QUINTILE_SIZE_COLORS[x] : "white";
        })
        .on("mouseover", function(data,i) {
          if (i == 0) {
            var div = d3.select("body").append("div")   
              .attr("class", "nvtooltip")               
              .style("opacity", 0);
            div.transition()        
              .duration(200)
              .style("opacity", .9);
            div.html("<h3>Click to expand</h3>")  
              .style("left", (d3.event.pageX) + "px")     
              .style("top", (d3.event.pageY - 28) + "px")
              .style("left", (d3.event.pageX) + "px")     
              .style("top", (d3.event.pageY - 28) + "px");
          }
        })   
        .on("mouseout", function(data,i) {
          if (i == 0) {
            d3.selectAll(".nvtooltip").remove();
          }
        })
        .on('click', function(d,i) {
          if (i == 0) {
            d3.selectAll(".nvtooltip").remove();
            addDetailPoint(quintileFinder(d));
          }
        });
    }

    // Top Labels
    legend.append("text")
      .attr("x",WIDTH-(DIM/2)-4)
      .attr("dy",-5)
      .text(function(d,i) { if (i == 0) { return (x+1); } });

    // Top Title
    if (x == 2) {
      legend.append("text")
        .attr("x",WIDTH-(DIM/2)-30)
        .attr("dy", -20)
        .text(function(d,i) { if (i == 0) { return "Size Quintile"; } });
    }
  }
  var legendCircle = svg.selectAll(".legend-circle")
      .data(["Area = Capitalization Weight %"])
    .enter().append("g")
      .attr("class", "legend-circle")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*7) + ")");
  legendCircle.append("circle")
    .attr("r", 10)
    .style("fill", "black");
  legendCircle.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
  var tooltip = svg.selectAll(".legend-tooltip")
      .data(["Click circles or legend to expand"])
    .enter().append("g")
      .attr("class", "legend-tooltip")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*8) + ")");
  tooltip.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
}

// Add our partial value legend with our grid. Based on the omitted quintiles.
function drawPartialValueLegend() {
  $('.legend').remove();
  $('.legend-circle').remove();
  $('.legend-tooltip').remove();
  var DIM = 18;
  for (var x = 0; x < 5; x++) {
    var legend = svg.selectAll(".legend-" + (x+1))
        .data(DATA_COLORS[x])
      .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate( " + ((DIM+2)*(x-2)) + "," + i * (DIM+2) + ")"; });
    // Left Labels
    if (x == 0) {
      legend.append("text")
        .attr("x", WIDTH-DIM-15)
        .attr("dy", (DIM/2)+4)
        .text(function(d,i) { return (i+1); });
      // Left Title
      legend.append("text")
        .attr("transform", "translate(" + (WIDTH-(DIM/2)-45) + "," + 48 + ") rotate(-90)")
        .attr("dy",12)
        .text(function(d,i) { if (i == 2) { return "Value Quintile";} });
    }
    if (x == 0) {
      legend.append("rect")
        .attr("x", WIDTH - DIM)
        .attr("width", DIM)
        .attr("height", DIM)
        .style("fill", function(d,i) {
          return QUINTILE_VALUE_COLORS[i];
        })
        .on("mouseover", function(data,i) {
          if (omittedQuintiles.indexOf(i+1) < 0) {
            var div = d3.select("body").append("div")   
              .attr("class", "nvtooltip")               
              .style("opacity", 0);
            div.transition()        
              .duration(200)
              .style("opacity", .9);
            div.html("<h3>Click to expand</h3>")  
              .style("left", (d3.event.pageX) + "px")     
              .style("top", (d3.event.pageY - 28) + "px")
              .style("left", (d3.event.pageX) + "px")     
              .style("top", (d3.event.pageY - 28) + "px");
          }
        })   
        .on("mouseout", function(data,i) {
          if (omittedQuintiles.indexOf(i+1) < 0) {
            d3.selectAll(".nvtooltip").remove();
          }
        })
        .on('click', function(d,i) {
          if (omittedQuintiles.indexOf(i+1) < 0) {
            d3.selectAll(".nvtooltip").remove();
            addDetailPoint(i+1);
          }
        });
    } else {
      legend.append("rect")
        .attr("x", WIDTH - DIM)
        .attr("width", DIM)
        .attr("height", DIM)
        .attr("fill", function(d,i) {
          return (omittedQuintiles.indexOf(i+1) >= 0) ? DATA_COLORS[x][i]: "white";
        });
    }
    if (omittedQuintiles.length > 0) {
      // Top Labels
      legend.append("text")
        .attr("x",WIDTH-(DIM/2)-4)
        .attr("dy",-5)
        .text(function(d,i) { if (i == 0) { return (x+1); } });

      // Top Title
      if (x == 2) {
        legend.append("text")
          .attr("x",WIDTH-(DIM/2)-30)
          .attr("dy", -20)
          .text(function(d,i) { if (i == 0) { return "Size Quintile"; } });
      }
    }
  }
  var legendCircle = svg.selectAll(".legend-circle")
      .data(["Area = Capitalization Weight %"])
    .enter().append("g")
      .attr("class", "legend-circle")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*7) + ")");
  legendCircle.append("circle")
    .attr("r", 10)
    .style("fill", "black");
  legendCircle.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
  var tooltip = svg.selectAll(".legend-tooltip")
      .data(["Click circles or legend to expand"])
    .enter().append("g")
      .attr("class", "legend-tooltip")
      .attr("transform", "translate( " + (WIDTH-85) + "," + (DIM*8) + ")");
  tooltip.append("text")
    .attr("dx", 15)
    .attr("dy", 4)
    .text(function(d,i) { return d; });
}

// Find the quintile we're using based on the color. Janky.
function quintileFinder(color) {
  for (var i = 0; i < DATA_COLORS.length; i++) {
    if (DATA_COLORS[i][0] == color) {
      return i+1;
    }
  }
  return -1;
}

// Format our HTML for our tooltip.
function tooltipHTML(i) {
  var data = graphData[currentDate][i];
  return '<h3 style="background-color:'
                + DATA_COLORS[(data.x)-1][(data.y)-1] + '">Size quintile ' + data.x + ', Value quintile ' + data.y + '</h3>'
                + '<p><b>Cap Weight:</b> ' + (data[CAP_WEIGHT]*100).toFixed(2) + '%</p>'
                + '<p><b>Return:</b> ' + data[ROLLING_RETS] + '</p>'
                + '<p><b>Volatility:</b> ' + data[ROLLING_VOL] + '</p>';
}

// Format our HTML for our data
function tooltipHTMLFromData(data) {
  if (data.y === undefined) {
    if (currentMode == SIZE) {
      return '<h3 style="background-color:'
                + QUINTILE_SIZE_COLORS[(data.x)-1] + '">Size quintile ' + data.x + '</h3>'
                + '<p><b>Cap Weight:</b> ' + (data[CAP_WEIGHT + currentMode]*100).toFixed(2) + '%</p>'
                + '<p><b>Return:</b> ' + data[ROLLING_RETS + currentMode] + '</p>'
                + '<p><b>Volatility:</b> ' + data[ROLLING_VOL + currentMode] + '</p>';      
    } else {
      return '<h3 style="background-color:'
                + QUINTILE_VALUE_COLORS[(data.x)-1] + '">Value quintile ' + data.x + '</h3>'
                + '<p><b>Cap Weight:</b> ' + (data[CAP_WEIGHT + currentMode]*100).toFixed(2) + '%</p>'
                + '<p><b>Return:</b> ' + data[ROLLING_RETS + currentMode] + '</p>'
                + '<p><b>Volatility:</b> ' + data[ROLLING_VOL + currentMode] + '</p>';
    }
  } else {
    return '<h3 style="background-color:'
              + DATA_COLORS[(data.x)-1][(data.y)-1] + '">Size quintile ' + data.x + ', Value quintile ' + data.y + '</h3>'
              + '<p><b>Cap Weight:</b> ' + (data[CAP_WEIGHT]*100).toFixed(2) + '%</p>'
              + '<p><b>Return:</b> ' + data[ROLLING_RETS] + '</p>'
              + '<p><b>Volatility:</b> ' + data[ROLLING_VOL] + '</p>';
  }
}

// Function to start going through our slider values automatically.
function startPlay() {
  currentYear = DEFAULT_YEAR;
  currentMonth = DEFAULT_MONTH;
  dateSlider.value(new Date(currentYear,currentMonth,1));
  timer = setInterval(function() {
    if (currentYear >= DEFAULT_YEAR && currentYear <= MAX_YEAR) {
      if (currentYear == MAX_YEAR) {
        if (currentMonth < MAX_MONTH) {
          currentMonth++;
        } else {
          stopPlay();
        }
      }
      else if (currentYear != MAX_YEAR || currentMonth != 11) {    
        if (currentMonth == 11) {
          currentMonth = 0;
          currentYear++;
        } else {
          currentMonth++;
        }
      }
      if ((currentMonth+1) >= 10) {
        currentDate = "" + currentYear + (currentMonth+1);
      } else {
        currentDate = "" + currentYear + "0" + (currentMonth+1);
      }
      setDateString();
      dateSlider.value(new Date(currentYear,currentMonth,1));
      updateChart();
    } else {
      stopPlay();
    }
  }, DEFAULT_INTERVAL);
  $("#playbutton").html("Stop");
}

// Function to stop going through our slider values automatically.
function stopPlay() {
  clearInterval(timer);
  timer = null;
  $("#playbutton").html("Play");
  updateChart();
}

// Add our listeners for various HTML elements.
$(document).ready(function() {
  $("#playbutton").click(function() {
    numberOfPlayClicks++;
    if (numberOfPlayClicks % 2 == 1) {
      isPlaying = true;
      updateLegend();
      startPlay();
    } else {
      isPlaying = false;
      stopPlay();
    }
  });
  $("#resetbutton").click(function() {
    updateLegend();
    addQuintilePoints();
  })
  $("#size").click(function() {
    $("#size").prop('disabled', true);
    $("#value").prop('disabled', false);
    $("#all").prop('disabled', false);
    currentMode = SIZE;
    changeMode();
    addPoints();
    updateLegend();
    omittedQuintiles = [];
    addedData = [];
  });
  $("#value").click(function() {
    $("#size").prop('disabled', false);
    $("#value").prop('disabled', true);
    $("#all").prop('disabled', false);
    currentMode = VALUE;
    changeMode();
    addPoints();
    updateLegend();
    omittedQuintiles = [];
    addedData = [];
  });
  $("#all").click(function() {
    $("#size").prop('disabled', false);
    $("#value").prop('disabled', false);
    $("#all").prop('disabled', true);
    currentMode = ALL;
    addPoints();
    updateLegend();
    omittedQuintiles = [];
    addedData = [];
  });
});