/** 
 * Constructs the Umbrella object for the given ui
 */
function Umbrella(editorUi) {
    this.editorUi = editorUi;
    this.umbrella = new Object();
    this.links = [];
    this.coreLinks = {};
    this.coreSwitches = [];
    this.switches = [];
    this.link_nodes = [];
    this.hosts = [];
    this.vlans = {};
    this.faucetObject = {};
    this.addressToPort = {};
    this.spfGraphing = new spfGraph();
    this.groupID = 0;
    this.splitChar = ".";
    this.topology = new Object();
    this.init()
}

Umbrella.prototype.init = function () {
    var ui = this.editorUi;
    var editor = ui.editor;
    this.faucetObject.dps = {};
    this.faucetObject.vlans = {};
    this.faucetObject.acls = {};
    var graphXML = editor.getGraphXml();

    for (var node of graphXML.childNodes[0].childNodes) {
        var id = node.id;

        if (node.hasAttribute('link')) {
            // console.log(id + " is a link node");
            
            var linkSpeed = node.hasAttribute('speed') ? node.getAttribute('speed') : 10000;
            var link = {
                'link': node.getAttribute('link'),
                'speed': linkSpeed
            };
            this.links.push(link);
        } else if (node.hasAttribute('switch')) {
            // console.log(id + " is a switch node");
            this.processSwitch(node);
        } else {
            console.log(id + " is a rubbish");
        }
    }
    this.SPFOrganise();

    for (var edge of this.link_nodes) {
        this.spfGraphing.addEdge(edge[0], edge[1], edge[2]);
    }
    this.tidyCoreLinks();
    this.generateACLS();
    // console.log(this.faucetObject);
    var yamlObj = jsyaml.dump(this.faucetObject);

    this.cleanYaml(yamlObj)
    this.topogenerator()
};

Umbrella.prototype.processSwitch = function (switchNode) {
    var swname = switchNode.getAttribute('switch');
    this.switches.push(swname);
    // if (!switchNode.hasAttribute('dpid')) {
    //     console.log("WARN: Switch " + switchNode.getAttribute('name') +
    //         " is not a OF switch.\n" +
    //         "No faucet config will be generated for this switch");
    //     return
    // }
    if (switchNode.hasAttribute('core')){
        var isCore = switchNode.getAttribute('core');
        if (isCore){
            this.coreSwitches.push(swname);
            return;
        }
    }
    if (!switchNode.hasAttribute('dpid')) {
        // console.log("WARN: Switch " + switchNode.getAttribute('name') +
        //     " is not a OF switch.\n" +
        //     "No faucet config will be generated for this switch");

        switchNode.setAttribute("dpid", switchNode.getAttribute('swid'))
    }

    this.faucetObject.dps[swname] = {};
    this.faucetObject.dps[swname].dp_id = parseInt(switchNode.getAttribute('dpid'), 10);
    var aclNum = parseInt(switchNode.getAttribute('dpid'), 10);
    this.faucetObject.acls[aclNum] = [];
    this.faucetObject.dps[swname].hardware = switchNode.getAttribute('hardware');
    this.faucetObject.dps[swname]['interfaces'] = {};
    this.addressToPort[swname] = {};

    for (var child of switchNode.children) {
        if (child.localName == "interfaces") {
            for (var iface of child.childNodes) {
                if (iface.nodeName == "iface") {

                    if (iface.hasAttribute('Core')){
                        // console.log(`Skipping core port specified on switch`);
                        continue;
                    }
                    var port = Number(iface.getAttribute('port'));
                    var pname = iface.getAttribute("name");
                    var linkname =  pname + ",port1.0.1," + swname +
                                    ",port " + port;

                    var link = {
                        'link': linkname,
                        'speed': iface.getAttribute('speed')
                    };

                    this.links.push(link);     
                    var tagged_vlans = []
                    var native_vlan = null;
                    for (var vlan of iface.children){
                        var vid = parseInt(vlan.getAttribute('vid'),10);
                        var ipv4 = vlan.getAttribute('ipv4_address');
                        this.addressToPort[swname][ipv4] = {
                            'port': port,
                            'addr_type': 'ipv4',
                            'name': pname
                        }

                        var ipv6 = vlan.getAttribute('ipv6_address');
                        if (ipv6 != 'undefined') {
                            this.addressToPort[swname][ipv6] = {
                                'port': port,
                                'addr_type': 'ipv6',
                                'name': pname
                            }
                        }

                        var mac = vlan.getAttribute('macaddresses');
                        this.addressToPort[swname][mac] = {
                            'port': port,
                            'addr_type': 'mac',
                            'name': pname
                        }
                        // console.log(iface)
                        if (iface.getAttribute("tagged") == "true"){
                            tagged_vlans.push(vid);
                            this.addressToPort[swname][mac].vlan = vid;
                            this.addressToPort[swname][ipv4].vlan = vid;
                            this.addressToPort[swname][ipv6].vlan = vid;
                        } else {
                            native_vlan = vid
                        }

                        if (!this.faucetObject.vlans.hasOwnProperty(vlan.getAttribute('vlan_name'))) {
                            this.faucetObject.vlans[vlan.getAttribute('vlan_name')] = {
                                'vid': vid,
                                'description': vlan.getAttribute('vlan_description'),
                            }
                        }

                    }
                    this.faucetObject.dps[swname]['interfaces'][port] = {
                        'name': pname,
                        'acl_in': parseInt(switchNode.getAttribute('dpid'), 10)
                    }
                    if (native_vlan){
                        this.faucetObject.dps[swname]['interfaces'][port].native_vlan = native_vlan;
                    }
                    if (tagged_vlans.length > 0){
                        this.faucetObject.dps[swname]['interfaces'][port].tagged_vlans = tagged_vlans;
                    }
                }
            }
        }
    }
};


