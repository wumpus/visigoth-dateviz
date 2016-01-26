//var xWidth = Math.max(window.innerWidth - 150, 1000); // force to 1000 wide, because we want that many years to be possible
var xWidth = 1015;

var barWidth = 1; // should be an integer
var numBars = Math.floor(xWidth/barWidth); // depends on barWidth

var margin = {top: 20, right: 0, bottom: 50, left: 70};
var width = numBars*barWidth // + margin.left + margin.right; // depends on barWidth
var height = Math.max(window.innerHeight - margin.top - margin.bottom - 400, 400); // max of 400

var minDate = new Date("1000-06-01");
var maxDate = new Date("2015-06-01");

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

var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return d.year;
  })

var untip = d3.tip()
  .attr('class', 'd3-tip')
  .offset(function() {
      return [this.getBBox().height-10, 0] // same position as tip, above
  })
  .html(function(d) {
    return d.year;
  })

var svg = d3.select("#graph").append("svg")
		.attr("id", "svg")
		.attr("width", width + margin.left + margin.right) // depends on barWidth ...
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.attr("id", "transformBox");

svg.call(tip);
svg.call(untip);

// removes placeholder loading text ... most useful so you can immediately see a crash on syntax error
document.getElementById('loadingText').innerHTML = '';
document.getElementById('year').innerHTML = 'click on a year to see details';

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

// draws initial histogram bars - data is all zeroes
// set up click callback
svg.selectAll('.bar')
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d, i){return (1+i)*barWidth;})
    .attr("width", barWidth)
    .attr("y", height) // starts at bottom
    .attr("height", 0) // height of zero
    .on("click", function(){
	var cord = d3.mouse(this);
	// var year = x.invert(cord[0]).getUTCFullYear(); // not accurate enough :/
	var actual_year = this.__data__.year; // get it out of the data
	doClick(actual_year);
    })
    .on('mouseover', tip.show)
    .on('mouseout', tip.hide);

// draws initial inverted histogram bars - data is all zeroes
// set up click callback
svg.selectAll('.unbar')
    .data(data)
    .enter().append("rect")
    .attr("class", "unbar")
    .attr("x", function(d, i){return (1+i)*barWidth;})
    .attr("width", barWidth)
    .attr("y", 0) // starts at top
    .attr("height", height-1) // extends to bottom (initial data is zero) ... minus 1 to not overwrite x axis
    .on("click", function(){
	var cord = d3.mouse(this);
	// var year = x.invert(cord[0]).getUTCFullYear(); // not accurate enough :/
	var actual_year = this.__data__.year; // get it out of the data
	doClick(actual_year);
    })
    .on('mouseover', untip.show)
    .on('mouseout', untip.hide);

//$('#footer').css('margin-left', xWidth/2 - 180);

d3.select("#container").style("display", "block");
d3.select("#footerInfo").style("display", "block");

window.onpopstate = function(event) {
    console.log("XXX onpopstate fired");
    if (event.state && event.state.q) {
	console.log("XXX event.state.q is something, q=", event.state.q);
	word = event.state.q; // modifies global
	$("#autocomplete").val(event.state.q); // autocomplete box value
	console.log("XXX Firing udpateGraph inside of onpopstate");
	updateWord(event.state.q, event.state.y);
    }
};

if (history.state && history.state.q) {
    console.log("XXX history.state.q is something on pageload, q=", history.state.q);
    console.log("XXX history.state.y is something on pageload, y=", history.state.y);
    word = history.state.q; // global variable
    $("#autocomplete").val(history.state.q); // autocomplete box value
    updateWord(word, history.state.y);
}

$('#autocomplete').focus();

