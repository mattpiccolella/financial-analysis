// Various constants
var DEFAULT_INTERVAL = 1000;
var DEFAULT_YEAR = 2005;
var INNER_MONGOLIA = "Inner Mongolia";
var ISSUE_AMOUNT = "issueamount";
var ISSUE_NUM = "issuenum";
var MAX_INT = 9007199254740992;
var MAX_YEAR = 2014;
var SVG_ID = "china-map";

// Various data variables.
var chinaData;
var currentType = ISSUE_AMOUNT;
var currentYear = DEFAULT_YEAR;
var issueAmountDomain;
var issuanceByYear = {};
var issueNumDomain;
var numberOfPlayClicks = 0;
var provSubunits;
var timer = null;
var yearSlider;

// SVG 
var width = 1000,
    height = 500;
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);
var g = svg.append("g").attr("id", SVG_ID);
var colors = d3.scale.category20c();
var color = d3.scale.category10();
var path;

// Create a unit projection.
var projection = d3.geo.mercator()
    .scale(1)
    .translate([0, 0]);

// Function to add our date slider.
function addSlider() {
  yearSlider = d3.slider().axis(true).min(2005).max(2014).step(1).value(currentYear).on("slide", handleSliderChange);
  d3.select('#slider').call(yearSlider);
}

// Function to redraw on changing the value of the slider.
function handleSliderChange(evt, value) {
  currentYear = value;
  g.selectAll(".subunit").remove();
  drawProvinces();
  addData();
}

// Function to compare two province subunits for the current year.
function compareProvinces(prov1,prov2) {
  var prov1Name = prov1.displayName;
  var prov2Name = prov2.displayName;

  var currentData = issuanceByYear[currentYear];
  var prov1Value = currentData[prov1Name][currentType];
  var prov2Value = currentData[prov2Name][currentType];

  return parseFloat(prov2Value) - parseFloat(prov1Value);
}

// Function to get the names of the provinces we need given the available data.
function getAvailableProvinces() {
  // Parse out only the provinces we have data for.
  var provinceData = [];
  var nonProvinceData = [];
  var availableProvinces = Object.keys(issuanceByYear[currentYear]);
  for (var i = 0; i < chinaData.features.length; i++) {
    var province = chinaData.features[i];
    var provinceName = province.properties.gn_name;
    if (provinceName && availableProvinces.indexOf(provinceName.split(" ")[0]) > -1) {
      province.displayName = provinceName.split(" ")[0];
      provinceData.push(province);
    } else if (provinceName && availableProvinces.indexOf(provinceName.split(" ").slice(1,2).join(" ")) > -1) {
      province.displayName = INNER_MONGOLIA;
      provinceData.push(province);
    } else if (provinceName) {
      if (provinceName.split(" ").slice(0,2).join(" ") == INNER_MONGOLIA) {
        province.displayName = INNER_MONGOLIA;
      } else {
        province.displayName = provinceName.split(" ")[0];
      }
      nonProvinceData.push(province);
    }
  }
  return {"province": provinceData, "nonProvince": nonProvinceData};
}

// Set the domains for each of the two different types.
function setDomains() {
  issueAmountDomain = generateDomainForData(ISSUE_AMOUNT);
  issueNumDomain = generateDomainForData(ISSUE_NUM);
}

// Function to find the domain for the type specified.
function generateDomainForData(key) {
  var maxVal = -1;
  var minVal = MAX_INT;
  var years  = Object.keys(issuanceByYear);
  for (var i = 0; i < years.length; i++) {
    var provinces = Object.keys(issuanceByYear[years[i]]);
    for (var j = 0; j < provinces.length; j++) {
      var value = parseFloat(issuanceByYear[years[i]][provinces[j]][key]);
      if (value > maxVal) {
        maxVal = value;
      } else if (value < minVal) {
        minVal = value;
      }
    }
  }
  return [minVal,maxVal];
}

// Get the domain for the current data type.
function getDomain() {
  return (currentType == ISSUE_AMOUNT) ? issueAmountDomain : issueNumDomain;
}

// Add our bubbles that represent the data that we are graphing.
function addData() {
  g.selectAll(".bubble").remove();

  var scale = d3.scale.sqrt().domain(getDomain()).range([5,40]);

  // Info Box div to add the tooltips
  var div = d3.select("body").append("div")   
     .attr("class", "info-box")               
     .style("opacity", 0);

  var provinces = getAvailableProvinces();
  var provinceData = provinces["province"];

  provinceData = provinceData.sort(compareProvinces);

  // Add the desired provinces, set functions for mouseover and mouseout
  provSubunits = g.selectAll(".subunit-prov")
    .data(provinceData)
  .enter().append("circle")
    .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
    .attr("r", function(d) { return scale(parseFloat(issuanceByYear[currentYear][d.displayName][currentType])) + "px"; })
    .attr("class", "bubble")
    .on("mouseover", function(province) {
      $("#provinceName").text(province.displayName);
      div.transition()        
        .duration(200)      
        .style("opacity", .9);
      div.html(getHTMLTooltip(province))
        .style("left", (d3.event.pageX) + "px")     
        .style("top", (d3.event.pageY - 28) + "px");
    })   
    .on("mouseout", function(province) {
        $("#provinceName").text("Select a Province");
        div.transition()        
          .duration(500)      
          .style("opacity", 0);
    });
}