Umbrella.prototype.SPFOrganise = function () {
    for (var link of this.links) {
        var cost = 100000 / (parseInt(link['speed']));
        var nodes = link['link'].split(',');
        this.link_nodes.push([nodes[0], nodes[2], cost])
    }
};

Umbrella.prototype.generateACLS = function () {
    for (var sw of Object.entries(this.addressToPort)) {
        var swName = sw[0];
        this.groupID = Math.ceil(this.groupID / 1000) * 1000;
        var aclNum = this.faucetObject.dps[swName]['dp_id'];
        portToAddresses = {};
        for ([addr, details] of Object.entries(sw[1])) {
            portToAddresses[details.port] = portToAddresses[details.port] || {}
            switch (details.addr_type) {
                case "ipv4":
                    portToAddresses[details.port].ipv4 = addr
                    break;
                case "ipv6":
                    portToAddresses[details.port].ipv6 = addr
                    break;
                case "mac":
                    portToAddresses[details.port].mac = addr
                    break;
            }
        }
        for ([port, details] of Object.entries(portToAddresses)){
            if (details.ipv4) {
                this.ownIPv4ACL(details.ipv4, port, aclNum, details.mac);
            }
            if (details.ipv6) {
                this.ownIPv6ACL(details.ipv6, port, aclNum, details.mac);
            }
            this.ownMacACL(details.mac, port, aclNum);
            this.portToMacACL(details.mac, port, aclNum);
        }
        for (var otherSW of Object.entries(this.addressToPort)) {
            var otherSWName = otherSW[0]
            if (swName == otherSWName) {
                continue;
            }
            for ([addr, details] of Object.entries(otherSW[1])) {
                var route = this.djikistra(this.spfGraphing, swName, details.name);
                if (route.length < 4) {
                    var ports = [];
                    var otherPorts = [];
                    for (var [port, entry] of Object.entries(this.coreLinks[swName])) {
                        p = parseInt(port, 10);
                        if (entry.hasOwnProperty(otherSWName)) {
                            ports.push(p);
                        } else {
                            otherPorts.push(p);
                        }
                    }
                    ports = ports.concat(otherPorts);

                    switch (details.addr_type) {
                        case "ipv4":
                            this.otherIPv4ACL(addr, ports, aclNum);
                            break;
                        case "ipv6":
                            this.otherIPv6ACL(addr, ports, aclNum);
                            break;
                        case "mac":
                            this.otherMacACL(addr, ports, aclNum);
                            break;
                    }
                } else {
                    this.umbrellaACL(addr, details.addr_type, aclNum,
                        route, swName)
                }
            }
        }
    }
};


