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

function initMap() {            
    fetch('http://api.511.org/transit/timetable?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&operator_id=SC&line_id=22&format=JSON').then(function (response) {
                return response.json();
    }).then(function (obj) {
        // console.log("fetch id");
        // console.log(obj);
        obj.Content.ServiceFrame.routes.Route[2].pointsInSequence.PointOnRoute.forEach(/*myfunction);*/function(item) {
            // console.log(item.PointRef.ref)
            datapoints.push(item.PointRef.ref);
            polypoints[item.PointRef.ref] = 0;
            // polypoints.push({
            //     key: item.PointRef.ref,
            //     value: " "
            // });
        });
        console.log(datapoints);
        // var route = new google.maps.LatLng(37.7749, 122.4194);
        // var mapProp= { center: route, zoom: 13, };
        // var map = new google.maps.Map(document.getElementById("googleMap"),mapProp);
        // var marker = new google.maps.Marker({position: route, map: map});
    }).catch(function (error) {
        console.error('Something went wrong');
    });

    fetch('http://api.511.org/transit/stops?api_key=08baff0c-3159-436f-8bf1-d97dd5273def&operator_id=SC&format=JSON').then(function (response) {
        return response.json();
    }).then(function (obj) {
        console.log("fetch Loc");
        console.log(obj);
        // for(var x in datapoints){
        //     console.log(datapoints[x]);
        // }
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
        console.log(polypoints);
        console.log(datapoints[Math.floor(datapoints.length/2)]);
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
    var map = new google.maps.Map(document.getElementById('map'), { zoom: 15, center: route });
    directionsRenderer.setMap(map);

    // only first & last point
    var origin = new google.maps.LatLng(polypoints[datapoints[0]].Location.Latitude, polypoints[datapoints[0]].Location.Longitude);
    var destination = new google.maps.LatLng(polypoints[datapoints[datapoints.length-1]].Location.Latitude, polypoints[datapoints[datapoints.length-1]].Location.Longitude);

    for(var i = 1; i < datapoints.length-1; i++){
        var marker = new google.maps.Marker({position: new google.maps.LatLng(polypoints[datapoints[i]].Location.Latitude, polypoints[datapoints[i]].Location.Longitude), map: map});
        way_points.push({
            location: new google.maps.LatLng(polypoints[datapoints[i]].Location.Latitude, polypoints[datapoints[i]].Location.Longitude)});
    }   
    console.log(way_points);
     calculateAndDisplayRoute(directionsService, directionsRenderer, origin, destination);
    
}

function calculateAndDisplayRoute(directionsService, directionsRenderer, o, d) {
    directionsService.route({
        origin: o, destination: d, waypoints: way_points, optimizeWaypoints: true,
        travelMode: 'DRIVING'
    },
    function(response, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            console.log("waypoints This works");
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}