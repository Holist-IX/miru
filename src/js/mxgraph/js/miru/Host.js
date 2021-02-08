/**
 * Hosts object with it's properties
 */
class Host{
  /**
   * Basic constructor with empty defaults
   */
  constructor(){
    /** @type {string} */
    this.name = "";
    /**@type {HostInterface[]} */
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
   * @returns {HostInterface[]} Interface array
   */
  getInterfaces() {
    return this.interfaces;
  }

  /**
   * Retrieves the interface associated with the port number
   * @param {string} swname - Name of switch
   * @param {number} port   - Port number of switch
   * @returns {HostInterface}
   */
  getInterfaceBySwitchNameAndPort(swname, port){
    for (let iface of this.getInterfaces()){
      if (swname == iface.getSwitchName() && port == iface.getSwitchPort()){
        return iface;
      }
    }
    return null;
  }

  /**
   * Replaces the interface array with specified one
   * @param {HostInterface[]} interfaces - Array of HostInterfaces
   * @returns {HostInterface[]} Interface array
   */
  replaceInterfaces(interfaces) {
   this.interfaces = interfaces;
   return this.interfaces
  }

  /**
   * Helper to build a switch interface and associate it with the host
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

  cleanInterfacesSubnets() {
    for (let iface of this.interfaces){
      if (!iface.hasV4Subnet()){
        iface.addV4Subnet()
      }
      if (!iface.hasV6Subnet()){
        iface.addV6Subnet()
      }
    }
  }

  /**
   * Pushes interface to interfaces array
   * @param {HostInterface[]} iface - Configured host interface
   * @returns {HostInterface[]} Updated host interfaces
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
   * @param {number} vlan     - Vlan ID of connection
   * @param {boolean} tagged  - Whether the vlan is tagged or not
   */
  constructor(sw = null, swport = null, mac = null, ipv4 = null, ipv6 = null, vlan = null, tagged=false) {
    this.switch = sw;
    this.swport = swport;
    this.mac = mac;
    this.ipv4 = ipv4;
    this.ipv6 = ipv6;
    this.vlan = vlan;
    this.tagged = tagged;
  }

  hasSubnet(addres){
    return addres.includes('/');
  }

  removeIPv4Subnet(){
    if (this.hasSubnet(this.ipv4)){
      this.ipv4 = this.ipv4.split('/')[0]
    }
    return this.ipv4;
  }

  removeIPv4Subnet(){
    if (this.hasSubnet(this.ipv4)){
      this.ipv4 = this.ipv4.split('/')[0]
    }
    return this.ipv4;
  }

  removeIPv6Subnet(){
    if (this.hasSubnet(this.ipv6)){
      this.ipv6 = this.ipv6.split('/')[0]
    }
    return this.ipv6;
  }
  /**
   * Add a subnet mask to the IPv4 object, default is 24
   * @param {string} subnet - Subnet to add to the end of the address
   */
  addV4Subnet(subnet= "24") {
    var sub = subnet.replace('/', '');
    this.ipv4 = this.ipv4 + '/' + sub;
  }

  /**
   * Add a subnet to the IPv6 object, default is 64
   * @param {string} subnet - Subnet to add to the end of the address
   */
  addV6Subnet(subnet= "64") {
    var sub = subnet.replace('/', '');
    this.ipv6 = this.ipv6 + '/' + sub;
  }

  hasV6Subnet(){
    return this.hasSubnet(this.ipv6)
  }

  hasV4Subnet(){
    return this.hasSubnet(this.ipv4)
  }

  /**
   * Gets the name of the switch the host is connected to
   */
  getSwitchName(){
    return this.switch
  }

  /**
   * Sets the name of the switch the host is connected to
   * @param {string} sw - Switch name
   */
  setSwitchName(sw){
    this.switch = sw;
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
    return this.vlan;
  }

  /**
   * Sets the Vlan ID of the interface
   * @param {number} vlan
   */
  setVid(vlan){
    this.vlan = vlan;
    return this.vlan;
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
