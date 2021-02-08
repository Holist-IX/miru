/**
 * Faucet config generator
 */
function FaucetGenerator(topology) {
  /** @type {TopologyGenerator} */
  this.topology = topology;
  this.topo = Object();
  this.spfGraphing = new spfGrapher();
  this.faucetConfig = {}
}

FaucetGenerator.prototype.init = function () {
  this.topology.init();
  var topo = this.topology.generateTopology();
  this.topology.saveTopo(topo);
  this.generateConfig(this.topology);
  this.saveXml();
}

/**
 * Generates faucet config based on input topology
 * @param {TopologyGenerator} topology
 */
FaucetGenerator.prototype.generateConfig = function (topology) {
  link_nodes = this.SPFOrganise(topology.allLinks);
  for (let edge of link_nodes) {
    this.spfGraphing.addEdge(edge[0], edge[1], edge[2]);
  }
  this.faucetConfig = this.createFaucetObject(topology.switches, topology.vlans);
  this.generateACLS(topology.switches);
  var yamlObj = jsyaml.dump(this.faucetConfig);
  // var cleanedYaml = this.cleanYaml(yamlObj)
  this.cleanYaml(yamlObj);
  // this.saveYaml(cleanedYaml);
}


FaucetGenerator.prototype.SPFOrganise = function (links) {
  link_nodes = []
  for (var link of links) {
    var cost = 100000 / (parseInt(link['speed']));
    var nodes = link['link'].split(',');
    link_nodes.push([nodes[0], nodes[2], cost])
  }
  return link_nodes;
}
/**
 *
 * @param {NetworkSwitch[]} switches - Array of NetworkSwitch objects
 * @param {Object[]} vlans - Array of objects with vlan information
 */
FaucetGenerator.prototype.createFaucetObject = function (switches, vlans) {
  config = {};
  config.dps = {}
  config.vlans = {}
  config.acls = {}
  for (let sw of switches.filter(s => !(s.isP4Enabled()))) {
    swname = sw.getName();
    hardware = sw.getHardware() ? sw.getHardware() : 'Open vSwitch'
    ifaces = this.formatSwInterfaces(sw.getInterfaces());
    config.dps[swname] = {
      "dp_id": sw.getDpid(),
      "hardware": hardware,
      "interfaces": ifaces
    }
    config.acls[sw.getDpid()] = [];
  }
  for ([vid, details] of Object.entries(vlans)) {
    config.vlans[details.name] = {
      "vid": Number(vid),
      "description": details.description
    }
  }
  return config;
}

/**
 * Formats the switch interface as expected in faucet
 * @param {SwitchInterface[]} ifaces - Array of switch interface
 */
FaucetGenerator.prototype.formatSwInterfaces = function (ifaces) {
  cleanIfaces = {}
  for (let iface of ifaces) {
    switch (iface.hasTaggedVlans()) {
      case true:
        cleanIfaces[iface.getPort()] = {
          "name": iface.getName(),
          "acl_in": iface.getAcl_in(),
          "tagged_vlans": iface.getTaggedVlans()
        };
        break;
      case false:
        cleanIfaces[iface.getPort()] = {
          "name": iface.getName(),
          "acl_in": iface.getAcl_in(),
          "native_vlan": iface.getNativeVlan()
        };
        break;
    }
    if (iface.isCore()){
      [s1name, p1, s2name, p2] = iface.getName().split(',');
      s1 = this.topology.getSwitchByName(s1name);
      s2 = this.topology.getSwitchByName(s2name);
      if (!(s1.isP4Enabled()) && !(s2.isP4Enabled())){
        cleanIfaces[iface.getPort()].opstatus_reconf = false;
      }
    }
  }
  return cleanIfaces;
}

/**
 *
 * @param {NetworkSwitch[]} switches
 */
FaucetGenerator.prototype.generateACLS = function (switches) {
  // Only have OF rules for not P4 switches
  for (let sw of switches.filter(s => !(s.isP4Enabled()))) {
    for (let iface of sw.getInterfaces().filter(i => !(i.isCore()))) {
      if (iface.isCore()) continue;
      this.generateOwnACLS(iface.getName(), iface.getAcl_in(),
        iface.getPort(), sw.getName())
    }
    for (let othersw of switches) {
      if (othersw.getName() == sw.getName()) {
        continue;
      }
      for (let iface of othersw.getInterfaces().filter(i => !(i.isCore()))) {
        var route = this.dijkstra(this.spfGraphing, sw.getName(), iface.getName())
        if (route.length < 4) {
          this.generateOtherACLS(iface, sw, othersw);
        } else {
          this.generateUmbrellaACLS(iface, route, sw.getName(), sw.getDpid(), othersw.getName())
        }
      }
    }
  }
}