// Get the HTML for the tooltip that we put for a given province.
function getHTMLTooltip(province) {
  if (currentType == ISSUE_NUM) {
    return "<b>Province:</b> " + province.displayName + "<br><b>Number of Bonds</b>: " + issuanceByYear[currentYear][province.displayName][currentType];
  } else {
    return "<b>Province:</b> " + province.displayName + "<br><b>Total Issuance</b>: RMB " + issuanceByYear[currentYear][province.displayName][currentType];
  }
}

// Draw the provinces, using the provinces that we have data available for.
function drawProvinces() {
  var provinces = getAvailableProvinces();
  var provinceData = provinces["province"];
  var nonProvinceData = provinces["nonProvince"];

  // Add the desired provinces, set functions for mouseover and mouseout
  provSubunits = g.selectAll(".subunit-prov")
    .data(provinceData)
  .enter().append("path")
    .attr("class", function(d) { return "subunit " + d.properties.gns_adm1; })
    .style("fill", function(d) { return colors(d.properties.gns_adm1)})
    .attr("stroke", "white")
    .attr("d", path)
    .attr("name", function(d) { return d.displayName; })
    .on("mouseover", function(province) {
      $("#provinceName").text(province.displayName);   
    })
    .on("mouseout", function(province) {
      $("#provinceName").text("Select a Province");
    });

  // Add the non-desired provinces, set default color and text behaviors.
  g.selectAll(".subunit-nonprov")
    .data(nonProvinceData)
  .enter().append("path")
    .style("fill", "#F5F5DC")
    .attr("stroke", "white")
    .attr("d", path)
    .attr("class", "subunit")
    .on("mouseover", function(province) {
      console.log(province);
      $("#provinceName").text(province.displayName);
    })
    .on("mouseout", function(province) {
      $("#provinceName").text("Select a Province");
    });
}

// Draw the map given our GeoJSON data.
function drawMap() {
  path = d3.geo.path()
    .projection(projection);

  // Compute the bounds of a feature of interest,1 then derive scale & translate.
  var b = path.bounds(chinaData),
    s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    t = [(width - s * (b[1][0] + b[0][0])) / 2, ((height - s * (b[1][1] + b[0][1])) / 2)];

  // Update the projection to use computed scale & translate.
  projection
      .scale(s)
      .translate(t);

  // Update our projection
  path.projection(projection);

  // Plot the overall map of China
  g.append("path")
      .datum(chinaData)
      .attr("d", path)
      .attr("fill", "#F5F5DC");

  drawProvinces();
}

// Function to start going through our slider values automatically.
function startPlay() {
  currentYear = DEFAULT_YEAR;
  yearSlider.value(currentYear);
  timer = setInterval(function() {
    if (currentYear <= MAX_YEAR) {
      if (currentYear == MAX_YEAR) {
        numberOfPlayClicks = 0;
        stopPlay();
      } else {
        currentYear++;
        g.selectAll(".subunit").remove();
        drawProvinces();
        addData();
        yearSlider.value(currentYear);
      }
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
}

// Load the data, parse it, and save it for later use. Then, draw our chart and fill it.
d3.csv("issuance.csv", function(error, data) {
  data.forEach(function(d) {
    var issuance = {};
    issuance = {};
    issuance[ISSUE_AMOUNT] = d.issueamount;
    issuance[ISSUE_NUM] = d.issuenum;
    if (!(d.year in issuanceByYear)) {
      issuanceByYear[parseInt(d.year)] = {};
    }
    issuanceByYear[parseInt(d.year)][d.province] = issuance;
  });
});

// Draw the map of China given our previously parsed GeoJSON.
d3.json("china.json", function(error, china) {
  chinaData = china;
  drawMap();
  addSlider();
  setDomains();
  addData();
});

// Add our listeners for various HTML elements.
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
    $("#amount").prop('disabled', true);
    $("#number").prop('disabled', false);
    currentType = ISSUE_AMOUNT;
    addData();
  });
  $("#number").click(function() {
    $("#number").prop('disabled', true);
    $("#amount").prop('disabled', false);
    currentType = ISSUE_NUM;
    addData();
  });
});