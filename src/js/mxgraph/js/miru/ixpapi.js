/**
 * Starts the API calls for connecting to the IXP-Manager
 */
/**
 * IXP Manager API to retrieve switch details
 * @constructor
 * @param {EditorUi} ui - mxgraph EditorUI
 */
function ixpapi(ui) {
    this.editorUi = ui;
    this.api_url = window.location.origin + "/api/v4/";
    this.details = {};
    this.id_to_name = new Object();
    this.splitChar = ".";
    this.xmlSwitches = [];

};

/**
 * Makes the necessary API calls to get all the needed switch information
 */
ixpapi.prototype.apiCalls = async function () {
    this.details.switches = {};
    var me = this;    
    // Loops through switches in async to prevent race conditions
    async function loop(me) {
        for (var sw_id of Object.values(switches)) {
            id = await me.getSwitchDetails(sw_id).then(
                swid => {
                    // Stops if there is no switch found
                    if(!swid){
                        return null;
                    }
                    swname = me.id_to_name[swid];
                    return swid;
                }
            );
            if(id){
                await Promise.all([me.getVlans(id), me.getPorts(id, swname),
                                   me.getLayer2Interfaces(id, swname)])
            }
        }
    }
    await loop(me);
    // Add switch object to the sidebar
    this.addToSidebar();
};

/**
 * Retrieves a switch's name, hostname, ipv4/6 address and whether it is active
 * @param {number} id 
 */
ixpapi.prototype.getSwitchDetails = function (id) {
    return new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();
        request.open('GET',
            `${this.api_url}provisioner/switch/switch-id/${id}.json`, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send();
        request.onload = () => {
            if (request.status == 404) {
                resolve(null);
            }
            else {
                resolve(this.processSwitch(request.response));
            }

        }
        request.onerror = function () {
            if (request.status == 404) {
                reject("No switch found with id:" + id);
            } else {
                reject("There was an error: " + request);
            }
        }
    })
};

/**
 * Processes switch details and start building switch objects
 * @param {string} data - Response data in JSON
 */
ixpapi.prototype.processSwitch = function (data) {
    if (data) {
        parsed = JSON.parse(data);
        sw = parsed.switch;
        id = sw.id;
        swname = sw.name;
        this.id_to_name[id] = sw.name;
        this.details.switches[swname] = sw;
        this.details.switches[swname].swid = id;
        this.details.switches[swname]["interfaces"] = {}
        return id;
    } else {
        console.log("Something went wrong. No data detected!")
        return;
    }
};

/**
 * Retrieves all the vlans found on a switch
 * @param {number} id - ID of the switch in IXP Manager
 */
ixpapi.prototype.getVlans = function (id) {
    var request = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        request.open('GET',
            `${this.api_url}provisioner/vlans/switch-id/${id}.json`, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send();
        request.onload = () => {
            if (request.status == 404) {
                reject("No switch found with id:" + id);
            }
            resolve(this.processVlans(request.response));
        }
        request.onerror = () => {
            console.log("There was an error")
            console.log(request);
            reject("There was an error");
        }
    });
};

/**
 * Process the vlan information retrieved in the API response
 * @param {string} data - Request response with JSON containing VLAN info
 */
ixpapi.prototype.processVlans = function (data) {
    parsed = JSON.parse(data);
    this.details.vlans = this.details.vlans || {};
    for (vlan of parsed.vlans) {
        this.details.vlans[vlan.tag] = {
            "vid": vlan.tag,
            "name": vlan.name,
            "description": vlan.config_name,
            "private": vlan.private
        };
    }
};

/**
 * Retrieves all the ports information, including core and inactive ports
 * @param {number} id       - ID of the switch for the API call
 * @param {string} swname   - Name of the switch for API call
 */
ixpapi.prototype.getPorts = function (id, swname) {

    return new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();
        request.open('GET',
            `${this.api_url}switch/${id}/ports`, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send();
        request.onload = () => {
            if (request.status == 404) {
                reject("No switch found with id:" + id);
            }
            resolve(this.processPorts(request.response, swname));
        }
        request.onerror = () => {
            console.log("There was an error")
            console.log(request);
            reject("There was an error")
        }
    });
};

/**
 * Processes the retrieved ports of a switch and designate internal ports
 * @param {string} data     - Request response with JSON containing port infp
 * @param {string} swname   - Name of the switch that the ports belong to
 */
ixpapi.prototype.processPorts = function (data, swname) {
    parsed = JSON.parse(data);

    for (port of parsed.switchports) {
        if (port.sp_type_name == "Core") {
            port_name = Number((port.sp_ifName).split(this.splitChar)[2]);
            this.details.switches[swname].interfaces[port_name] = {
                "name": port.sp_name,
                "core": true,
                "configured": true
            };
            continue
        }

        // if (port.sp_type_name == "Unset") {
        //     port_name = Number((port.sp_ifName).split(this.splitChar)[2]);
        //     this.details.switches[swname].interfaces[port_name] = {
        //         "name": port.sp_name,
        //         "configured": false
        //     };
        // }
    }
    return;
};

/**
 * Retrieves all the layer2 and member/customer info for a switch
 * @param {number} id       - ID of the switch in IXP Manager
 * @param {string} swname   - Name of the switch in IXP Manager
 */