Umbrella.prototype.umbrellaACL = function (addr, addr_type, aclNum, route, sw) {

    var outPort = 0;
    var ports = [];
    var prevHop = "";
    for (var hop of route) {
        if (hop == sw) {
            prevHop = hop;
            continue;
        }
        if (hop == route[route.length -1]) {
            var lastPort = this.addressToPort[prevHop][addr].port;
            ports.push(lastPort);
            continue;
        }
        // console.log(this.coreLinks)
        if (prevHop) {
            for ([port, details] of Object.entries(this.coreLinks[prevHop])) {
                if (details.hasOwnProperty(hop)) {
                    if (prevHop == sw) {
                        outPort = port;
                    } else {
                        ports.push(port);
                    }
                }
            }
        }
        prevHop = hop;
    }
    var route_len = route.length - 2;
    var hop_count = 0;
    var last_mac = ""
    while (hop_count < route_len) {
        for (var i = ports.length; i < 6; i++){
            ports.push(0)
        }

        var mac = "";
        count = 1;
        for (var port of ports) {
            var portnum = parseInt(port);
            var portStr = portnum.toString(16);
            if (portStr.length == 1) {
                portStr = "0" + portStr;
            }
            mac += portStr;
            if (count < ports.length) {
                mac += ":"
                count++;
            }
        }
        outPort = parseInt(outPort, 10);
        if (hop_count == 0) {
            switch (addr_type) {
                case "ipv4":
                    this.umbrellaIPv4ACL(addr, outPort, aclNum, mac);
                    break;
                case "ipv6":
                    this.umbrellaIPv6ACL(addr, outPort, aclNum, mac);
                    break;
                case "mac":
                    this.umbrellaMacACL(addr, outPort, aclNum, mac);
                    break;
            }
            last_mac = mac;
            outPort = ports.shift();
            hop_count+=1;
        } else {
            var tempsw = route[hop_count];
            if (!this.coreSwitches.includes(tempsw))
            {
                var tempacl = this.faucetObject.dps[tempsw]['dp_id'];
                this.umbrellaMacACL(last_mac, outPort, tempacl, mac);
            }
            ports.shift();
            last_mac = mac;
            outPort = ports[0];
            hop_count+=1;
        }
    }
}


Umbrella.prototype.tidyCoreLinks = function () {
    // TODO: Organise core links
    for (var sw of this.switches) {
        this.coreLinks[sw] = {};
    }
    var vlan = Object.entries(this.faucetObject.vlans)

    var vid = vlan[0][1].vid;
    for (var link of this.links) {
        var linkNodes = link['link'].split(',');
        if (this.switches.includes(linkNodes[0]) &&
            this.switches.includes(linkNodes[2])) {

            var sw1 = linkNodes[0];
            var sw1Port = linkNodes[1].split(this.splitChar)[2];
            var sw2 = linkNodes[2];
            var sw2Port = linkNodes[3].split(this.splitChar)[2];

            this.coreLinks[sw1][sw1Port] = this.coreLinks[sw1][sw1Port] || {};
            this.coreLinks[sw1][sw1Port][sw2] = sw2Port;
            this.coreLinks[sw2][sw2Port] = this.coreLinks[sw2][sw2Port] || {};
            this.coreLinks[sw2][sw2Port][sw1] = sw1Port;

            if (this.faucetObject.dps.hasOwnProperty(sw1)){
                
                this.faucetObject.dps[sw1]['interfaces'][sw1Port] = {
                'name': link['link'],
                'opstatus_reconf': false,
                'acl_in': this.faucetObject.dps[sw1].dp_id,
                'native_vlan': vid
                }
            }
            
            if (this.faucetObject.dps.hasOwnProperty(sw2)){
            
                this.faucetObject.dps[sw2]['interfaces'][sw2Port] = {
                    'name': link['link'],
                    'opstatus_reconf': false,
                    'acl_in': this.faucetObject.dps[sw2].dp_id,
                    'native_vlan': vid
                }
            }
        }
    }
};


