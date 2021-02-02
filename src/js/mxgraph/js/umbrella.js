/** 
 * Constructs the Umbrella object for the given ui
 */
/**
 * Umbrella faucet and topology generator
 * @constructor
 * @param {EditorUI} editorUi - mxgraph EditorUI
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
    this.done = false;
    this.failed = false
    // this.init();
}

/**
 * Initialise the config generator and runs generates all the configs
 */
Umbrella.prototype.init = function () {
    var ui = this.editorUi;
    var editor = ui.editor;
    this.faucetObject.dps = {};
    this.faucetObject.vlans = {};
    this.faucetObject.acls = {};
    var graphXML = editor.getGraphXml();

    for (var node of graphXML.childNodes[0].childNodes) {
        var id = node.id;
        // Organises the all of the links between switches
        if (node.hasAttribute('link')) {
            
            // If no link speed is detected we assume it is 1GB speeds
            var linkSpeed = node.hasAttribute('speed') ? node.getAttribute('speed') : 10000;
            var link = {
                'link': node.getAttribute('link'),
                'speed': linkSpeed
            };
            this.links.push(link);
        } else if (node.hasAttribute('switch')) {

            this.processSwitch(node);
        } else {
            console.log(id + " is a rubbish");
        }
    }
    // Organises using Shortest Path first
    this.SPFOrganise();
    for (var edge of this.link_nodes) {
        this.spfGraphing.addEdge(edge[0], edge[1], edge[2]);
    }

    this.tidyCoreLinks();
    this.generateACLS();
    var yamlObj = jsyaml.dump(this.faucetObject);
    this.cleanYaml(yamlObj);
    this.topogenerator();
};

/**
 * Process the XML node into a faucet config node
 * @param {Object} switchNode - XML Switch node
 */
