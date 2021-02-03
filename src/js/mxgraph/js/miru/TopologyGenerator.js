/**
 * Constructs a network topology for the graph
 */

function TopologyGenerator(editorUi) {
  this.editorUi = editorUi;
  this.coreLinks = [];
  this.switches = [];
  this.hosts = [];
  this.vlans = {};
}

TopologyGenerator.prototype.init = function () {
  this.getNodes();
  console.log(this.coreLinks);
  console.log(this.switches);
  console.log(this.hosts);
  console.log(this.vlans);
};

TopologyGenerator.prototype.getNodes = function () {
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
};

TopologyGenerator.prototype.setLink = function (linkNode) {
  // If no link speed is detected we assume it is 10GB speeds
  // Theses are typically core links in testBench setups
  var linkSpeed = linkNode.hasAttribute("speed") ? node.getAttribute("speed") : 10000;
  var link = {
    link: linkNode.getAttribute("link"),
    speed: linkSpeed,
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
      return;
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
  console.log(nwSwitch);
  return nwSwitch;
};

TopologyGenerator.prototype.processInterface = function (interfaceNode, nwSwitch) {
  host = new Host();
  if (interfaceNode.nodeName != "iface" || interfaceNode.hasAttribute("Core")) {
    // Ignore core ports here as we use links to specify core ports
    return null;
  }
  var port = Number(interfaceNode.getAttribute("port"));
  var portName = interfaceNode.getAttribute("name");
  host.setName(portName);

  for (var vlanNode of interfaceNode.children) {
    this.processVlanNode(vlanNode, nwSwitch, port, host);
  }
  return host;
};

TopologyGenerator.prototype.processVlanNode = function ( vlanNode, nwSwitch, port, host) {
  
  var vid     = parseInt(vlanNode.getAttribute("vid"), 10);
  var ipv4    = vlanNode.getAttribute("ipv4_address") ? vlanNode.getAttribute("ipv4_address") : null;
  var ipv6    = vlanNode.getAttribute("ipv6_address") ? vlanNode.getAttribute("ipv6_address") : null;
  var mac     = vlanNode.getAttribute("ipv4_address") ? vlanNode.getAttribute("macaddresses") : null;
  var tagged  = vlanNode.getAttribute("tagged") ? vlanNode.getAttribute("tagged") : false;

  host.addInterface(nwSwitch.getName(), port, mac, ipv4, ipv6, vid, tagged);

  if (tagged) {
    nwSwitch.addInterface(host.getName(), nwSwitch.getDpid(), vid, false, null)
  } else {
    nwSwitch.addInterface(host.getName(), nwSwitch.getDpid(), null, false, vid)
  }

  if (!(vid in this.vlans)) {
    this.vlans.vid = vlanNode.getAttribute("vlan_description");
  }
};
