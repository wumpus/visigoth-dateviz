//var xWidth = Math.max(window.innerWidth - 150, 1000); // force to 1000 wide, because we want that many years to be possible
var xWidth = 1000;

var barWidth = 1; // should be an integer
var numBars = Math.floor(xWidth/barWidth); // depends on barWidth

var margin = {top: 20, right: 0, bottom: 50, left: 70};
var width = numBars*barWidth // + margin.left + margin.right; // depends on barWidth
var height = Math.max(window.innerHeight - margin.top - margin.bottom - 400, 400); // max of 400

var minDate = new Date("1000");
var maxDate = new Date("2000");

var x = d3.time.scale()
                .domain([minDate, maxDate])
                .range([0, width]);

var y = d3.scale.linear()
		.domain([0, 100])
		.range([height, 0]);

var xAxis = d3.svg.axis()
		.scale(x);
                // does not appear to need a format. default orientation is bottom.

var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left")
		.tickFormat(d3.format("d"));

var svg = d3.select("#graph").append("svg")
		.attr("id", "svg")
		.attr("width", width + margin.left + margin.right) // depends on barWidth ...
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.attr("id", "transformBox");

var tooltip = d3.select("body")
		.append("div")
		.attr("id","tooltip");

// removes placeholder loading text ... most useful so you can immediately see a crash on syntax error
document.getElementById('loadingText').innerHTML = '';

var data = [];			// height of bars, representing occurences of match per bucket of x chars
var word;			// matched word (or string) 
var word_sum;			// count of word entries

//0s out data array
resetData();

// create x axis
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height) + ")") // draw this axis on the bottom, instead of default top
    .call(xAxis)
    .append("text")
    .attr("transform", "translate("+(width/2)+","+(45)+")") // note that this transform also gets the above transform applied!
    .style("text-anchor", "middle")
    .attr("font-size",'110%')
    .text("year");

// create y axis
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "translate("+ (-100/2) +","+(height/2)+")rotate(-90)") // changed -80 to -100 to keep label off the digits
    .style("text-anchor", "middle")
    .attr("font-size",'110%')
    .text("count");

// draws initial histogram bars - zeroes
// set up mouseover effect callback
svg.selectAll('.bar')
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d, i){return (1+i)*barWidth;})
    .attr("width", barWidth)
    .attr("y", height) // starts at bottom
    .attr("height", 0)
    .on("mouseover", function(){

	var cord = d3.mouse(this);
	d3.select(this).style("fill", "#435A82"); // change color of this bar

	var cord_x = Math.floor(cord[0]/barWidth);
        var year = cord_x + 999;
	// note that x.invert(cord[0]) is a Date object -- really ought to get year from there XXX
	var cord_y = Math.floor(y.invert(cord[1]));

	console.log("saw mouseover event in the graph, x,y are ", cord_x, cord_y);
	console.log("mouseover event, year=", year);

	document.getElementById("chapterTitle").innerHTML = year;

	$.getJSON("//researcher3.fnf.archive.org:8080/sentences", {
	    q: word, // global variable
	    year: year
	}, function(sdata) {

	    console.log("sentences callback fired");

	    var sentences = sdata.error ? [] : sdata.sentences;
	    var formatted_text = $.map(sentences, function(m) {
		//var url_view = 'https://archive.org/stream/' + m.ia_id + '/#page/n' + m.leaf + '/mode/2up" target="_blank' // correct leaf
		var url_details = 'https://archive.org/details/' + m.ia_id // XXX no way to specify a leaf here?

		var t = '<a href="' + url_details + '" target="_blank">' + m.title + '</a> (rank='+ m.rank + ' leaf=' + m.leaf + ')<p />';
		var s = m.s.replace(new RegExp('(' + word  + ')', 'gi'), "<b>$1</b>"); // this may double-bold, but that's not a big deal
		s = s.replace(new RegExp('(' + year  + ')', 'gi'), "<b>$1</b>"); // this is still needed

		return t + s + '<p />'
	    });
	    document.getElementById("context").innerHTML = formatted_text.join('\n');
	});
    })
    .on("mouseout", function (){
	console.log("saw mouseout event, resetting bar fill to default");
	d3.select(this).style("fill", ""); // change color of this bar back to default
    });

//$('#footer').css('margin-left', xWidth/2 - 180);

d3.select("#container").style("display", "block");
d3.select("#footerInfo").style("display", "block");