Umbrella.prototype.processSwitch = function (switchNode) {
    var swname = switchNode.getAttribute('switch');
    this.switches.push(swname);
    if (switchNode.hasAttribute('core')){
        var isCore = switchNode.getAttribute('core');
        if (isCore){
            this.coreSwitches.push(swname);
            return;
        }
    }
    // We make the assumption that dpid's are the same as switch ids for testing
    // dpids NEED to be specified in graph for production
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

    // Organises the members connected to a switch
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

/**
 * Parses and organises host/switch nodes and gives a cost based on link speed
 */
Umbrella.prototype.SPFOrganise = function () {
    for (var link of this.links) {
        var cost = 100000 / (parseInt(link['speed']));
        var nodes = link['link'].split(',');
        this.link_nodes.push([nodes[0], nodes[2], cost])
    }
};

/**
 * Generate all the ACLS for the faucet config
 */
Umbrella.prototype.generateACLS = function () {
    for (var sw of Object.entries(this.addressToPort)) {
        var swName = sw[0];
        this.groupID = Math.ceil(this.groupID / 1000) * 1000;
        var aclNum = this.faucetObject.dps[swName]['dp_id'];
        portToAddresses = {};
        for ([addr, details] of Object.entries(sw[1])) {
            portToAddresses[details.port] = portToAddresses[details.port] || {}
            // Allows ipv4 and ipv6 addresses to be optional
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
                // No MAC rewrite needed for short paths
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

/**
 * Generates an ACL based on Umbrella mac path encoding
 * @param {string} addr         - The address to process
 * @param {string} addr_type    - The address type (ipv4,ipv6 or mac)
 * @param {number} aclNum       - The ACL number to use
 * @param {Array} route         - Route from destination node to source node
 * @param {Object} sw           - Switch the ACL is being generated
 */
Umbrella.prototype.umbrellaACL = function (addr, addr_type, aclNum, route, sw) {

    var outPort = 0;
    var ports = [];
    var prevHop = "";
    for (var hop of route) {
        // Ensure we're not sending the packet to itself
        if (hop == sw) {
            prevHop = hop;
            continue;
        }
        // Encodes the last port that will be used
        if (hop == route[route.length -1]) {
            var lastPort = this.addressToPort[prevHop][addr].port;
            ports.push(lastPort);
            continue;
        }
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

/**
 * Finds core links and add redundancy rules to them
 */
Umbrella.prototype.tidyCoreLinks = function () {
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

/**
 * Find route between initial and end node using Djikstra's shortest path first
 * @param {*} graph 
 * @param {*} initial 
 * @param {*} end 
 */
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

/**
 * Writes the IPv4 rule for the node that is directly connected to the switch
 * @param {string} addr     - IPv4 address of the connected node
 * @param {number} port     - Port the member is connected to
 * @param {number} acl_num  - Acl number associated for the rule
 * @param {string} mac      - MAC address of the connected node
 */
Umbrella.prototype.ownIPv4ACL = function (addr, port, acl_num, mac) {
    // Rewrites the mac address from broadcast to the address of the node
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

/**
 * Writes the IPv6 rule for the node that is directly connected to the switch
 * @param {string} addr     - IPv6 address of the connected node
 * @param {number} port     - Port the member is connected to
 * @param {number} acl_num  - Acl number associated for the rule
 * @param {string} mac      - MAC address of the connected node
 */
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

/**
 * Writes the mac rule for the node that is directly connected to the switch
 * @param {string} addr     - IPv6 address of the connected node
 * @param {number} port     - Port the member is connected to
 * @param {number} acl_num  - Acl number associated for the rule
 * @param {string} mac      - MAC address of the connected node
 */
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

/**
 * Writes the IPv4 rule for a node not directly connected to the switch
 * @param {string} addr     - IPv4 address of the node
 * @param {number} ports    - Ports connected to other switches [main,backup]
 * @param {number} acl_num  - Acl number associated with the rule
 */
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

/**
 * Writes the IPv6 rule for a node not directly connected to the switch
 * @param {string} addr     - mac address of the node
 * @param {number} ports    - Ports connected to other switches [main,backup]
 * @param {number} acl_num  - Acl number associated with the rule
 */
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

/**
 * Writes the mac rule for a node not directly connected to the switch
 * @param {string} addr     - IPv4 address of the node
 * @param {number} ports    - Ports connected to other switches [main,backup]
 * @param {number} acl_num  - Acl number associated with the rule
 */
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

/**
 * Writes the IPv4 path encoding rule based on umbrella
 * @param {string} addr     - IPv4 address of the node 
 * @param {number} outPort  - Port to send the packet out
 * @param {number} acl_num  - Acl number associated with the rule
 * @param {string} mac      - Encoded mac path
 */
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

/**
 * Writes the IPv6 path encoding rule based on umbrella
 * @param {string} addr     - IPv6 address of the node 
 * @param {number} outPort  - Port to send the packet out
 * @param {number} acl_num  - Acl number associated with the rule
 * @param {string} mac      - Encoded mac path
 */
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

/**
 * Writes the mac path encoding rule based on umbrella
 * @param {string} addr     - mac address of the node 
 * @param {number} outPort  - Port to send the packet out
 * @param {number} acl_num  - Acl number associated with the rule
 * @param {string} mac      - Encoded mac path
 */
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

/**
 * Writes the rule to change from path encoding to real mac address
 * @param {string} addr     - Mac address of the destination node
 * @param {number} port     - Port that the node is connected to
 * @param {number} acl_num  - Acl number the rule is associated with
 */
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

/**
 * Resolves issues with JS yaml not being fully YAML compliant
 * @param {string} yamlObj  - YAML string with our faucet config
 */
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
    // Need to remove quotes from keys as this breaks YAML with numbers
    var cleanYaml = await this.removeQuotesFromKeys(ports, yamlObj).then(
        result => {
            return result;
        }
    )
    this.saveYaml(cleanYaml);
}

/**
 * Removes the quotes surrounded keys that are numbers
 * @param {Array} ports         - Set of ports associated with the switch
 * @param {string} yamlDirty    - Old YAML string
 * @returns {string }           - Cleaned YAML string that is now compliant
 */
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

/**
 * Generates a topology file used within Athos
 */
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

/**
 * Sends the Faucet config to Miru to save
 * @param {string} yamlObj  - Faucet config to save
 */
Umbrella.prototype.saveYaml = function(yamlObj){
    let phpurl = window.location.origin + "/sdnixp/saveFaucet";
    var d = String(yamlObj)
    var me = this;
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": d},
    }).done(function(msg){
        // Checks whether it is generating configs and running Athos together
        var textArea = document.getElementById(`testOutput`);
        if (textArea){
            var textNode = document.createTextNode('faucet config successfully generated and saved to Athos\n');
            textArea.append(textNode)
            me.done = true;
            me.failed = false;
        }
        else {
            alert("faucet config generated successfully. Saved to the push-on-green module")
            me.done = true;
            me.failed = false;
        }
        
    })
    .fail(function(msg){
        alert("Something went wrong in saving faucet config.\nCheck user permissions within ATHOS")
        console.log(msg);
        me.done = true;
        me.failed = true;
        
    })
};

/**
 * Sends the topology file to Miru to save
 * @param {Object} topo - Topology file to save
 */
Umbrella.prototype.saveTopo = function(topo){
    let phpurl = window.location.origin + "/sdnixp/saveTopo";
    d = JSON.stringify(topo);
    dstring = String(d);
    var me = this;
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": dstring}
    }).done(function(msg){
        var textArea = document.getElementById(`testOutput`);
        // Checks whether it is generating configs and running Athos together
        if (textArea) {
            var textNode = document.createTextNode('Topology config successfully generated and saved to Athos\n')
            textArea.append(textNode);
            me.done = true;
            me.failed = false;
        }
        else {
            alert("Topology config generated successfully. Saved to the push-on-green module")
            me.done = true;
            me.failed =false;
        }
    })
    .fail(function(msg){
        console.log("something went wrong in saving topo")
        console.log(msg)
        me.done = false;
        me.failed = true;
    })
};

/**
 * Sends the XML file of the graph object to Miru to save
 */
Umbrella.prototype.saveXml = function(){
    xmlfile = mxUtils.getXml(this.editorUi.editor.getGraphXml());
    let phpurl = window.location.origin + "/sdnixp/saveXML";
    dstring = String(xmlfile);
    var me = this;
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": dstring}
    }).done(function(msg){
        me.done = true;
        me.failed = false;
    })
    .fail(function(msg){
        console.log("something went wrong in saving xml")
        console.log(msg)
        me.done = true;
        me.failed = true;
    })
}

/**
 * Class for the shortest path first 
 */
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