/**
 * NetworkSwitch object with it's properties
 */

class NetworkSwitch {
  constructor(name = "", dpid = null, interfaces = [], hardware = "", P4Switch = false) {
    this.name = name;
    this.dpid = dpid;
    this.interfaces = interfaces;
    this.hardware = hardware;
    this.P4Switch = P4Switch;
  }

  getName() {
    return this.name;
  }

  setName(name) {
    this.name = name;
    return this.name;
  }

  getInterfaces() {
    return this.interfaces;
  }

  isP4Enabled() {
    return this.P4Switch;
  }

  useP4(enable) {
    this.P4Switch = enable;
    return this.P4Switch;
  }

  replaceInterfaces(interfaces) {
    this.interfaces = interfaces;
    return this.interfaces;
  }

  addSwitchInterface(name, acl_in, port, tagged_vlans, redundancy, native_vlan) {
    iface = new SwitchInterface(name, acl_in, port, tagged_vlans, redundancy,
      native_vlan);
    this.pushInterface(iface);
    return iface;
  }

  pushInterface(iface) {
    this.interfaces.push(iface);
    return this.interfaces;
  }

  getDpid() {
    return this.dpid;
  }

  setDpid(dpid) {
    this.dpid = parseInt(dpid, 10);
    return this.dpid;
  }

  getHardware() {
    return this.hardware;
  }

  setHardware(hw) {
    this.hardware = hw;
    return hw;
  }
}

class SwitchInterface {
  constructor(name = null, acl_in = null, port=null, tagged_vlans = [],
    redundancy = false, native_vlan = null) {
    this.name = name;
    this.acl_in = acl_in;
    this.port = port;
    this.tagged_vlans = tagged_vlans;
    this.redundancy = redundancy;
    this.native_vlan = native_vlan;
  }

}