/**
 * Starts the API calls for connecting to the IXP-Manager
 */
function docker(ui) {
    this.tester();
};

docker.prototype.getLogs = function () {
    let url = window.location.origin + "/faucet/getLatestLogs";
    console.log(url);
    var result = null;
    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([msg], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'logs.txt';
            a.click();
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function testReq(d) {
    let phpurl = window.location.origin + "/faucet/testReq";

    var t = {"this": "works"}
    $.ajax({
        url: phpurl,
        type: "POST",
        data: d,
    }).done(function(msg){
        console.log(msg)
            var a = document.createElement("a");
            var file = new Blob([msg], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'logs.txt';
            a.click();
    })
    .fail(function(){
        alert("something went wrong")
    })
}


docker.prototype.tester = function(d) {
    let phpurl = window.location.origin + "/faucet/generateConfig";
    $.ajax(phpurl).done(function(msg){
        console.log(msg)
            // var a = document.createElement("a");
            // var file = new Blob([msg], {type: 'text/plain'});
            // a.href = URL.createObjectURL(file);
            // a.download = 'logs.txt';
            // a.click();
            alert(msg);
    })
    .fail(function(){
        alert("something went wrong")
    })
}