/**
 *
 * @param {SwitchInterface} iface
 * @param {NetworkSwitch} sw
 * @param {NetworkSwitch} otherSw
 */
FaucetGenerator.prototype.generateOtherACLS = function (iface, sw, otherSw) {
  var ports = [];
  var otherPorts = [];
  for (let swIface of (sw.getInterfaces()).filter(inter => inter.isCore())) {

    [sw1, p1, sw2, p2] = (swIface.getName()).split(',')
    switch (otherSw.getName()) {
      case sw1:
        ports.push(Number(p2.split('.')[2]));
        break;

      case sw2:
        ports.push(Number(p1.split('.')[2]));
        break;

      default:
        otherPorts.push(swIface.getPort());
        break;
    }
  }

  ports = ports.concat(otherPorts)
  let host = this.topology.getHostByName(iface.getName())
  if (host) {
    hostIface = host.getInterfaceBySwitchNameAndPort(otherSw.getName(), iface.getPort())
    if (hostIface) {
      this.otherIPv4ACL(hostIface, sw.getDpid(), ports, otherSw.getDpid())
      this.otherIPv6ACL(hostIface, sw.getDpid(), ports, otherSw.getDpid())
      this.otherMacACL(hostIface, sw.getDpid(), ports, otherSw.getDpid())
    }
  }
}

/**
 * Generate ACL rules for host directly connected to switch
 * @param {String} ifaceName
 * @param {number} acl_in
 * @param {number} port
 */
FaucetGenerator.prototype.generateOwnACLS = function (ifaceName, acl_in, port, swname) {
  let host = this.topology.getHostByName(ifaceName);
  if (host) {
    iface = host.getInterfaceBySwitchNameAndPort(swname, port);
    if (iface) {
      this.ownIPv4ACL(iface, acl_in, port);
      this.ownIPv6ACL(iface, acl_in, port);
      this.ownMacACL(iface, acl_in, port);
      this.portToMacACL(iface, acl_in, port);
    }
  }
}

/**
 *
 * @param {HostInterface} iface
 * @param {String[]} route
 * @param {String} swName
 */
FaucetGenerator.prototype.generateUmbrellaACLS = function (iface, route, swName, acl_num, otherSwName) {

  var route_len = route.length - 2;
  var hop_count = 0;
  var last_mac = ""
  let ports = this.routeToPort(route, swName, iface.getPort());
  var outPort = ports.shift();
  let host = this.topology.getHostByName(iface.getName());
  let hIface = host.getInterfaceBySwitchNameAndPort(otherSwName, iface.getPort());
  while (hop_count < route_len) {
    for (var i = ports.length; i < 6; i++) {
      ports.push(0)
    }

    var mac = "";
    count = 1;
    for (let port of ports) {
      var portStr = port.toString(16);
      if (portStr.length == 1) {
        portStr = "0" + portStr;
      }
      mac += portStr;
      if (count < ports.length) {
        mac += ":";
        count++;
      }
    }
    if (hop_count == 0) {
      this.umbrellaIPv4ACL(hIface, mac, acl_num, outPort);
      this.umbrellaIPv6ACL(hIface, mac, acl_num, outPort);
      this.umbrellaMacACL(hIface.getMac(), mac, acl_num, outPort);
      last_mac = mac;
      outPort = ports.shift();
      hop_count += 1;
    } else {
      let tempSw = this.topology.getSwitchByName(route[hop_count]);
      if (!(tempSw.isP4Enabled())) {
        this.umbrellaMacACL(last_mac, mac, tempSw.getDpid(), outPort);
      }
      ports.shift();
      last_mac = mac;
      outPort = ports[0];
      hop_count += 1;
    }
  }
}

/**
 *
 * @param {String[]} route
 * @param {string} swName
 * @returns {Number[]}
 */