Umbrella.prototype.djikistra = function (graph, initial, end) {

    var shortestPaths = {};
    shortestPaths[initial] = [false, 0];
    var current_node = initial;
    var visited = new Set();

    while (current_node != end) {
        visited.add(current_node)
        var destinations = graph.edges[current_node];
        var weightToCurrentNode = shortestPaths[current_node][1]

        for (var nextNode of destinations) {
            var weight = graph.weights[current_node][nextNode] + weightToCurrentNode;
            if (!shortestPaths.hasOwnProperty(nextNode)) {
                shortestPaths[nextNode] = [current_node, weight];
            } else {
                var currentShortestWeight = shortestPaths[nextNode][1]
                if (currentShortestWeight > weight) {
                    shortestPaths[nextNode] = [current_node, weight];
                }
            }
        }

        var nextDestinations = [];
        for (var obj of Object.entries(shortestPaths)) {
            if (!visited.has(obj[0])) {
                o = {};
                o[obj[0]] = obj[1];
                nextDestinations.push(o);
            }
        }
        if (nextDestinations.length < 1) {
            return ("Route Not Possible");
        }
        current_node = nextDestinations.reduce(
            (acc, loc) =>
            acc[1] < loc[1] ? acc : loc);
        current_node = Object.keys(current_node)[0]
    }

    var path = [];
    while (current_node) {
        path.push(current_node);
        nextNode = shortestPaths[current_node][0];
        current_node = nextNode;
    }
    path.reverse();
    return (path);
};


Umbrella.prototype.ownIPv4ACL = function (addr, port, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "set_fields":[{
                        "eth_dst": mac
                    }],
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.ownIPv6ACL = function (addr, port, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "set_fields":[{
                        "eth_dst": mac
                    }],
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.ownMacACL = function (addr, port, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.otherIPv4ACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};

Umbrella.prototype.otherIPv6ACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};


Umbrella.prototype.otherMacACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaIPv4ACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaIPv6ACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaMacACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.portToMacACL = function (addr, port, acl_num) {

    portStr = port.toString(16);
    if (portStr.length == 1) {
        portStr = "0" + portStr;
    }
    mac = portStr + ":00:00:00:00:00";
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": mac,
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": String(addr)
                    }],
                    "port": port
                }
            }
        }
    });
};



Umbrella.prototype.cleanYaml = async function(yamlObj){
    var ports = new Set();
    for(var[swname, sw] of Object.entries(this.faucetObject.dps)){;
        for(var [port, details] of Object.entries(sw.interfaces)){
            ports.add(parseInt(port), 10);
        }
    }
    for(var acl of Object.keys(this.faucetObject.acls)){
        ports.add(parseInt(acl), 10);
    }
    
    var cleanYaml = await this.removeQuotesFromKeys(ports, yamlObj).then(
        result => {
            return result;
        }
    )
    // console.log(cleanYaml);
    this.saveYaml(cleanYaml);
}

Umbrella.prototype.removeQuotesFromKeys = function(ports, yamlDirty){
    return new Promise((resolve, reject) => {
        var result = yamlDirty;
        for(var id of ports){
            var reg = new RegExp("\'" + id + "\'" , "g");
            result = result.replace(reg, id.toString())
        }
        resolve(result);
    });
}

