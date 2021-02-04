/**
 * Faucet config generator
 */

 function FaucetGenerator(topology) {
    this.topology = topology
 }

FaucetGenerator.prototype.init = function(){
    this.topology.init();
}