FaucetGenerator.prototype.routeToPort = function (route, swName, lastPort) {

  var ports = [];
  var prevHop = "";

  for (let hop of route) {
    // Ensure we're not sending the packet to itself
    if (hop == swName) {
      prevHop = hop;
      continue;
    }
    if (prevHop) {
      let sw = this.topology.getSwitchByName(prevHop);
      for (let swIface of (sw.getInterfaces()).filter(inter => inter.isCore())) {
        [sw1, p1, sw2, p2] = (swIface.getName()).split(',');
        switch (hop) {
          case sw1:
            ports.push(Number(p2.split('.')[2]));
            break;
          case sw2:
            ports.push(Number(p1.split('.')[2]));
            break;
        }
      }
    }
    prevHop = hop;
  }
  ports.push(lastPort);
  return ports;
}

/**
 *
 * @param {HostInterface} iface   - Host object
 * @param {number} acl            - Acl number
 * @param {number} port           - Port number
 */
FaucetGenerator.prototype.ownIPv4ACL = function (iface, acl, port) {
  if (!iface.getIPv4()) return;
  this.faucetConfig.acls[acl].push({
    "rule": {
      "dl_type": "0x806",
      "dl_dst": "ff:ff:ff:ff:ff:ff",
      "arp_tpa": String(iface.removeIPv4Subnet()),
      "actions": {
        "output": {
          "set_fields": [{
            "eth_dst": iface.getMac()
          }],
          "port": port
        }
      }
    }
  })
}

/**
 *
 * @param {HostInterface} iface   - Host object
 * @param {number} acl            - Acl number
 * @param {number} port           - Port number
 */
FaucetGenerator.prototype.ownIPv6ACL = function (iface, acl, port) {
  if (!iface.getIPv6()) return;
  this.faucetConfig.acls[acl].push({
    "rule": {
      "dl_type": "0x86DD",
      "ip_proto": 58,
      "icmpv6_type": 135,
      "ipv6_nd_target": String(iface.removeIPv6Subnet()),
      "actions": {
        "output": {
          "set_fields": [{
            "eth_dst": iface.getMac()
          }],
          "port": port
        }
      }
    }
  });
};

/**
 *
 * @param {HostInterface} iface   - Host object
 * @param {number} acl            - Acl number
 * @param {number} port           - Port number
 */
FaucetGenerator.prototype.ownMacACL = function (iface, acl, port) {

  this.faucetConfig.acls[acl].push({
    "rule": {
      "dl_dst": String(iface.getMac()),
      "actions": {
        "output": {
          "port": port
        }
      }
    }
  });
};

/**
 *
 * @param {HostInterface} iface   - Host object
 * @param {number} acl            - Acl number
 * @param {number} port           - Port number
 */
FaucetGenerator.prototype.portToMacACL = function (iface, acl, port) {

  portStr = port.toString(16);
  if (portStr.length == 1) {
    portStr = "0" + portStr;
  }
  mac = portStr + ":00:00:00:00:00";
  this.faucetConfig.acls[acl].push({
    "rule": {
      "dl_dst": mac,
      "actions": {
        "output": {
          "set_fields": [{
            "eth_dst": String(iface.getMac())
          }],
          "port": port
        }
      }
    }
  });
}

/**
 *
 * @param {HostInterface} iface - Host interface the ACL is generated for
 * @param {Number} acl_num      - ACL number the rule is associated with
 * @param {Number[]} ports      - Switch ports ordered [main, backup]
 * @param {Number} groupId      - GroupID, should be same as main link's switch dpid
 */
FaucetGenerator.prototype.otherIPv4ACL = function (iface, acl_num, ports, groupId) {
  if (!(iface.getIPv4())) return;
  portStr = "[";
  for (let p of ports){
    portStr = `${portStr}${p},`;
  }
  // Work around jsyaml breaking with arrays
  portStr = portStr +"]";
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_type": "0x806",
      "dl_dst": "ff:ff:ff:ff:ff:ff",
      "arp_tpa": String(iface.removeIPv4Subnet()),
      "actions": {
        "output": {
          "failover": {
            "group_id": groupId,
            "ports": portStr
          }
        }
      }
    }
  });
}

/**
 *
 * @param {HostInterface} iface - Host interface the ACL is generated for
 * @param {Number} acl_num      - ACL number the rule is associated with
 * @param {Number[]} ports      - Switch ports ordered [main, backup]
 * @param {Number} groupId      - GroupID, should be same as main link's switch dpid
 */
