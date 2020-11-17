/**
 * Starts the API calls for connecting to the IXP-Manager
 */
function docker(ui) {
    this.ui = ui;
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
            alert(msg);
    })
    .fail(function(){
        alert("something went wrong")
    })
}

docker.prototype.testerOutput = function(textarea) {

    xhr = new XMLHttpRequest();
    let url = window.location.origin + "/sdnixp/testConfigWithOutput";
    var oldVal = ""
    var newVal = ""
    xhr.open("GET", url, true);
    xhr.onprogress = function (e) {
        var resp = e.currentTarget.responseText;
        newVal = resp.replace(oldVal, "");
        var text = document.createTextNode(newVal);
        oldVal = resp;
        tag.appendChild(text);
        r.append(tag);
        textarea.append(text);
        textarea.scrollTop = textarea.scrollHeight;

    };
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            console.log("Complete = " + xhr.responseText);
        }
    };
    xhr.send();
}