/**
 * Copyright (c) 2021, Christoff Visser
 */
/**
 * Constructs a network topology for the graph
 */

function TopologyGenerator(editorUi) {
  this.editorUi = editorUi;
  this.coreLinks = [];
  this.allLinks = [];
  /**@type {NetworkSwitch[]} */
  this.switches = [];
  /**@type {Host[]} */
  this.hosts = [];
  this.vlans = {};
  this.linkSplitChar = ',';
  this.portSplitChar = '.';
  this.peering_vid = null;
}

TopologyGenerator.prototype.init = function () {
  this.processNodes();
};

TopologyGenerator.prototype.processNodes = function () {
  // Retrieves the latest version of the graph
  var editorUi = this.editorUi;
  var editor = editorUi.editor;
  var graphXML = editor.getGraphXml();
  for (var node of graphXML.childNodes[0].childNodes) {
    if (node.hasAttribute("link")) {
      this.coreLinks.push(this.setLink(node));
    } else if (node.hasAttribute("switch")) {
      this.switches.push(this.processSwitchNode(node));
    }
  }
  this.processCoreLinks()
};

TopologyGenerator.prototype.setLink = function (linkNode) {
  // If no link speed is detected we assume it is 10GB speeds
  // Theses are typically core links in testBench setups
  var linkSpeed = linkNode.hasAttribute("speed") ? linkNode.getAttribute("speed") : 10000;
  var vid = linkNode.hasAttribute("vid") ? linkNode.getAttribute("vid") : null;
  var tagged = linkNode.hasAttribute("tagged") ? linkNode.getAttribute("tagged") : false;
  var vlan_description = linkNode.hasAttribute("vlan description") ? linkNode.getAttribute("vlan description") : null;
  var link = {
    'link': linkNode.getAttribute("link"),
    'speed': linkSpeed,
    'vid' : Number(vid),
    'tagged' : tagged,
    'vlan_description' : vlan_description
  };
  return link;
};

TopologyGenerator.prototype.processSwitchNode = function (switchNode) {
  nwSwitch = new NetworkSwitch();
  nwSwitch.setName(switchNode.getAttribute("switch"));
  if (switchNode.hasAttribute("core")) {
    coreSwitch = switchNode.getAttribute("core");
    if (coreSwitch) {
      nwSwitch.useP4(true);
      return nwSwitch;
    }
  }
  if (!switchNode.hasAttribute("dpid")) {
    switchNode.setAttribute("dpid", switchNode.getAttribute("swid"));
  }
  nwSwitch.setDpid(switchNode.getAttribute("dpid"));
  for (var child of switchNode.childNodes) {
    if (child.localName === "interfaces") {
      for (var interfaceNode of child.childNodes) {
        host = this.processInterface(interfaceNode, nwSwitch);
        if (host) {
          this.hosts.push(host);
        }
      }
    }
  }
  return nwSwitch;
};

TopologyGenerator.prototype.processInterface = function (interfaceNode, nwSwitch) {
  host = new Host();
  if (interfaceNode.nodeName != "iface") {
    return null;
  }
  var port = Number(interfaceNode.getAttribute("port"));

  if (interfaceNode.hasAttribute("Core")) {
    // We sort out core ports later since not all links are found yet
    return;
    }
  var portName = interfaceNode.getAttribute("name");
  host.setName(portName);
  // Sets defualt of 1gb speed for hosts if unconfigured
  var speed = interfaceNode.hasAttribute("speed") ? interfaceNode.getAttribute("speed") : 1000;
  for (var vlanNode of interfaceNode.children) {
    this.processVlanNode(vlanNode, nwSwitch, port, host, speed);
  }
  return host;
};

TopologyGenerator.prototype.processVlanNode = function ( vlanNode, nwSwitch, port, host, speed) {

  var vid     = parseInt(vlanNode.getAttribute("vid"), 10);
  var ipv4    = vlanNode.getAttribute("ipv4_address") ? vlanNode.getAttribute("ipv4_address") : null;
  var ipv6    = vlanNode.getAttribute("ipv6_address") ? vlanNode.getAttribute("ipv6_address") : null;
  var mac     = vlanNode.getAttribute("ipv4_address") ? vlanNode.getAttribute("macaddresses") : null;
  var tagged  = vlanNode.getAttribute("tagged") ? vlanNode.getAttribute("tagged") : false;
  vid = Number(vid);
  host.addInterface(nwSwitch.getName(), port, mac, ipv4, ipv6, vid, tagged);


  linkname = `${host.getName()},port1.0.1,${nwSwitch.getName()},${port}`
  link = {
    'link': linkname,
    'speed': speed
  }
  this.allLinks.push(link);

  if (tagged) {
    nwSwitch.addSwitchInterface(host.getName(), nwSwitch.getDpid(), port, vid, false, null)
  } else {
    nwSwitch.addSwitchInterface(host.getName(), nwSwitch.getDpid(), port, null, false, vid)
  }

  if (!(vid in this.vlans)) {
    this.vlans[vid] = {}
    this.vlans[vid].description = vlanNode.getAttribute("vlan_description");
    this.vlans[vid].tagged = tagged;
    this.vlans[vid].name = vlanNode.getAttribute("vlan_name");
    this.peering_vid = (vlanNode.getAttribute("vlan_name")) == "peering" ? vid : null;
  }
};