FaucetGenerator.prototype.otherIPv6ACL = function (iface, acl_num, ports, groupId) {
  if (!(iface.getIPv6())) return;
  portStr = "[";
  for (let p of ports){
    portStr = `${portStr}${p},`;
  }
  // Work around jsyaml breaking with arrays
  portStr = portStr +"]";
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_type": "0x86DD",
      "ip_proto": 58,
      "icmpv6_type": 135,
      "ipv6_nd_target": String(iface.removeIPv6Subnet()),
      "actions": {
        "output": {
          "failover": {
            "group_id": groupId,
            "ports": portStr
          }
        }
      }
    }
  });
}

/**
 *
 * @param {HostInterface} iface - Host interface the ACL is generated for
 * @param {Number} acl_num      - ACL number the rule is associated with
 * @param {Number[]} ports      - Switch ports ordered [main, backup]
 * @param {Number} groupId      - GroupID, should be same as main link's switch dpid
 */
FaucetGenerator.prototype.otherMacACL = function (iface, acl_num, ports, groupId) {
  portStr = "[";
  for (let p of ports){
    portStr = `${portStr}${p},`;
  }
  // Work around jsyaml breaking with arrays
  portStr = portStr +"]";
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_dst": String(iface.getMac()),
      "actions": {
        "output": {
          "failover": {
            "group_id": groupId,
            "ports": portStr
          }
        }
      }
    }
  });
}

/**
 *
 * @param {HostInterface} iface
 * @param {String} mac
 * @param {Number} acl_num
 */
FaucetGenerator.prototype.umbrellaIPv4ACL = function (iface, mac, acl_num, outPort) {
  if (!(iface.getIPv4())) return;
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_type": "0x806",
      "dl_dst": "ff:ff:ff:ff:ff:ff",
      "arp_tpa": String(iface.removeIPv4Subnet()),
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
}

/**
 *
 * @param {HostInterface} iface
 * @param {String} mac
 * @param {Number} acl_num
 */
FaucetGenerator.prototype.umbrellaIPv6ACL = function (iface, mac, acl_num, outPort) {
  if (!(iface.getIPv6())) return;
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_type": "0x86DD",
      "ip_proto": 58,
      "icmpv6_type": 135,
      "ipv6_nd_target": String(iface.removeIPv6Subnet()),
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
}

/**
 *
 * @param {String} hmac
 * @param {String} mac
 * @param {Number} acl_num
 */
FaucetGenerator.prototype.umbrellaMacACL = function (hmac, mac, acl_num, outPort) {
  this.faucetConfig.acls[acl_num].push({
    "rule": {
      "dl_dst": String(hmac),
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
}

FaucetGenerator.prototype.cleanYaml = async function (yamlObj) {
  var ports = new Set();
  for (var [swname, sw] of Object.entries(this.faucetConfig.dps)) {

    for (var [port, details] of Object.entries(sw.interfaces)) {
      ports.add(parseInt(port), 10);
    }
  }
  for (var acl of Object.keys(this.faucetConfig.acls)) {
    ports.add(parseInt(acl), 10);
  }
  // Need to remove quotes from keys as this breaks YAML with numbers
  var cleanedYaml = await this.removeQuotesFromKeys(ports, yamlObj).then(
    result => {
      return result;
    }
  )
  // return cleanedYaml;
  this.saveYaml(cleanedYaml);
}


FaucetGenerator.prototype.removeQuotesFromKeys = function (ports, yamlDirty) {
  return new Promise((resolve, reject) => {
    for (var id of ports) {
      var reg = new RegExp("\'" + id + "\'", "g");
      yamlDirty = yamlDirty.replace(reg, id.toString())
    }
    yamlDirty = yamlDirty.replaceAll(`'[`, `[`);
    yamlDirty = yamlDirty.replaceAll(`,]'`, `]`);
    resolve(yamlDirty);
  });
}

/**
 * Sends the Faucet config to Miru to save
 * @param {string} yamlObj  - Faucet config to save
 */
FaucetGenerator.prototype.saveYaml = function(yamlObj){
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
 * Sends the XML file of the graph object to Miru to save
 */
FaucetGenerator.prototype.saveXml = function(){
  xmlfile = mxUtils.getXml(this.topology.editorUi.editor.getGraphXml());
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


FaucetGenerator.prototype.dijkstra = function (graph, initial, end) {
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
}
/**
 * Class for the shortest path first
 */
class spfGrapher {
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