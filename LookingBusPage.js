function sideBar() {
	$('#sidebarCollapse').on('click', function () {
		$('#sidebar').toggleClass('active');
	});
}

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

	makeChart();
}

function makeChart(){
	var options = {
		animationEnabled: true,  
		title:{ text: "Monthly Sales - 2017" },
		axisX: { valueFormatString: "MMM" },
		axisY: { title: "Sales (in USD)", prefix: "$", includeZero: false },
		data: [{
			yValueFormatString: "$#,###",
			xValueFormatString: "MMMM",
			type: "spline",
			dataPoints: [
				{ x: new Date(2017, 0), y: 25060 },
				{ x: new Date(2017, 1), y: 27980 },
				{ x: new Date(2017, 2), y: 33800 },
				{ x: new Date(2017, 3), y: 49400 },
				{ x: new Date(2017, 4), y: 40260 },
				{ x: new Date(2017, 5), y: 33900 },
				{ x: new Date(2017, 6), y: 48000 },
				{ x: new Date(2017, 7), y: 31500 },
				{ x: new Date(2017, 8), y: 32300 },
				{ x: new Date(2017, 9), y: 42000 },
				{ x: new Date(2017, 10), y: 52160 },
				{ x: new Date(2017, 11), y: 49400 }
			]
		}]
	};
	$("#chartContainer").CanvasJSChart(options);
}

var polypoints = {};
var datapoints = [];
var way_points = [];
var way_point = [];
var vechicleref = 0;
var origin = 0;
var destination = 0;
var count = 0;
var marker_bus = null;
var timings = [];

function initMap() {
	fetch('http://api.511.org/transit/timetable?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&operator_id=SC&line_id=22&format=JSON').then(function (response) {
				return response.json();
	}).then(function (obj) {
		console.log("fetch id");
		console.log(obj);
		obj.Content.ServiceFrame.routes.Route[2].pointsInSequence.PointOnRoute.forEach(function(item) {
			datapoints.push(item.PointRef.ref);
			polypoints[item.PointRef.ref] = 0;
		});
		// console.log(obj.Content.TimetableFrame[2].vehicleJourneys.ServiceJourney)
		var j = 0;
		obj.Content.TimetableFrame[2].vehicleJourneys.ServiceJourney.forEach(function(item) {
			// console.log(item)
			var i = 0;
			item.calls.Call.forEach(function(item_) {
				console.log("works")
				console.log(Date.parse(item_.Departure.Time))

				// timings[j][i++].push(Departure.getTime() - Arrival.getTime()/1000);
			});
			j++;
		});
		console.log(timings);
		// console.log(datapoints);
	}).catch(function (error) {
		console.error('Something went wrong');
	});

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
					console.log("no prop");
				}
			});
		});
		// console.log(polypoints);
		return routeDisplay();
	}).catch(function (error) {
		console.error('Something went wrong1');
	});
}

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

function calculateAndDisplayRoute(directionsService, directionsRenderer, o, d, w) {
	directionsService.route({origin: o, destination: d, waypoints: w, travelMode: 'DRIVING'},
		// origin: new google.maps.LatLng(37.44375, -122.165763),
		// destination: new google.maps.LatLng(37.424787, -122.145651),
	function(response, status) {
		if (status === 'OK') {
			directionsRenderer.setDirections(response);
			console.log("waypoints This works");
		} else {
			window.alert('Directions request failed due to ' + status);
		}
	});
}

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
						// return false;
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

function busDisplayLoc(directionsService, directionsRenderer, map) {
	const fetchPromise = fetch('http://api.511.org/transit/VehicleMonitoring?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&agency=SC&format=JSON');

	fetchPromise.then(function (response) {
		return response.json();
	}).then(function (obj) {
		// console.log("fetch VehicleMonitoring");
		// console.log(obj);
		// console.log(vechicleref);
		var vehicleactivity = obj.Siri.ServiceDelivery.VehicleMonitoringDelivery.VehicleActivity;
		console.log(vehicleactivity);
		for (var i in vehicleactivity) {
			if (vehicleactivity[i].MonitoredVehicleJourney.hasOwnProperty("VehicleRef")) {
				if(vehicleactivity[i].MonitoredVehicleJourney.VehicleRef == vechicleref){
					// console.log(Number(vehicleactivity[i].MonitoredVehicleJourney.Bearing));
					// var markers = [];
					count++
					var icon = { // car icon
						path: 'M29.395,0H17.636c-3.117,0-5.643,3.467-5.643,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759   c3.116,0,5.644-2.527,5.644-5.644V6.584C35.037,3.467,32.511,0,29.395,0z M34.05,14.188v11.665l-2.729,0.351v-4.806L34.05,14.188z    M32.618,10.773c-1.016,3.9-2.219,8.51-2.219,8.51H16.631l-2.222-8.51C14.41,10.773,23.293,7.755,32.618,10.773z M15.741,21.713   v4.492l-2.73-0.349V14.502L15.741,21.713z M13.011,37.938V27.579l2.73,0.343v8.196L13.011,37.938z M14.568,40.882l2.218-3.336   h13.771l2.219,3.336H14.568z M31.321,35.805v-7.872l2.729-0.355v10.048L31.321,35.805',
						scale: 0.8,
						fillColor: "#427af4", //<-- Car Color, you can change it 
						fillOpacity: 1,
						strokeWeight: 1,
						anchor: new google.maps.Point(0, 5),
						rotation: Number(vehicleactivity[i].MonitoredVehicleJourney.Bearing) //<-- Car angle
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

	//This promise will resolve when 60 seconds have passed (number of requests for API is 60 per 3600 seconds)
	var timeOutPromise = new Promise(function(resolve, reject) {
	  // 60 Second delay
	  setTimeout(resolve, 60000, 'Timeout Done');
	});

	Promise.all([fetchPromise, timeOutPromise]).then(function(values) {
	  console.log("Atleast 4 secs + TTL (Network/server)");
	  busDisplayLoc(directionsService, directionsRenderer, map);
	});
}