function doClick(year){
    console.log("click event, year=", year);

    history.replaceState( { q: word, y: year }, ""); // word is a global

    var xx = year-1000; // XXX

    if( ! data[xx].count ) {
	// if there's no data for this year, find a nearby year that has data - biggest count wins
	if ( data[xx+1].count )
	    if ( data[xx-1].count ) {
		if ( data[xx+1].count > data[xx-1].count )
		    year += 1;
		else
		    year -= 1;
	    } else
		year += 1;
	else if ( data[xx-1].count )
	    year -= 1;
	else if ( data[xx+2].count )
	    if ( data[xx-2].count ) {
		if ( data[xx+2].count > data[xx-2].count )
		    year += 2;
		else
		    year -= 2;
	    } else
		year += 2;
	else if ( data[xx-2].count )
	    year -= 2;
	else {
	    document.getElementById('year').innerHTML = 'click on a year to see details';
	    document.getElementById("context").innerHTML = '<br><br><br><br><br>';
	    return;
	}
	console.log('XXX adjusted year to year=', year);
    }

    document.getElementById('year').innerHTML = year;

    $.getJSON("//researcher3.fnf.archive.org:8080/sentences", {
	q: word, // global variable
	year: year
    }, function(sdata) {
	console.log("sentences callback fired");
	var sentences = sdata.error ? [] : sdata.sentences;

	var formatted_text = $.map(sentences, function(m) {
	    //var url_view = 'https://archive.org/stream/' + m.ia_id + '/#page/n' + m.leaf + '/mode/2up" target="_blank' // correct leaf
	    var url_details = 'https://archive.org/details/' + m.ia_id // XXX no way to specify a leaf here?

//	    var rl = ' (rank='+ m.rank + ' leaf=' + m.leaf + ')';
//	    var blank = ' target="_blank"';
	    var blank = '';
	    var rl = '';
	    var t = '<a href="' + url_details + '"' + blank + '>' + m.title + '</a>' + rl + '<p />';
	    var s = m.s.replace(new RegExp('(' + word  + ')', 'gi'), "<b>$1</b>"); // this may double-bold, but that's not a big deal
	    s = s.replace(new RegExp('(' + year  + ')', 'gi'), "<b>$1</b>"); // this is still needed

	    return t + s + '<p />'
	});
	document.getElementById("context").innerHTML = formatted_text.join('\n');
    });
};

//redraws graph for new match
function updateGraph(match, year){
        console.log("entering updateGraph, making years json outcall");

        // clear off the bottom stuff
        document.getElementById('year').innerHTML = 'click on a year to see details';
        document.getElementById("context").innerHTML = '<br><br><br><br><br>';

        // set state so that the back button does something reasonable -- no year yet
        var state = { q: match };
        if (year) {
	    state.y = year;
	}
        console.log("calling replaceState with state=", JSON.stringify(state));
        history.replaceState(state, "");

	$.getJSON("//researcher3.fnf.archive.org:8080/years", {
	    q: match
	}, function(ydata) {

	    console.log("years callback fired");
	    resetData();
	    word_sum = 0;

	    var years = ydata.error ? [] : ydata.years;

	    console.log("filling in years from callback values");
	    for (var p in years) {	
		var position = p - 1000;
		if (position < 0 || position > 1015)
		    continue;
		data[position] = {};
		data[position].count = years[p];
		data[position].year = p;
		word_sum += years[p];
	    }
	    console.log("after filling in years data, length is", data.length);
	    console.log("word_sum is now", word_sum);

	    datamax = Math.max.apply(Math, data.map(function(o){return o.count ? o.count : 0;}))
	    console.log("XXX new-method datamax is", datamax);

	    for( var i = 0, l = data.length; i < l; i++ ) {
		if ( data[i].count > 0 ) {
		    data[i].count = Math.max(data[i].count, datamax / (height/2.)); // if non-zero, min height is 3 pixels
		}
	    }

	    d3.select("#wordNum").text(word_sum.toLocaleString()); // sets count in visible label, prettyprinted with commas

	    if ( word_sum > 1 ) {
		document.getElementById('loadingText').innerHTML = '';
	    } else {
		document.getElementById('loadingText').innerHTML = 'Tip: Pick something out of the autocomplete dropdown!<br>This demo is limited to "things" with Wikipedia articles.';
	    }

	    console.log("telling d3 about the new data");

	    x.domain([new Date("1000-06-01"), new Date("2015-06-01")]);
	    svg.select(".x.axis").call(xAxis);
	    y.domain([0, datamax]);
	    svg.select(".y.axis").call(yAxis);
	
	    // Alter the existing bars to new heights, with an animation
	    svg.selectAll('.bar')
		.data(data)
		.transition()
		.duration(500) // changed from 1s to 1/2s
		.attr("y", function(d){return y(d.count)}) // replaces a constant, the first time
		.attr("height", function(d){return height - y(d.count);}); // ditto

	    // Alter the existing unbars to new heights, with an animation
	    svg.selectAll('.unbar')
		.data(data)
		.transition()
		.duration(500) // changed from 1s to 1/2s
		.attr("y", function(d){return 0;}) // replaces a constant, the first time
		.attr("height", function(d){return y(d.count)-1;}); // ditto

	    if (history.state && history.state.y)
		doClick(history.state.y);
	});
};

// zeros out bar height array
function resetData(){
        data = []; // seems to fix my max problem
	for (var i = 0; i < numBars; i++){
		data[i] = { count: 0, year: i+1000 };
	}
}

function updateWord(w, y){
        if (w) {
	    word = w;
	} else {
	    word = $("#autocomplete").val(); // changes global
        }
	if (word.length > 0){
		updateGraph(word, y); // changes the graph
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
//        	.append( "<a class = 'dropDown'>" + item.value + " (" + item.number + ")</a>" ) // with popularity
        	.append( "<a class = 'dropDown'>" + item.value + "</a>" )
        	.appendTo( ul );
	};