$('#autocomplete').focus();

//redraws graph for new match
function updateGraph(match){
        console.log("entering updateGraph, making years json outcall");

        // clear off the bottom stuff
        document.getElementById("chapterTitle").innerHTML = ''
        document.getElementById("context").innerHTML = ''

	$.getJSON("//researcher3.fnf.archive.org:8080/years", {
	    q: match
	}, function(ydata) {

	    console.log("years callback fired");
	    resetData();
	    word_sum = 0;

	    var years = ydata.error ? [] : ydata.years;

	    console.log("filling in data from callback values");
	    for (var p in years) {
		data[p-1000] = years[p]; // scatter-gather XXX fails to clip to 1000:2000
		word_sum += years[p]; // XXX so word_sum is not the same as what appears on the graph.
	    }
	    console.log("after filling in data, length is", data.length);
	    console.log("word_sum is now", word_sum);

	    var datamax = d3.max(data); // XXX fails to clip to 1000:2000
	    for( var i = 0, l = data.length; i < l; i++ ) {
		if ( data[i] > 0 ) {
		    data[i] = Math.max(data[i], datamax / (height/2.)); // if non-zero, min height is 3 pixels
		}
	    }

	    d3.select("#wordNum").text(word_sum.toLocaleString()); // sets count in visible label, prettyprinted with commas

	    if ( word_sum > 1 ) {
		document.getElementById('loadingText').innerHTML = '';
	    } else {
		document.getElementById('loadingText').innerHTML = 'Tip: Pick something out of the dropdown!<br>This demo is limited to "things" with Wikipedia articles.';
	    }

	    console.log("telling d3 about the new data");

	    x.domain([new Date("1000"), new Date("2000")]);
	    svg.select(".x.axis").call(xAxis);
	    y.domain([0, d3.max(data)]); // XXX this is over all data, not the 1000:2000 that we're actually showing ... and is a recompute of datamax
	    svg.select(".y.axis").call(yAxis);
	
	    // Alter the existing bars to new heights, with an animation
	    svg.selectAll('.bar')
		.data(data)
		.transition()
		.duration(500) // changed from 1s to 1/2s
		.attr("y", function(d){return y(d)}) // replaces a constant, the first time
		.attr("height", function(d){return height - y(d);}); // ditto
	});
};

// zeros out bar height array
function resetData(){
        data = []; // seems to fix my max problem
	for (var i = 0; i < numBars; i++){
		data[i] = 0;
	}
}

function updateWord(){
	word = $("#autocomplete").val(); // changes global
	if (word.length > 0){
		updateGraph(word); // changes the graph
		d3.select("#wordText").text(word); // sets term in visible label
		d3.select("#title").style("visibility", "visible");
	}
	else{
		d3.select("#title").style("visibility", "hidden");
	}
}

var autoclose = false;

//update graph and close autocomplete
$('#autocomplete').keyup(function(e){
	if(e.keyCode == 13)
	{
	        console.log("autocomplete keyup: saw carriage return");
		updateWord();
		$(this).autocomplete("close");
		setTimeout(function(){$('#autocomplete').autocomplete("close");}, 100);
	}
});


$( "#autocomplete" ).autocomplete({
	minLength: 0,
        delay: 100,
	select: function( event, ui ) {
		setTimeout(function(){updateWord();}, 10);
	},
	source: function( request, response ) {
	    console.log("autocomplete json outcall, q=", request.term);
	    $.getJSON("//researcher3.fnf.archive.org:8080/autocomplete", {
		q: request.term
	    }, function(adata) {
		// adata is an array of objects and must be transformed for autocomplete to use
		console.log("autocomplete json completion called");
		var array = adata.error ? [] : $.map(adata.autocomplete, function(m) {
		    return {
			label: m.label,
			number: m.number
		    };
		});
		response(array);
	    });
	}
}).data('ui-autocomplete')._renderItem = function(ul, item){
		return $( "<li>" )
//        	.append( "<a class = 'dropDown'>" + item.value + " (" + item.number + ")</a>" )
        	.append( "<a class = 'dropDown'>" + item.value + "</a>" )
        	.appendTo( ul );
	};

//firefox doesn't capture mousemove propertly?
var ffm;
function onMouseMove(e){
	ffm = [e.clientX, e.clientY];
}
document.addEventListener('mousemove', onMouseMove, false);