ixpapi.prototype.getLayer2Interfaces = async function (id, swname) {
    return new Promise((resolve, reject) => {
        var request = new XMLHttpRequest();
        request.open('GET',
            `${this.api_url}provisioner/layer2interfaces/switch/${id}.json`, 
            true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send();
        request.onload = () => {
            if (request.status == 404) {
                reject("No switch found with id:" + id);
            }
            resolve(this.processLayer2Interfaces(request.response, swname));
        }
        request.onerror = () => {
            console.log("There was an error");
            console.log(request);
            reject("There was an error");
        }
    });
};

/**
 * Processes all the member details connected to a switch
 * @param {string} data     - Request response with JSON containing members info
 * @param {string} swname   - Name of the switch that the members are connected to
 */
ixpapi.prototype.processLayer2Interfaces = async function (data, swname) {
    parsed = JSON.parse(data);
    if (parsed.layer2interfaces.length == 0){
        this.details.switches[swname].core = true;
        return;
    }
    for (iface of parsed.layer2interfaces) {
        port_name = Number((iface.name).split(this.splitChar)[2]);
        if (port_name) {
            this.details.switches[swname].interfaces[port_name] = {}
            var port = this.details.switches[swname].interfaces[port_name];
            port.speed = iface.speed;
            port.tagged = iface.dot1q;
            port.configure = true;
            port.vlans = {};
            for (vlan of iface.vlans) {
                mac = vlan.macaddresses;
                ipv4 = vlan.ipaddresses.ipv4
                ipv6 = vlan.ipaddresses.ipv6

                port.name = iface["description"];
                port.vlans[vlan.number] = {
                    "macaddresses": mac,
                    "ipv4_addresses": ipv4,
                    "ipv6_addresses": ipv6
                };
            }
        }
    }

    return
};

/**
 * Adds the switch objects to the sidebar
 */
ixpapi.prototype.addToSidebar = async function () {
    var doc = mxUtils.createXmlDocument();
    var container = document.getElementsByClassName("geSidebarContainer")[0];
    var child = container.firstElementChild;
    var height = 60;
    var width = 120;
    var switches = new Array();

    while (child) {
        container.removeChild(child)
        child = container.firstElementChild;
    }
    var SB = new Sidebar(this.editorUi, container);

    for (var [sw, data] of Object.entries(this.details.switches)) {
        var switchNode = doc.createElement("switch");
        var swi = new Object();
        swi.name = sw;
        swi.links = new Array();

        var me = this;
        async function proc(me) {
            for (var [attr, val] of Object.entries(data)) {
                if (attr === "interfaces") {
                    var iface = doc.createElement("interfaces");

                    async function ports(iface) {
                        for (var [port, values] of Object.entries(val)) {
                            var portNode = doc.createElement("iface");
                            links = new Object();
                            links.link = values.name;
                            links.port = port;
                            links.speed = values.speed;
                            swi.links.push(links);
                            portNode.setAttribute("name", values.name);
                            portNode.setAttribute("port", port);
                            portNode.setAttribute("tagged", values.tagged)
                            portNode.setAttribute("speed", values.speed);
                            if (values.hasOwnProperty('vlans')) {
                                var count = 0;
                                for (var [vid, vlan] of Object.entries(values.vlans)) {
                                    var vlanObj = doc.createElement("vlan");
                                    vlanObj.setAttribute(`vid`, vid);
                                    vlanObj.setAttribute(`vlan_name`, 
                                            me.details.vlans[vid].name);
                                    vlanObj.setAttribute("vlan_private", 
                                            me.details.vlans[vid].private);
                                    vlanObj.setAttribute("vlan_description", 
                                            me.details.vlans[vid].description);
                                    vlanObj.setAttribute("macaddresses", 
                                            vlan.macaddresses[0]);
                                    vlanObj.setAttribute("ipv4_address", 
                                            vlan.ipv4_addresses);
                                    vlanObj.setAttribute("ipv6_address", 
                                            vlan.ipv6_addresses);
                                    portNode.appendChild(vlanObj)
                                }
                            }

                            if (!values.hasOwnProperty('vlans')) {
                                portNode.setAttribute("Core", "true")
                            }

                            iface.appendChild(portNode);
                        }
                    }
                    await ports(iface);
                    switchNode.appendChild(iface);
                } else if (attr === "name") {
                    switchNode.setAttribute("switch", val);

                    switchNode.setAttribute('label', val);

                } else {
                    switchNode.setAttribute(attr, val);
                }
            }
        }
        await proc(me);
        var style = "rounded=0;whiteSpace=wrap;html=1;";
        swi.id = id;
        this.xmlSwitches.push(SB.createVertexTemplateEntry(style, width, height, 
                        switchNode, swi.name, null, null, 'rect rectangle box'))

        switches.push(swi);
    }

    var expand = true;
    SB.addPaletteFunctions('Switches', 'Switches', (expand != null) ? expand : true, this.xmlSwitches);
};

/**
 * Gets the XML details for the graph to be used and restored later
 * @param {Editor} editor - mxgraph editor
 */
ixpapi.prototype.getXML = function(editor){
    let phpurl = window.location.origin + "/sdnixp/getXML"
    var request = new XMLHttpRequest();
    request.open('GET', phpurl, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send();
    request.onload = () => {
        if (request.status == 404){
            console.log("error url not found");
            return null;
        }
        else {
            try{
                var doc = mxUtils.parseXml(request.response);
		        editor.graph.setSelectionCells(editor.graph.importGraphModel(doc.documentElement));
            }
            catch{
                console.log("Error in graph xml, or no graph xml detected");
            }
        }

    }
}