/**
 * Hosts object with it's properties
 */
class Host{
  /**
   * Basic constructor with empty defaults
   */
  constructor(){
    this.name = "";
    this.interfaces = [];
  }

  /**
   * Switch name getter
   * @returns Switch name
   */
  getName() {
    return this.name;
  }
  
  /**
   * Switch name setter
   * @param {string} name - Switch name to set
   * @returns {string} Name of switch
   */
  setName(name) {
    this.name = name;
  }

  /**
   * Retrieves the switches interfaces
   * @returns {Array} Interface array
   */
  getInterfaces() {
    return this.interfaces;
  }

  /**
   * Replaces the interface array with specified one
   * @param {Array} interfaces - Array of HostInterfaces
   * @returns {Array} Interface array
   */
  replaceInterfaces(interfaces) {
   this.interfaces = interfaces;
   return this.interfaces
  }

  /**
   * Helper to build a switch interface and associate it with the switch
   * @param {string} sw       - Name of switch the host is connected to
   * @param {number} swport   - Switch port number the host is connected to
   * @param {string} mac      - MAC address of host
   * @param {string} ipv4     - IPv4 address of host
   * @param {string} ipv6     - IPv6 address of host
   * @param {number} vid      - Vlan ID of connection
   * @param {boolean} tagged  - Whether the vlan is tagged or not
   * @returns {HostInterface} Created Host interface after it's added to interface array
   */
  addInterface(sw, swport, mac, ipv4, ipv6, vid, tagged) {
    var iface = new HostInterface(sw, swport, mac, ipv4, ipv6, vid, tagged);
    this.pushInterface(iface);
    return iface;
  }

  /**
   * Pushes interface to interfaces array
   * @param {HostInterface} iface - Configured host interface
   * @returns {Array} Updated host interfaces
   */
  pushInterface(iface){
    this.interfaces.push(iface);
    return this.interfaces;
  }
}

/**
 * Helper class for creating interfaces associated with a host
 */
class HostInterface {
  /**
   * Host interface object
   * @param {string} sw       - Name of switch the host is connected to
   * @param {number} swport   - Switch port number the host is connected to
   * @param {string} mac      - MAC address of host
   * @param {string} ipv4     - IPv4 address of host
   * @param {string} ipv6     - IPv6 address of host
   * @param {number} vid      - Vlan ID of connection
   * @param {boolean} tagged  - Whether the vlan is tagged or not
   */
  constructor(sw = null, swport = null, mac = null, ipv4 = null, ipv6 = null, vid = null, tagged=false) {
    this.sw = sw;
    this.swport = swport;
    this.mac = mac;
    this.ipv4 = ipv4;
    this.ipv6 = ipv6;
    this.vid = vid;
    this.tagged = tagged;
  }

  /**
   * Add a subnet to the IPv4 object, default is /24
   * @param {string} subnet - Subnet to add to the end of the address
   */
  addV4Subnet(subnet= "/24") {
    this.ipv4 = this.ipv4 + subnet;
  }

  /**
   * Add a subnet to the IPv6 object, default is /24
   * @param {string} subnet - Subnet to add to the end of the address
   */
  addV6Subnet(subnet= "/64") {
    this.ipv6 = this.ipv6 + subnet;
  }

  /**
   * Gets the name of the switch the host is connected to
   */
  getSwitchName(){
    return this.sw
  }

  /**
   * Sets the name of the switch the host is connected to
   * @param {string} sw - Switch name 
   */
  setSwitchName(sw){
    this.sw = sw;
    return sw;
  }

  /**
   * Gets the port of the switch the host is connected to
   */
  getSwitchPort(){
    return this.swport;
  }

  /**
   * Sets the port of the switch the host is connected to
   * @param {number} port - Port number of the switch
   */
  setSwitchPort(port){
    this.swport = port;
    return this.swport;
  }
  
  /**
   * Gets the mac address of the interface
   */
  getMac(){
    return this.mac;
  }

  /**
   * Gets the mac address of the interface
   * @param {string} mac - mac address in 00:00:00:00:00:00 format
   */
  setMac(mac){
    this.mac = mac;
    return this.mac;
  }

  /**
   * Gets the IPv4 address of the interface
   */
  getIPv4(){
    return this.ipv4;
  }

  /**
   * Gets the IPv4 address of the interface
   * @param {string} address - IPv4 as string in 127.0.0.1 format
   */
  setIPv4(address){
    this.ipv4 = address;
    return this.ipv4;
  }

  /**
   * Gets the IPv6 address of the interface
   */
  getIPv6(){
    return this.ipv6;
  }

  /**
   * Gets the IPv6 address of the interface
   * @param {string} address - IPv6
   */
  setIPv6(address){
    this.ipv6 = address;
    return this.ipv6;
  }

  /**
   * Gets the Vlan ID address of the interface
   */
  getVid(){
    return this.vid;
  }

  /**
   * Sets the Vlan ID of the interface
   * @param {number} vid 
   */
  setVid(vid){
    this.vid = vid;
    return this.vid;
  }

  /**
   * Returns whether the interface is tagged or not
   */
  isTagged(){
    return this.tagged;
  }

  /**
   * Enable or disables tagging
   * @param {boolean} tag - Whether or not the interface is tagged 
   */
  setTagged(tag){
    this.tagged = tag;
    return this.tagged;
  }
}