Umbrella.prototype.topogenerator = function(){
    var host_matrix = new Object();
    this.topology.hosts_matrix = [];
    this.topology.switch_matrix = {};
    this.topology.switch_matrix.dp_ids = {};
    this.topology.switch_matrix.links = [];
    this.topology.switch_matrix.p4 = this.coreSwitches;
    var host_matrix = {};
    var seen_ports = []
    for (sw of Object.entries(this.addressToPort)) {
        if (!sw) {
            continue
        }
        sw_name = sw[0]
        clean_sw = sw_name.replace(/[\W_]+/g,"");
        trunc_sw = clean_sw.substring(0,8);
        for ([addr, details] of Object.entries(sw[1])){
            var raw_port = this.faucetObject.dps[sw_name]['interfaces'][details.port]["name"];
            var clean_port = raw_port.replace(/[\W_]+/g,"");
            var short_p = clean_port.substring(0,8);
            if (!seen_ports.includes(short_p)){
                host_matrix[short_p] = host_matrix[short_p] || {};
                seen_ports.push(short_p);
            }
            host_matrix[short_p][trunc_sw] = host_matrix[short_p][trunc_sw] || {}
            var vid = null;
            if (details.vlan){
                vid = details.vlan;
            }
            vid = vid || 0;
            host_matrix[short_p][trunc_sw][vid] = host_matrix[short_p][trunc_sw][vid] || {};
            host_matrix[short_p][trunc_sw][vid].vid = host_matrix[short_p][trunc_sw][vid].vid || vid;
            host_matrix[short_p][trunc_sw][vid].switch =  host_matrix[short_p][trunc_sw][vid].switch || trunc_sw;
            host_matrix[short_p][trunc_sw][vid].port = details.port;
            switch (details.addr_type) {
                case "ipv4":
                    host_matrix[short_p][trunc_sw][vid].ipv4 = addr + "/16";
                    break;
                case "ipv6":
                    host_matrix[short_p][trunc_sw][vid].ipv6 = addr + "/64";
                    break;
                case "mac":
                    host_matrix[short_p][trunc_sw][vid].mac = addr;
                    break;
            }
        }
        this.topology.switch_matrix.dp_ids[trunc_sw] = this.faucetObject.dps[sw_name].dp_id;
    }
    for (var p of seen_ports) {
        var host  = new Object()
        host.name = p
        host.interfaces = []
        // console.log(host_matrix)
        for ([sw, swdet] of Object.entries(host_matrix[p])) {

            for ([vid, details] of Object.entries(swdet)){
                var iface = new Object();
                if (vid != 0){
                    iface.vlan = vid
                }
                if (details.ipv4){
                    iface.ipv4 = details.ipv4;
                }
                if (details.ipv6){
                    iface.ipv6 = details.ipv6;
                }
                iface.mac = details.mac;
                iface.swport = details.port;
                iface.switch = details.switch;

                host.interfaces.push(iface);
            }
        }
        this.topology.hosts_matrix.push(host);
    }
    for (var link of this.links) {
        var linkNodes = link['link'].split(',');
        if (this.switches.includes(linkNodes[0]) &&
            this.switches.includes(linkNodes[2])) {

            var sw1 = linkNodes[0];
            var sw1Port = linkNodes[1].split(this.splitChar)[2];
            var sw2 = linkNodes[2];
            var sw2Port = linkNodes[3].split(this.splitChar)[2];
            this.topology.switch_matrix.links.push([sw1, sw1Port, sw2, sw2Port])
        }
    }
    this.saveTopo(this.topology);
    this.saveXml();
}

Umbrella.prototype.saveYaml = function(yamlObj){
    let phpurl = window.location.origin + "/faucet/saveFaucet";
    var d = String(yamlObj)
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": d},
    }).done(function(msg){
        // console.log("save faucet success")
        // console.log(msg)
        alert("faucet config generated successfully. Saved to the push-on-green module")
    })
    .fail(function(msg){
        console.log("something went wrong in saving faucet")
        console.log(msg)
    })
};

Umbrella.prototype.saveTopo = function(topo){
    let phpurl = window.location.origin + "/faucet/saveTopo";
    d = JSON.stringify(topo);
    dstring = String(d);
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": dstring}
    }).done(function(msg){
        console.log("save topo success")
        // console.log(msg)
    })
    .fail(function(msg){
        console.log("something went wrong in saving topo")
        console.log(msg)
    })
};

Umbrella.prototype.saveXml = function(){
    xmlfile = mxUtils.getXml(this.editorUi.editor.getGraphXml());
    let phpurl = window.location.origin + "/faucet/saveXML";
    dstring = String(xmlfile);
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": dstring}
    }).done(function(msg){
        console.log("save XML success")
        // console.log(msg)
    })
    .fail(function(msg){
        console.log("something went wrong in saving topo")
        console.log(msg)
    })
}


class spfGraph {
    constructor() {
        this.edges = {};
        this.weights = {};
        this.detectedEdges = new Set();
    }

    addEdge(fromNode, toNode, weight) {
        this.edges[fromNode] = this.edges[fromNode] || [];
        this.edges[toNode] = this.edges[toNode] || [];
        this.edges[fromNode].push(toNode);
        this.edges[toNode].push(fromNode);
        if (!this.detectedEdges.has(fromNode)) {
            this.weights[fromNode] = {};
            this.detectedEdges.add(fromNode);
        };
        if (!this.detectedEdges.has(toNode)) {
            this.weights[toNode] = {};
            this.detectedEdges.add(toNode);
        }
        this.weights[fromNode][toNode] = weight;
        this.weights[toNode][fromNode] = weight;
    }
}