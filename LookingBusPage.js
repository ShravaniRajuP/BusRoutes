// Global Variables
var polypoints = {};
var datapoints = [];
var way_points = [];
var way_point = [];
var vechicleref = 0;
var origin = 0;
var destination = 0;
var count = 0;
var marker_bus = null;
var timing_Departure = [];
var timing_Arrival = [];

// sideBar open & close
function sideBar() {
	$('#sidebarCollapse').on('click', function () {
		$('#sidebar').toggleClass('active');
	});
}

// bottomDrawer open, close, animations, etc
function bottomwDrawer() {
	$("#bottomdrawer").mCustomScrollbar({
		theme: "minimal"
	});

	$('#dismiss, .overlay').on('click', function () {
		$('#bottomdrawer').removeClass('active');
		$('.overlay').removeClass('active');
	});
	
	$('#bottomdrawerCollapse').on('click', function () {
		$('#bottomdrawer').addClass('active');
		$('.overlay').addClass('active');
		$('.collapse.in').addClass('in');
		$('a[aria-expanded=true]').attr('aria-expanded', 'false');
	});
}

// making Stops vs Time Chart, holds different lines for different parts of the day 
function makeChart(){
	var dps1 = [];
	var dps2 = [];
	var dps3 = [];
	var stops = ["PAT-Cal", "Cal-Sh", "Sh-Cas", "Cas-Su_Sa", "Su_Sa-W", "Wo-Ke", "Ke-SCTC", "SCT-AN", 
				"AN-SC1st", "SC-KAR", "KAR-KS", "KS-ETC"];
	for (var i=1; i < timing_Departure[0].length; i++) {
		dps1.push({y: ((-timing_Departure[0][i-1] + timing_Arrival[0][i])/60), label: stops[i-1]});
	}
	for (var i=1; i < timing_Departure[Math.floor(timing_Departure.length/3)].length; i++) {
		dps2.push({y: ((-timing_Departure[Math.floor(timing_Departure.length/3)][i-1] + timing_Arrival[Math.floor(timing_Departure.length/3)][i])/60), label: stops[i-1]});
	}
	for (var i=1; i < timing_Departure[timing_Departure.length-1].length; i++) {
		dps3.push({y: ((-timing_Departure[timing_Departure.length-1][i-1] + timing_Arrival[timing_Departure.length-1][i])/60), label: stops[i-1]});
	}
	// console.log(dps1);
	// console.log(dps2);
	// console.log(dps3);

	var options = {
		animationEnabled: true,  
		title:{ text: "Time  vs  Pairs of Stops" },
		axisX: { valueFormatString: "0" },
		axisY: { title: "Time", includeZero: false },
		legend: { fontSize: 20, fontFamily: "tamoha", fontColor: "Sienna"},
		data: [
			{
				showInLegend: true,
            	xValueFormatString: "MMMMMMM",
            	yValueFormatString: "## minutes",
				legendText: "Morning",
				type: "spline",
				color: "#0AB49B",
				// color:"#FF0000",
				dataPoints: dps1
			}, {
				showInLegend: true,
            	xValueFormatString: "MMMMMMM",
            	yValueFormatString: "## minutes",
				legendText: "Midday",
				type: "spline",
				color: "#C41920",
				// color:"#0000FF",
				dataPoints: dps2
			}, {
				showInLegend: true,
            	xValueFormatString: "MMMMMMM",
            	yValueFormatString: "## minutes",
				legendText: "Night",
				type: "spline",
				color: "#FD9620",
				// color: "#00FF00",
				dataPoints: dps3
		}]
	};
	$("#chartContainer").CanvasJSChart(options);
}

