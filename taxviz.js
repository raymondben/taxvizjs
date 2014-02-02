var http=require("http");
var url=require("url");
var fs=require("fs");
var csv = require("fast-csv");

var allrecords=[];
var show_debug=false;
var webdir=process.cwd()+"/web/";

// set up web server
var webserver = http.createServer(webrequest);

webserver.on("error", function() {
    // problem with the web server ... quite possibly another process already is listening on that port
    console.log('cannot start server, aborting');
    process.exit(1);
});


// load the layout file and insert into db
if (show_debug) console.log("Loading CSV data ... ")
csv(webdir+"labels_animalia.csv",{headers:true})
 .on("data", function(data){
     // convert from string to number as needed
     data.x=Number(data.x);
     data.y=Number(data.y);
     data.zmin=Number(data.zmin);
     data.zmax=Number(data.zmax);
     data.red=Number(data.red);
     data.green=Number(data.green);
     data.blue=Number(data.blue);
     data.size=Number(data.size);
     allrecords.push(data);
 })
 .on("end", function(){
     if (show_debug) console.log("done");
     // start the web server now that we have the data loaded
     webserver.listen(8081, function() {
	 if (show_debug) console.log("Server started on port 8081");
     });
 })
 .parse();

function webrequest(req,res) {
    try {
	dispatch(req,res);
    } catch (err) {
	console.log("Web error: " + err);
	res.writeHead(500);
	res.end('Internal Server Error');
    }
}


dispatch = function(req, res) {
    
    var serverError = function(code, content) {
	res.writeHead(code, {'Content-Type': 'text/plain'});
	res.end(content);
    }
    
    var renderHtml = function(content,fileext) {
	var result;
	if (fileext=="html") {
	    content=content.toString();
	}
	// specify appropriate mime-type and encoding, and deliver content
	if (fileext=='png') {
	    res.writeHead(200, {'Content-Type': 'image/png'});
	    res.end(content);
	} else if (fileext=='gif') {
	    res.writeHead(200, {'Content-Type': 'image/gif'});
	    res.end(content);
	} else if (fileext=='jpg') {
	    res.writeHead(200, {'Content-Type': 'image/jpeg'});
	    res.end(content);
	} else if (fileext=='js') {
	    res.writeHead(200, {'Content-Type': 'application/x-javascript'});
	    res.end(content, 'utf-8');
	} else if (fileext=='css') {
	    res.writeHead(200, {'Content-Type': 'text/css'});
	    res.end(content, 'utf-8');
	} else if (fileext=='json') {
	    res.writeHead(200, {"Content-Type": "application/json"});
	    res.end(JSON.stringify(content));
	} else {
	    res.writeHead(200, {'Content-Type': 'text/html'});
	    res.end(content, 'utf-8');
	}
    }
    
    var url_parts=url.parse(req.url, true);

    var find_all=function(query) {
	console.log("query:");
	console.dir(query);
	var this_records=[];
	for (var i=0; i<allrecords.length; i++) {
	    var doc=allrecords[i];
	    if (doc.zmin<=query.z && doc.zmax>=query.z && doc.x>=query.xmin && doc.x<=query.xmax && doc.y>=query.ymin && doc.y<=query.ymax) {
		this_records.push(doc);
	    }
	}
	outstr=JSON.stringify(this_records);
	renderHtml(outstr,"json");
    }	

    // does action match a defined action?
    if (url_parts.pathname=="/labels") {
	// extract labels from allrecords
	var query=url_parts.query;
	query.xmin=Number(query.xmin);
	query.xmax=Number(query.xmax);
	query.ymin=Number(query.ymin);
	query.ymax=Number(query.ymax);
	query.z=Number(query.z);
	
	find_all(query);

    } else {
	// deliver file content
	var parts = req.url.split('/'); 
	var filename=webdir + parts.slice(1).join("/");
	if (req.url == "/") {
	    filename=webdir + "index.html";
	}
	if (! fs.existsSync(filename)) {
	    serverError(404, '404 Bad Request for ' + filename);
	} else {
	    fs.readFile(filename, function(error, content) {
		if (error) {
		    serverError(500);
		} else {
		    var fileext=filename.split(".").slice(-1);
		    renderHtml(content, fileext);
		}
	    });
	}
    }	
}

