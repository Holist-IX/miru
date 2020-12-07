/**
 * Starts the API calls for connecting to the IXP-Manager
 */
function docker(ui) {
    this.ui = ui;
};

docker.prototype.getLogs = function () {
    let url = window.location.origin + "/sdnixp/getLatestLogs";

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

docker.prototype.tester = function (d) {
    let phpurl = window.location.origin + "/sdnixp/generateConfig";
    $.ajax(phpurl).done(function (msg) {
            alert(msg);
        })
        .fail(function () {
            alert("something went wrong")
        })
};

docker.prototype.testerOutput = function (textarea, btns) {

    xhr = new XMLHttpRequest();
    let url = window.location.origin + "/sdnixp/testConfigWithOutput";
    var oldVal = "Starting up Athos instance.\nPlease wait...\n";
    var newVal = "";
    let me = this;
    var t = document.createTextNode(oldVal);
    textarea.append(t);
    xhr.open("GET", url, true);
    xhr.onprogress = function (e) {
        var resp = e.currentTarget.responseText;
        newVal = resp.replace(oldVal, "");
        var text = document.createTextNode(newVal);
        oldVal = resp;
        textarea.append(text);
        textarea.scrollTop = textarea.scrollHeight;

    };
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            console.log("Complete = " + xhr.responseText);
            me.addButtons(btns);
        }
    };
    xhr.send();
};

docker.prototype.addButtons = function (btns) {
    var getYamlbtn = this.createButton("Download YAML config", this.getYaml);
    btns.insertBefore(getYamlbtn, btns.firstChild);
    var getTopologyConfig = this.createButton("Download Topology json", this.getTopologyConfig);
    btns.insertBefore(getTopologyConfig, btns.firstChild);
    var getLogbtn = this.createButton("Download logs", this.getLogs);
    btns.insertBefore(getLogbtn, btns.firstChild);
};

docker.prototype.getYaml = function () {
    let url = window.location.origin + "/sdnixp/getFaucetYaml";

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
};

docker.prototype.getTopologyConfig = function () {
    let url = window.location.origin + "/sdnixp/getTopologyJson";

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
};

docker.prototype.createButton = function (label, func) {
    var button = document.createElement('button');
    mxUtils.write(button, label);
    button.className = "geBtn";
    button.onclick = func;

    return button;
}