// Map Initialization
function initMap() {
	// Fetching Stop Reference IDs of Stops that come into one route
	fetch('http://api.511.org/transit/timetable?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&operator_id=SC&line_id=22&format=JSON').then(function (response) {
				return response.json();
	}).then(function (obj) {
		// console.log("fetch id");
		// console.log(obj);
		// Storing Stop Ref IDs in an array object ... 
		obj.Content.ServiceFrame.routes.Route[2].pointsInSequence.PointOnRoute.forEach(function(item) {
			datapoints.push(item.PointRef.ref);
			polypoints[item.PointRef.ref] = 0;
		});
		// console.log(datapoints);
		// Storing Expected Arrival & Departure times for Stops
		var j = 0;
		obj.Content.TimetableFrame[2].vehicleJourneys.ServiceJourney.forEach(function(item) {
			// console.log(item)
			timing_Departure.push([])
			timing_Arrival.push([])
			item.calls.Call.forEach(function(item_) {
				// console.log("works")
				timing_Departure[j].push(Number(Date.parse("2011-10-11T"+item_.Departure.Time))/1000);
				timing_Arrival[j].push(Number(Date.parse("2011-10-11T"+item_.Arrival.Time))/1000);
			});
			j++;
		});
		// console.log("Time");
		// console.log(timing_Departure[0]);

		// Start making the chart, now that all data is available
		makeChart();
	}).catch(function (error) {
		console.error('Something went wrong');
	});

	// Fetching Object that holds all Details about Stops (Choosing stops belonging to one route)
	fetch('http://api.511.org/transit/stops?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&operator_id=SC&format=JSON').then(function (response) {
		return response.json();
	}).then(function (obj) {
		// console.log("fetch Loc");
		// console.log(obj);
		obj.Contents.dataObjects.ScheduledStopPoint.forEach(function(item) {
			// console.log(item);
			// console.log(item.Location);
			datapoints.forEach(function(point) {
				// console.log("works");
				if(item.hasOwnProperty("id")){
					// console.log("prop");
					if(item.id == point){
						// console.log("if");
						polypoints[point] = item;
					} else{
						// console.log("else");
						return;
					}
				} else {
					console.log("no such property");
				}
			});
		});
		// console.log(polypoints);
		return routeDisplay();
	}).catch(function (error) {
		console.error('Something went wrong');
	});
}

// Start drawing the possible Route between Stops
function routeDisplay() {
	var directionsService = new google.maps.DirectionsService();
	var directionsRenderer = new google.maps.DirectionsRenderer();
	// console.log("routeDisplay");
	// console.log(polypoints);
	midpoint = datapoints[Math.floor(datapoints.length/2)];
	
	var route = new google.maps.LatLng(polypoints[midpoint].Location.Latitude, polypoints[midpoint].Location.Longitude);
	var map = new google.maps.Map(document.getElementById('map'), { zoom: 10, center: route });
	directionsRenderer.setMap(map);

	origin = new google.maps.LatLng(polypoints[datapoints[0]].Location.Latitude, polypoints[datapoints[0]].Location.Longitude);
	destination = new google.maps.LatLng(polypoints[datapoints[datapoints.length-1]].Location.Latitude, polypoints[datapoints[datapoints.length-1]].Location.Longitude);

	for(var i = 1; i < datapoints.length-1; i++){
		way_points.push({location: new google.maps.LatLng(polypoints[datapoints[i]].Location.Latitude, polypoints[datapoints[i]].Location.Longitude)});
	}   
	
	calculateAndDisplayRoute(directionsService, directionsRenderer, origin, destination, way_points);
	busDisplayRef(directionsService, directionsRenderer, map);    
}

// Directions API used to draw route between stops
function calculateAndDisplayRoute(directionsService, directionsRenderer, o, d, w) {
	directionsService.route({origin: o, destination: d, waypoints: w, travelMode: 'DRIVING'},
		// origin: new google.maps.LatLng(37.44375, -122.165763),
		// destination: new google.maps.LatLng(37.424787, -122.145651),
	function(response, status) {
		if (status === 'OK') {
			directionsRenderer.setDirections(response);
			// console.log("waypoints This works");
		} else {
			window.alert('Directions request failed due to ' + status);
		}
	});
}

