function display() {
    let url = encodeURI("sdnixp/generateConfig");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "text/plain"
            });
            a.href = URL.createObjectURL(file);
            a.download = "faucet.txt";
            a.click();
            // alert(data);
            if (!document.getElementById("done")) {
                appendLinks();
            }
        })
        .fail(function () {
            alert("Something went wrong");
        });
}

function appendLinks() {
    var a = document.getElementById("toAdd");
    var funcs = ["getYaml()", "getTopology()", "getLogs()"];
    var textList = [
        "Download faucet.yaml",
        "Download topology.json",
        "Download latest log",
    ];

    index = 0;

    for (var f of funcs) {
        var r = document.createElement("div");
        r.setAttribute("class", "row tw-mb-6");
        var btn = document.createElement("a");
        btn.setAttribute("class", "btn btn-white ml-2");
        btn.setAttribute("onclick", f);
        btn.text = textList[index];
        r.appendChild(btn);
        a.appendChild(r);
        index++;
    }
    var r = document.createElement("div");
    r.setAttribute("class", "row tw-mb-6");
    r.setAttribute("id", "done");
    a.appendChild(r);
}

function getYaml() {
    let url = encodeURI("sdnixp/getFaucetYaml");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "text/plain"
            });
            a.href = URL.createObjectURL(file);
            a.download = "faucet.yaml";
            a.click();
        })
        .fail(function () {
            alert("Something went wrong");
        });
}

function getTopology() {
    let url = encodeURI("sdnixp/getTopologyJson");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "text/plain"
            });
            a.href = URL.createObjectURL(file);
            a.download = "topology.json";
            a.click();
        })
        .fail(function () {
            alert("Something went wrong");
        });
}

function getLogs() {
    let url = encodeURI("sdnixp/getLatestLogs");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "text/plain"
            });
            a.href = URL.createObjectURL(file);
            a.download = "logs.txt";
            a.click();
        })
        .fail(function () {
            alert("Something went wrong");
        });
}

function getXML() {
    let url = encodeURI("sdnixp/getXML");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "text/plain"
            });
            a.href = URL.createObjectURL(file);
            a.download = "graph.xml";
            a.click();
        })
        .fail(function () {
            alert("Something went wrong");
        });
}

function openMxGraph() {
    let url = window.location.origin + "/mxgraph";
    window.open(url, "_self");
}