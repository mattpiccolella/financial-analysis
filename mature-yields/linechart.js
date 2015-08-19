var yield_by_year = {};
var DEFAULT_YEAR = 2013;
var DEFAULT_MONTH = 11;
var MIN_YEAR = 1995;
var MAX_YEAR = 2013;
var DEFAULT_INTERVAL = 100;
var currentYear = DEFAULT_YEAR;
var currentMonth = DEFAULT_MONTH;
var timer = null;
var numberOfPlayClicks = 0;
var svg;
var dateSlider;

var x;
var y;

var margin = {top: 0, right: 120, bottom: 40, left: 50},
  width = 1000 - margin.left - margin.right,
  height = 400 - margin.top - margin.bottom;

var monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

var bondTypes = ["treasury", "muni", "munirf"];

var colors = d3.scale.category20();

// Function to take a row from our CSV file and create a JSON object to store maturity rates v. yields.
function parseDataRow(row) {
  yield = {};
  // Create three arrays for the maturities of the three different types of bond.
  yield.treasury = [];
  yield.muni = [];
  yield.munirf = [];
  for (var i = 1; i <= 10; i++) {
    // Create the strings to access our CSV header format
    var treasuryString = "treasury" + i;
    var muniString = "muni" + i;
    var munirfString = "munirf" + i;
    yield.treasury.push(row[treasuryString]);
    yield.muni.push(row[muniString]);
    yield.munirf.push(row[munirfString]);
  }
  return yield;
}

// Function to calculate the max yield of all the different bond types for domain of axis.
function maxYield(row) {
  var treasuryMax = Math.max.apply(Math, row.treasury);
  var muniMax = Math.max.apply(Math, row.muni);
  var munirfMax = Math.max.apply(Math, row.munirf);
  return Math.max.apply(Math, [treasuryMax, muniMax, munirfMax]);
}

// Function to return our x-axis given our default maturity values.
function getXAxis() {
  x = d3.scale.linear()
      .domain([0,10])
      .range([0, width]);
  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");
  return xAxis;
}

// Function to return our y-axis given our yield for the current period.
function getYAxis() {
  var yDomain = [0, 8.0];
  y = d3.scale.linear()
      .domain(yDomain)
      .range([height, 0]);
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");
  return yAxis;
}

// Function to add our x-axis to our graph.
function addXAxis() {
  // Call our function to get the current x-axis.
  var xAxis = getXAxis();

  // Add it to our global svg object.
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
      .attr("y", 35)
      .attr("x", width / 2)
      .style("text-anchor", "middle")
      .text("Maturity");
}

// Function to add our y-axis to our graph.
function addYAxis() {
  // Call our function to get the current y-axis.
  var yAxis = getYAxis();

  // Add it to our global svg object.
  svg.append("g")
    .attr("class", "y axis")
    .attr("y", 20)
    .call(yAxis)
    .append("text")
      .attr("x", -30)
      .attr("y", height / 2)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Yield");
}

// Function to add our slider to the page.
function addSlider() {
  // Find the min and max years for our slider.
  var maxYear = -1,
      minYear = 2500;
  for (year in yield_by_year) {
    if (year > maxYear) {
      maxYear = year;
    }
    if (year < minYear) {
      minYear = year;
    }
  }

  dateSlider = d3.slider().scale(d3.time.scale()
    .domain([new Date(1995,1,1), new Date(2013,11,1)])).axis(d3.svg.axis())
    .value(new Date(DEFAULT_YEAR,DEFAULT_MONTH,1))
    .on("slide", handleSliderChange);
  d3.select('#slider10').call(dateSlider);

  // Update the values once we've added it.
  updateGraphAndValues();
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
    // We need to redraw the graph and change the headline.
    updateGraphAndValues();
  }

}

// Function to get the data we need for the graph and format it properly.
function getData() {
  values = [{"name" : "Treasury", "values" : []},{"name" : "Muni", "values" : []},{"name" : "Risk-Free Muni", "values" : []}];
  for (var i = 0; i < 10; i++) {
    for (var j = 0; j < bondTypes.length; j++) {
      values[j]["values"].push({"maturity": i+1, "rate": yield_by_year[currentYear][currentMonth+1][bondTypes[j]][i]});
    }
  }
  return values;
}

