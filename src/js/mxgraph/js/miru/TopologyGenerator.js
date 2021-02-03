/**
 * Constructs a network topology for the graph
 */

function TopologyGenerator(editorUi) {
  this.editorUi = editorUi;
  this.coreLinks = [];
  this.switches = [];
  this.hosts = [];
  this.vlans = {};
  this.linkSplitChar = ',';
  this.portSplitChar = '.';
}

TopologyGenerator.prototype.init = function () {
  this.processNodes();
  console.log(this.switches)
  console.log(this.vlans)
  console.log(this.hosts)
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
};

TopologyGenerator.prototype.setLink = function (linkNode) {
  // If no link speed is detected we assume it is 10GB speeds
  // Theses are typically core links in testBench setups
  var linkSpeed = linkNode.hasAttribute("speed") ? linkNode.getAttribute("speed") : 10000;
  var vid = linkNode.hasAttribute("vid") ? linkNode.getAttribute("vid") : null;
  var tagged = linkNode.hasAttribute("tagged") ? linkNode.getAttribute("tagged") : null;
  var link = {
    'link': linkNode.getAttribute("link"),
    'speed': linkSpeed,
    'vid' : vid,
    'tagged' : tagged
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
    this.vlans[vid] = {}
    this.vlans[vid].description = vlanNode.getAttribute("vlan_description");
    this.vlans[vid].tagged = tagged;
  }
};

TopologyGenerator.prototype.processCoreLinks = function(){
  continue;
  // console.log(this.coreLinks)
    // for(var linkNode of this.coreLinks ){
    //   console.log(linkNode)
    //   link = linkNode['link'].split(this.linkSplitChar)
    //   sw1 = link[0]
    //   p1  = link[1].split(this.portSplitChar)[2]
    //   sw2 = link[2]
    //   p2  = link[3].split(this.portSplitChar)[2]
    //   console.log(`sw1: ${sw1}\t p1: ${p1}\t sw2: ${sw2}\t p2: ${p2}`)
    //   console.log(`nwSwitch.getName(): ${nwSwitch.getName()}`)
    //   switch (nwSwitch.getName()) {
    //     case sw1:
    //       if (Number(p1) == port){
    //         nwSwitch.addInterface(linkNode['link'], port, nwSwitch.getDpid(), 
    //           null, true, null);
    //       }
    //       break;
    //     case sw2:
    //       console.log(`nwSwitch.getName(): ${nwSwitch.getName()}\t sw2: ${sw2}`)
    //       console.log(`p2: ${p2} \t port: ${port}`)
    //       if (Number(p2) == port){
    //         nwSwitch.addInterface(linkNode['link'], port, nwSwitch.getDpid(), 
    //           null, true, null);
    //       }
    //       break;
    //   }
}