TopologyGenerator.prototype.processCoreLinks = function(){

  for (var linkNode of this.coreLinks){
    link = linkNode['link'].split(this.linkSplitChar);
    sw1  = this.getSwitchByName(link[0]);
    p1   = Number(link[1].split(this.portSplitChar)[2]);
    sw2  = this.getSwitchByName(link[2]);
    p2   = Number(link[3].split(this.portSplitChar)[2]);
    linkNode.linkarray = [link[0], p1.toString(), link[2], p2.toString()];
    [vid, tagged] = this.findCoreLinkVLAN(linkNode);

    if (vid){
      var OF_redundancy = true;
      if (sw1.isP4Enabled() || sw2.isP4Enabled()){
        OF_redundancy = false
      }
      switch (tagged){
        case true:
          sw1.addSwitchInterface(linkNode['link'], sw1.getDpid(), p1, vid,
            OF_redundancy, null, true);
          sw2.addSwitchInterface(linkNode['link'], sw2.getDpid(), p2, vid,
            OF_redundancy, null, true);
          break;
        case false:
          sw1.addSwitchInterface(linkNode['link'], sw1.getDpid(), p1, null,
            OF_redundancy, vid, true);
          sw2.addSwitchInterface(linkNode['link'], sw2.getDpid(), p2, null,
            OF_redundancy, vid, true);
          break;
      }
    }
  }
  this.allLinks.push(...this.coreLinks)
}

TopologyGenerator.prototype.findCoreLinkVLAN = function(linkNode) {
  if (linkNode["vid"]) {
    return [Number(linkNode["vid"]), linkNode['tagged']]
  }
  if (linkNode["vlan_description"]) {
    for ([vid, vlan] of Object.entries(this.switches)){
      if (linkNode["vlan_description"] == vlan.description){
        return [Number(vid), vlan.description];
      }
    }
  }
  // If no vlan is configured
  if (!(this.peering_vid)){
    if (this.vlans){
      var vlan_array = Object.entries(this.vlans)
      var vid = vlan_array[0][0];
      var tagged = vlan_array[0][1].tagged;
      console.log(`No peering vlan detected. Using vlan ${vid}. Tagged: ${tagged}`)
      return [Number(vid), tagged]
    }
      alert("No vlans found. Please configure at least 1 vlan")
      return [null, null]
  }
  if (this.peering_vid){
      return[Number(this.peering_vid), this.vlans[this.peering_vid].tagged]
  }
}

TopologyGenerator.prototype.getSwitchByName = function (swname){
  for (let sw of this.switches){
    if (swname == sw.getName()){
      return sw;
    }
  }
  console.log(`No switch found with the name: ${swname}`)
  return null;
}

/**
 * Returns a host object with specified name
 * @param {string} hname
 * @returns {Host}
 */
TopologyGenerator.prototype.getHostByName = function (hname){
  for (let host of this.hosts){
    if (hname == host.getName()){
      return host;
    }
  }
  console.log(`No host found with the name: ${hname}`)
  return null;
}

TopologyGenerator.prototype.generateTopology = function() {
  var topology = new Object();
  topology.switch_matrix = {};
  topology.switch_matrix.dp_ids = {};
  topology.switch_matrix.links = []
  topology.switch_matrix.p4 = [];

  for (host of this.hosts){
    host.cleanInterfacesSubnets();
  }
  topology.hosts_matrix = this.hosts;

  for (var link of this.coreLinks){
    topology.switch_matrix.links.push(link['linkarray'])
  }

  for (var sw of this.switches){
    switch(sw.isP4Enabled()){
      case true:
        topology.switch_matrix.p4.push(sw.getName())
        break;
      case false:
        if (sw.getDpid()){
          topology.switch_matrix.dp_ids[sw.getName()] = sw.getDpid();
        }
    }
  }
  return topology;
}

/**
 * Sends the topology file to Miru to save
 * @param {Object} topo - Topology file to save
 */
TopologyGenerator.prototype.saveTopo = function(topo){
  let phpurl = window.location.origin + "/miru/saveTopo";
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