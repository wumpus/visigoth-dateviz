//var xWidth = Math.max(window.innerWidth - 150, 1000); // 1000 wide, because 
var xWidth = 1000; // so we know it's 1 pixel = 1 year

var barWidth = 1;
var numBars = Math.floor(xWidth/barWidth); // depends on barWidth
console.log("numBars is", numBars);

var margin = {top: 20, right: 0, bottom: 20, left: 70},
	width = numBars*barWidth + margin.left + margin.right, // depends on barWidth
	height = Math.max(window.innerHeight - margin.top - margin.bottom - 400, 400);
console.log("width is", width);
console.log("height is", height);

var y = d3.scale.linear()
		.range([height, 0]);

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

// create y axis
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "translate("+ (-100/2) +","+(height/2)+")rotate(-90)") // -80 => -100
    .style("text-anchor", "middle")
    .attr("font-size",'110%')
    .text("count by year");

// draws histogram bars - zeroes
// set up mouseover effect callback
svg.selectAll('.bar')
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d, i){return (1+i)*barWidth;})
    .attr("width", barWidth)
    .attr("y", height)
    .attr("height", 0)
    .on("mouseover", function(){
	var cord = d3.mouse(this);
	d3.select(this).style("fill", "#435A82"); // change color of this bar

	var cord_x = Math.floor(cord[0]/barWidth);
	var cord_y = Math.floor(y.invert(cord[1]));
	console.log("saw mouseover event in the graph, x,y are ", cord_x, cord_y);

        var year = cord_x + 999; // does this need to be a global? XXX does it need to be 1000?
	console.log("mouseover event, year=", year);
	document.getElementById("chapterTitle").innerHTML = year;

	// bail out if there's no data for this year -- shouldn't happen, but it does :-/ XXX

	// now go fetch the actual sentences, and have the callback stuff them in "context"

	console.log("firing getJSON for sentences for year ",year);

	$.getJSON("//researcher3.fnf.archive.org:8080/sentences", {
	    q: word, // global variable
	    year: year
	}, function(sdata) {

	    console.log("sentences callback fired");

	    var sentences = sdata.error ? [] : sdata.sentences;
	    var formatted_text = $.map(sentences, function(m) {
		var t = '<a href="https://archive.org/stream/' + m.ia_id + '/#page/n' + m.leaf + '/mode/2up" target="_blank">' + m.title + '</a> rank='+ m.rank + '<p />';
		var s = m.s.replace(new RegExp('(' + word  + ')', 'gi'), "<b>$1</b>"); // this may double-bold XXX
		s = s.replace(new RegExp('(' + year  + ')', 'gi'), "<b>$1</b>"); // this is still needed

//		console.log("formatted one sentence as", t + s + '<p />');

		return t + s + '<p />'
	    });
	    document.getElementById("context").innerHTML = formatted_text.join('\n');
	});
    })
    .on("mousemove", function(){			
    })
    .on("mouseout", function (){
	console.log("saw mouseout event, resetting bar fill to default");
	d3.select(this).style("fill", ""); // change color of this bar back to default
    });

// draw X-axis bars -- alternating black/white, leftover from this page's whale origins
for (var i = 1000; i < 2000; i++) {
    svg.append("rect")
	.attr("class", "chapter " + (i%2 ? 'light' : 'dark')) // alternates every time
	.attr("x", (i - 999) * barWidth) // may be off by one? XXX
	.attr("height", 7) // 7 pixels tall
	.attr("width", barWidth) // all are the same width
	.attr("y", height)
	.attr("titleOfChapter", i) // label is actually year
	.on('mouseover', function(){
	    console.log("mouseover event in the year bar");
	    // XX this cord is wrong, scroll the page and it doesn't appear where it belongs!
	    var cord = (typeof event === 'undefined') ? ffm : [event.pageX, event.pageY]; // FireFox bugfix, see ffm at bottom
	    tooltip.style("top", (cord[1]-10)+"px").style("left",(cord[0]+10)+"px");
	    tooltip.style("visibility", "visible");
	    tooltip.text(d3.select(this)[0][0].attributes[5].value);
	    d3.select(this).style("fill", "#422813");
	})
	.on("mousemove", function(e){
	    var cord = (typeof event === 'undefined') ? ffm : [event.pageX, event.pageY];
	    tooltip.style("top", (cord[1]-10)+"px").style("left",(cord[0]+10)+"px");
	})
	.on("mouseout", function (){
	    tooltip.style("visibility", "hidden");
	    d3.select(this).style("fill","");
	});

}

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
		data[p-1000] = years[p]; // scatter-gather
		word_sum += years[p];
	    }
	    console.log("after filling in data, length is", data.length);
	    console.log("word_sum is now", word_sum);

	    var datamax = d3.max(data);
	    for( var i = 0, l = data.length; i < l; i++ ) {
		if ( data[i] > 0 ) {
		    data[i] = Math.max(data[i], datamax / (height/2.)); // if non-zero, min height is 3 pixels
		}
	    }

	    d3.select("#wordNum").text(word_sum); // sets count in visible label

	    if ( word_sum > 1 ) {
		document.getElementById('loadingText').innerHTML = '';
	    } else {
		document.getElementById('loadingText').innerHTML = 'Tip: Pick something out of the dropdown.<br>This demo is limited to things with Wikipedia articles.';
	    }

	    console.log("telling d3 about the new data");

	    y.domain([0, d3.max(data)]);
	    svg.select(".y.axis").call(yAxis);
	
	    svg.selectAll('.bar')
		.data(data)
		.transition()
		.duration(500) // one second? changed to 1/2
		.attr("y", function(d){return y(d)})
		.attr("height", function(d){return height - y(d);});			
	});
};

//0s out bar height array
function resetData(){
        console.log("setting data to zero");
        console.log("numBars is", numBars);
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

//firefox doesn't capture mousemove propertly
var ffm;
function onMouseMove(e){
	ffm = [e.clientX, e.clientY];
}
document.addEventListener('mousemove', onMouseMove, false);
