/**
 * Copyright (c) 2021, Christoff Visser
 */
/**
 * NetworkSwitch object with it's properties
 */
/**
 * @class
 * @typedef {Object} NetworkSwitch
 * @property {string} name - Name of the switch
 * @property {Number} dpid - Datapath ID of OpenFlow switch
 * @property {string} hardware - Vendor name of hardware switch
 * @property {boolean} P4Switch - Whether the switch is a P4 switch
 */
class NetworkSwitch {
  constructor(name = "", dpid = null, interfaces = [], hardware = "", P4Switch = false) {
    this.name = name;
    this.dpid = dpid;
    this.interfaces = interfaces;
    this.hardware = hardware;
    this.P4Switch = P4Switch;
    this.ports = [];
  }

  /**
   * Returns the Network Switch's name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Sets the Network Switch's
   * @param {string} name - New switch name
   * @returns {string}
   */
  setName(name) {
    this.name = name;
    return this.name;
  }

  /**
   * Returns a list of all interfaces connected
   * @returns {SwitchInterface[]}
   */
  getInterfaces() {
    return this.interfaces;
  }

  /**
   * Returns a list of connected interfaces
   * @returns {boolean}
   */
  isP4Enabled() {
    return this.P4Switch;
  }

  /**
   * Checks if the physical port is already assigned to the port
   * @param {Number} port - Port number of port to check
   * @returns {Boolean} Whether the port already exists
   */
  checkIfPortExists(port) {
    if (this.ports.includes(port)){
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Gets the interface linked to the port number
   * @param {Number} port - Port number to get
   * @returns {SwitchInterface} Returns the switch interface linked to the port
   */
  getInterface(port) {
    for (let iface of this.getInterfaces()) {
      if (iface.getPort() == port) {
        return iface;
      }
    }
  }


  /**
   * Designate if it is a P4 switch or not
   * @param {boolean} enable
   * @returns {boolean}
   */
  useP4(enable) {
    this.P4Switch = enable;
    return this.P4Switch;
  }

  /**
   * Replaces the interface array with specified one
   * @param {SwitchInterface[]} interfaces - Array of NetworkInterfaces
   * @returns {SwitchInterface[]} Interface array
   */
  replaceInterfaces(interfaces) {
    this.interfaces = interfaces;
    return this.interfaces;
  }

  /**
   * Helper function to build a switch interface and associate it with the switch
   * @param {string} name               - Name of the port
   * @param {Number} acl_in             - Acl number associated wit the port
   * @param {Number} port               - Port number on the switch
   * @param {Number[]} tagged_vlans - Array of VIDS to tag interface with
   * @param {boolean} redundancy        - Whether OF redundancy should be enabled
   * @param {Number} native_vlan        - Native VLAN that will not be tagged
   * @returns {SwitchInterface}
   */
  addSwitchInterface(name, acl_in, port, tagged_vlans, redundancy, native_vlan, core =false) {
    if (!this.checkIfPortExists(port)) {
      iface = new SwitchInterface(name, acl_in, port, tagged_vlans, redundancy,
        native_vlan, core);
        this.ports.push(port)
        this.pushInterface(iface);
    }
    else {
      let iface = this.getInterface(port);
      if (tagged_vlans) {
        iface.addTaggedVlan(tagged_vlans)
      }
    }
    return iface;
  }

  /**
   * Adds SwitchInterface to list of interfaces
   * @param {SwitchInterface} iface
   * @returns {SwitchInterface[]}
   */
  pushInterface(iface) {
    this.interfaces.push(iface);
    return this.interfaces;
  }

  /**
   * Returns the dpid of the switch
   * @returns {Number}
   */
  getDpid() {
    return this.dpid;
  }

  /**
   * Sets the dpid for the switch
   * @param {Number} dpid
   * @returns {Number}
   */
  setDpid(dpid) {
    this.dpid = parseInt(dpid, 10);
    return this.dpid;
  }

  /**
   * Returns the hardware vendor
   * @returns {string}
   */
  getHardware() {
    return this.hardware;
  }

  /**
   * Sets the hardware vendor
   * @param {string} hw
   * @returns {string}
   */
  setHardware(hw) {
    this.hardware = hw;
    return this.hardware;
  }
}

/**
 * @class
 * @typedef {Object} SwitchInterface
 * @param {string} name           - Name of the interface
 * @param {Number} acl_in         - Acl number associated wit the port
 * @param {Number} port           - Port number on the switch
 * @param {Number[]} tagged_vlans - Array of VIDS to tag interface with
 * @param {boolean} redundancy    - Whether OF redundancy should be enabled
 * @param {Number} native_vlan    - Native VLAN that will not be tagged
 */
class SwitchInterface {
  constructor(name = null, acl_in = null, port = null, tagged_vlans = [],
    redundancy = false, native_vlan = null, core =false) {
    this.name = name;
    this.acl_in = acl_in;
    this.port = port;
    this.tagged_vlans = [];
    if (tagged_vlans) {
      this.addTaggedVlan(tagged_vlans);
    }
    this.redundancy = redundancy;
    this.native_vlan = native_vlan;
    this.core = core;
  }

  /**
   * Returns the interface name
   * @returns {string}
   */
  getName() {
    return this.name;
  }
  /**
   * Set the interface name
   * @param {string} name - Name of interface
   * @returns {string}
   */
  setName(name) {
    this.name = name;
    return this.name;
  }

  /**
   * Get the ACL number for the interface
   * @returns {Number}
   */
  getAcl_in() {
    return this.acl_in;
  }

  /**
   * Sets the ACL number for the interface
   * @param {Number} acl_in - ACL Number
   * @returns {Number}
   */
  setAcl_in(acl_in) {
    this.acl_in = acl_in;
    return this.acl_in;
  }

  /**
   * Returns the port number
   * @returns {Number}
   */
  getPort() {
    return this.port;
  }

  /**
   * Sets the port number of the interface
   * @param {Number} port - Port number
   * @returns {Number}
   */
  setPort(port) {
    this.port = port;
    return this.port;
  }

  /**
   * Returns the Native Vlan ID
   * @returns {Number}
   */
  getNativeVlan() {
    return this.native_vlan;
  }

  /**
   * Sets the Native Vlan ID
   * @param {number} native_vlan - ID of native VLAN HAS to be between 0 and 4095
   * @returns {Number}
   */
  setNativeVlan(native_vlan) {
    this.native_vlan = native_vlan;
    return this.native_vlan;
  }

  /**
   * Returns whether redundancy is enabled for this port
   * @returns {boolean}
   */
  getRedundancy() {
    return this.redundancy;
  }

  /**
   * Enables/disables redundancy for this port
   * @param {boolean} redundancy
   * @returns {boolean}
   */
  setRedundancy(redundancy) {
    this.redundancy = redundancy;
    return this.redundancy;
  }

  /**
   * Returns the tagged vlans for this port
   * @returns {Number[]}
   */
  getTaggedVlans() {
    return this.tagged_vlans;
  }

  /**
   * Sets an array of tagged vlan ID's
   * @param {Number[]} tagged_vlans - Vlan ID's between 0 - 4095
   * @returns {Number[]}
   */
  setTaggedVlans(tagged_vlans) {
    this.tagged_vlans = tagged_vlans;
    return this.tagged_vlans;
  }

  /**
   * Adds a tagged vlan to the array
   * @param {Number} tagged_vlan - VLAN ID between 0 - 4095
   */
  addTaggedVlan(tagged_vlan) {

    if (!this.tagged_vlans.includes(tagged_vlan)) {
      this.tagged_vlans = this.tagged_vlans.concat(tagged_vlan)
    }
  }

  /**
   * Returns whether the interface
   */
  hasTaggedVlans(){
    var isTagged = this.tagged_vlans ? true : false;
    return isTagged;
  }



  isCore(){
    return this.core;
  }

  setCore(enable){
    this.core = enable;
    return this.core;
  }
}