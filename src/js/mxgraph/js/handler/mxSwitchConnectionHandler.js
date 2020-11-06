/**
 * 
 */

function mxSwitchConnectionHandler(graph)
{
    if (graph != null)
	{
		this.graph = graph;
    }
    this.taken_ports = this.getTakenPorts();
};

mxSwitchConnectionHandler.prototype.addConnection = function(source, target)
{
    src_ports = this.getAvailablePorts(source);
    target_ports = this.getAvailablePorts(target);
    match = this.findMatchingPorts(src_ports, target_ports);
    return match;
}


mxSwitchConnectionHandler.prototype.getSwitchName = function(sw)
{
    sw_name = sw.value.getAttribute(`switch`)
    return sw_name;
}

mxSwitchConnectionHandler.prototype.getAvailablePorts = function(sw)
{
    var core_ports = [];
    var sw_name  = this.getSwitchName(sw);
    var interfaces = null;

    for (var child of sw.value.childNodes){
        if (child.localName == "interfaces"){
            interfaces = child;
        }
    }
    if (interfaces != null)
    {
        for (iface of interfaces.childNodes){
            if (iface.localName == "iface"){
                if (iface.hasAttribute(`Core`)){
                    p = iface.getAttribute(`name`);
                    sw_port = sw_name + ',' + p;
                    if (!this.taken_ports.includes(sw_port)) {
                        core_ports.push(sw_port);
                    }
                }
            }
        }
    }

    return core_ports;
}

mxSwitchConnectionHandler.prototype.findMatchingPorts = function(src, target)
{
    var match = "";
    if (src.length > 0 && target.length > 0){
        match = src[0] + ',' + target[0];
        return match;
    }
}

mxSwitchConnectionHandler.prototype.getTakenPorts = function()
{
    taken_ports = []
    for ([index, cell] of Object.entries(this.graph.model.cells)) {
        if (cell.value){
            if (cell.value.hasAttribute('link')) {
                val = cell.value.getAttribute('link');
                node_array = val.split(",")
                src = node_array[0] + ',' + node_array[1]
                tgt = node_array[2] + ',' + node_array[3]
                taken_ports.push(src);
                taken_ports.push(tgt);
            }
        }
    }

    return taken_ports;
}