// Add the data to our graph, formatting it with colors and adding text labels.
function addData() {
  var lineData = getData();

  var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d) { return x(d.maturity); })
    .y(function(d) { return y(d.rate); });

  var bond = svg.selectAll(".bond")
      .data(lineData)
    .enter().append("g")
      .attr("class", "bond");

  bond.append("path")
    .attr("class", "line")
    .attr("d", function(d) { return line(d.values); })
    .attr("stroke", function(d) { return colors(d.name); });

  bond.append("text")
    .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
    .attr("transform", function(d) { return "translate(" + x(d.value.maturity) + "," + y(d.value.rate) + ")"; })
    .attr("fill", function(d) { return colors(d.name) })
    .attr("x", 6)
    .attr("dy", ".35em")
    .text(function(d) { return d.name; });

  // Info Box div to add the tooltips
  var div = d3.select("body").append("div")   
    .attr("class", "info-box")               
    .style("opacity", 0);

  var point = bond.append("g")
    .attr("class", "line-point");

  point.selectAll("circle")   //adding dots
    .data(function(d) { return d.values; })
    .enter().append("circle")
    .attr("class","point")
    .attr("cx", function(d) { return x(d.maturity); })
    .attr("cy", function(d) { return y(d.rate); })
    .attr("fill", function(d) { return colors(this.parentNode.__data__.name); })
    .attr("r", 3.5)
    .on("mouseover", function(d){
      div.transition()        
          .duration(200)      
          .style("opacity", .9);      
      div.html("<b>Maturity:</b> " + d.maturity + " years<br><b>Yield:</b> " + d.rate + "%")  
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px");       
    })
    .on("mouseout", function(){
      div.transition()        
          .duration(500)      
          .style("opacity", 0); 
    }); 
}

// Function to change the value of our slider, change the date being shown, and redraw our line graph.
function updateGraphAndValues() {
  // TODO: Look into not having to do this on drag.
  dateSlider.value(new Date(currentYear,currentMonth,1));
  $("#date").text(monthNames[currentMonth] + " " + currentYear);
  // Remove our old graph and create our new one.
  $("#linegraph").remove();
  createGraph();
}

// Function to add our base line graph.
function addLineGraph() {
  // Add your base SVG element
  svg = d3.select("body").append("svg")
      .attr("id", "linegraph")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom))
      .style("padding-left", "50px")
      .style("padding-top", "30px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

// Function to construct our line graph, include axes and lines.
function constructLineGraph() {
  // Add our axes.
  addXAxis();
  addYAxis();

  // TODO: Actually graph our data.
  addData();
}

// Function to create our line graph.
function createGraph() {
  addLineGraph();
  constructLineGraph();
}

// Function to start going through our slider values automatically.
function startPlay() {
  timer = setInterval(function() {
    if (currentYear >= MIN_YEAR && currentYear <= MAX_YEAR) {
      // TODO: Check for max and min.
      if (currentYear != MAX_YEAR || currentMonth != 11) {    
        if (currentMonth == 11) {
          currentMonth = 0;
          currentYear++;
        } else {
          currentMonth++;
        }
        updateGraphAndValues();
      } else {
        stopPlay();
      }
    }
  }, DEFAULT_INTERVAL);
  $("#playbutton").html("Stop");
}

// Function to stop going through our slider values automatically.
function stopPlay() {
  clearInterval(timer);
  timer = null;
  $("#playbutton").html("Play");
}

// Load the data, parse it, and save it for later use. Then, draw our chart and fill it.
d3.csv("yield_data.csv", function(error, data) {
  data.forEach(function(d) {
    var yieldObject = parseDataRow(d);
    // If we're on our first for the year, create an object for that year
    if (!(d.year in yield_by_year)) {
      yield_by_year[d.year] = {};
    }
    // Add our data to our global store of data.
    yield_by_year[d.year][d.month] = yieldObject;
  });
  // Add our base line graph.
  addLineGraph();
  // Construct our initial line graph.
  constructLineGraph();
  // Add our year slider.
  addSlider();
});

$(document).ready(function() {
  $("#playbutton").click(function() {
    numberOfPlayClicks++;
    if (numberOfPlayClicks % 2 == 1) {
      startPlay();
    } else {
      stopPlay();
    }
  });
  $("#amount").click(function() {
    console.log("amount");
  });
  $("#number").click(function() {
    console.log("number");
  });
});
