/**
 * Copyright (c) 2021, Christoff Visser
 */
/**
 * Starts the API calls for connecting to the IXP Manager
 */
/**
 * API calls to Miru as intermediate to use Athos
 * @constructor
 * @param {EditorUi} ui - mxgraph EditorUi
 */
function docker(ui) {
    this.ui = ui;
};

/**
 * Retrieves the latest logs from Athos
 */
docker.prototype.getLogs = function () {
    let url = window.location.origin + "/miru/getLatestLogs";

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

/**
 * Runs an Athos instance with no output
 * @param {*} d
 */
docker.prototype.tester = function (d) {
    let phpurl = window.location.origin + "/miru/generateConfig";
    $.ajax(phpurl).done(function (msg) {
            alert(msg);
        })
        .fail(function () {
            alert("something went wrong")
        })
};

/**
 * Runs Athos and stores the output in the textarea
 * @param {object} textarea - Textarea to add result messages back
 * @param {Array} btns      - Buttons array to add done buttons to
 */
docker.prototype.testerOutput = function (textarea, btns) {

    xhr = new XMLHttpRequest();
    let url = window.location.origin + "/miru/testConfigWithOutput";
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

/**
 * Runs deployment function within Miru
 */
docker.prototype.deploy = function () {
    // Reuses the textbox used when testing with output
    textarea = document.getElementById("testOutput");
    textarea.innerHTML = "";
    xhr = new XMLHttpRequest();
    let url = window.location.origin + "/miru/deploy";
    var oldVal = "Starting deploy process.\nPlease wait...\n";
    var newVal = "";
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
            console.log("Result = " + xhr.responseText);
        }
    };
    xhr.send();
};

/**
 * Adds download buttons to array of existing buttons
 * @param {Array} btns  - Array of btns to which the new buttons are to be added to
 */
docker.prototype.addButtons = function (btns) {
    // Change button depending if Urge or faucet config is being used
    if (use_urge) {
        var getConfigButton = this.createButton("Download OF config rules", this.getOFRules);
    } else {
        var getConfigButton = this.createButton("Download YAML config", this.getYaml);
    }
    btns.insertBefore(getConfigButton, btns.firstChild);
    var getTopologyConfig = this.createButton("Download Topology json", this.getTopologyConfig);
    btns.insertBefore(getTopologyConfig, btns.firstChild);
    var getLogbtn = this.createButton("Download logs", this.getLogs);
    btns.insertBefore(getLogbtn, btns.firstChild);
    // Checks if deploy function is set up in Miru
    if (d_en) {
        var deployButton = this.createButton("Deploy config", this.deploy);
        btns.insertBefore(deployButton, btns.firstChild);
    }
};

/**
 * Retrieves the latest faucet Config that was generated
 */
docker.prototype.getYaml = function () {
    let url = window.location.origin + "/miru/getFaucetYaml";

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

/**
 * Retrieves the latest set of OpenFlow rules that Urge generated
 */
docker.prototype.getOFRules = function () {
    let url = window.location.origin + "/miru/getOF";

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {
                type: "application/zip"
            });
            a.href = URL.createObjectURL(file);
            a.download = "rules.zip";
            a.click();
        })
        .fail(function () {
            alert("Something went wrong");
        });
};

/**
 * Retrieves the latest topology config that was generated
 */
docker.prototype.getTopologyConfig = function () {
    let url = window.location.origin + "/miru/getTopologyJson";

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

/**
 * Wrapper to create a button with a label and function
 * @param {string} label    - Label to add to the button
 * @param {object} func     - Function to call when button is clicked
 */
docker.prototype.createButton = function (label, func) {
    var button = document.createElement('button');
    mxUtils.write(button, label);
    button.className = "geBtn";
    button.onclick = func;

    return button;
}