// Draw Bus (car here) Icon & show it moving around as per real-time data
// Here, any one bus is selected first, and that bus is followed till it reaches the end of the route, and so on
// Only one side is selected for simplicity & to prevent confusions
function busDisplayRef(directionsService, directionsRenderer, map) {
	fetch('http://api.511.org/transit/StopMonitoring?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&agency=SC&format=JSON').then(function (response) {
		return response.json();
	}).then(function (obj) {
		// console.log("fetch StopMonitoring");
		// console.log(obj);
		var mSV = obj.ServiceDelivery.StopMonitoringDelivery.MonitoredStopVisit;
		for(var i in mSV){
			// console.log(mSV);
			if(mSV[i].MonitoredVehicleJourney.hasOwnProperty("OriginRef") && mSV[i].MonitoredVehicleJourney.hasOwnProperty("DestinationRef")){
					console.log("prop");
					if(mSV[i].MonitoredVehicleJourney.OriginRef == 60328 && mSV[i].MonitoredVehicleJourney.DestinationRef == 65812){
						console.log("if Palo Alto");
						vechicleref = mSV[i].MonitoredVehicleJourney.VehicleRef;
						console.log(vechicleref);
						break; 
					// } else if(mSV[i].MonitoredVehicleJourney.OriginRef == 65812 && mSV[i].MonitoredVehicleJourney.DestinationRef == 60328){
					//     console.log("if Eastridge");
					//     vechicleref = mSV[i].MonitoredVehicleJourney.VehicleRef;
					//     break;
					} 
					else{
						console.log("else");
						continue;
					}
				} else {
					console.log("no prop");
				}
		}
		busDisplayLoc(directionsService, directionsRenderer, map);
	}).catch(function (error) {
		console.error('Something went wrong');
	});
}

// Fetch Real-time Vehicle location coordinates & place the bus icon in that position until timeout
function busDisplayLoc(directionsService, directionsRenderer, map) {
	const fetchPromise = fetch('http://api.511.org/transit/VehicleMonitoring?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&agency=SC&format=JSON');

	fetchPromise.then(function (response) {
		return response.json();
	}).then(function (obj) {
		// console.log("fetch VehicleMonitoring");
		// console.log(obj);
		// console.log(vechicleref);
		var vehicleactivity = obj.Siri.ServiceDelivery.VehicleMonitoringDelivery.VehicleActivity;
		// console.log(vehicleactivity);
		for (var i in vehicleactivity) {
			if (vehicleactivity[i].MonitoredVehicleJourney.hasOwnProperty("VehicleRef")) {
				if(vehicleactivity[i].MonitoredVehicleJourney.VehicleRef == vechicleref){
					count++
					var icon = {
						path: 'M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759   c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806L34.05,14.188z    M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713   v4.492l-2.73-0.349V14.502L15.741,21.713z M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336   h13.771l2.219,3.336H14.568z M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805',
						scale: 0.8,
						fillColor: "#427af4",
						fillOpacity: 1,
						strokeWeight: 1,
						anchor: new google.maps.Point(0, 5),
						rotation: Number(vehicleactivity[i].MonitoredVehicleJourney.Bearing) 
					};

					var point = new google.maps.LatLng(vehicleactivity[i].MonitoredVehicleJourney.VehicleLocation.Latitude, vehicleactivity[i].MonitoredVehicleJourney.VehicleLocation.Longitude);
					way_point.push({location: point});
					console.log(way_point);
					origin = new google.maps.LatLng(polypoints[datapoints[0]].Location.Latitude, polypoints[datapoints[0]].Location.Longitude);

					if(count != 1){
						// calculateAndDisplayRoute(directionsService, directionsRenderer, origin, point, way_point);
						marker_bus.setPosition(point);
						if(point == origin || point == destination){
							busDisplayRef(map);
						} 
					} else {
						// calculateAndDisplayRoute(directionsService, directionsRenderer, origin, point, way_point);
						marker_bus = new google.maps.Marker({
							position: point,
							icon: icon,
							map: map
						});
					}
					break;
				} else {
					console.log("no vehicleref");
					continue;
				}
			} else {
				console.log("no prop");
			}
		}
	}).catch(function (error) {
		console.error('Something went wrong');
	});

	// Timeout to make sure API limit is not exceeded
	//This promise will resolve when 60 seconds have passed (number of requests for API is 60 per 3600 seconds)
	var timeOutPromise = new Promise(function(resolve, reject) {
	  // 60 Second delay
	  setTimeout(resolve, 61000, 'Timeout Done');
	});

	Promise.all([fetchPromise, timeOutPromise]).then(function(values) {
	  console.log("Atleast 60 secs + TTL (Network/server)");
	  busDisplayLoc(directionsService, directionsRenderer, map);
	});
}
