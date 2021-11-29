## Miru (Holstix)

Miru is designed as a network diagramming and planning tool for Internet
eXchange points. It is the diagramming tool that as part of the HolistIX project.
Miru is an extension to IXP Manager and allows operators to diagram their
internal network, and generate a network configuration based on that.

Miru interacts with Athos to test network configs before deploying them to the
Cerberus, the SDN controller of HolistIX.

## Requirements

Ubuntu <= 20.04
IXP Manager <= 6.0
docker <= 19.0

Do note that due to the changes in IXP Manager v6, earlier versions are
incompatible.
## Install process

### IXP Manager
This guide will be based on and follow on from the
[IXP Manager install instructions](https://docs.ixpmanager.org/install/automated-script/).
The installation instructions use the default install location as below, change it as is appropriate:

```bash
IXPROOT=/srv/ixpmanager
MY_WWW_USER=www-data
```

### Miru

- In `${IXPROOT}` run `composer require holist-ix/miru`
- Edit `$IXPROOT/.env` uncomment and change `VIEW_SKIN=miru`

The packages are now installed however we still need to do a couple more steps
so that we can have access to it within IXP Manager. Now we need to add the
included skins from the package to be able to use the Miru package.

The script below will set a soft link within IXP Manager's skinning folder,
this helps keeps the relevant parts updated as Miru gets updated.

```bash
ln -s ${IXPROOT}/vendor/holist-ix/miru/src/skins/miru ${IXPROOT}/resources/skins/miru
cp ${IXPROOT}/vendor/holist-ix/miru/src/config/custom.php ${IXPROOT}/config/custom.php

ln -s ${IXPROOT}/vendor/holist-ix/miru/src/js/mxgraph ${IXPROOT}/public/mxgraph

# Ensure that our user still has permision to work with everything
chown -R $MY_WWW_USER: ${IXPROOT}/resources/skins/miru
chmod -R ug+rw ${IXPROOT}/resources/skins/miru

```

The default installation expects Athos to be installed at `/athos`. To change
this to a different directory, change `${IXPROOT}/config/custom.php`. The
default configuration also includes examples of options if you intend to use,
such as the API end point for Cerberus.


## Usage

IXP Manager needs to be setup with at least 1 infrastructure, facility, rack
and switch in order to use it.

After the initial setup process is complete, you can access Miru from the bottom
of the left sidebar.

When you first open Miru you will be greeted with a blank canvas, and Miru will
add any switches found within IXP Manager. The switch object will be populated
with all the information associated with it within IXP Manager, including name,
loopback addresses, hostname, all the members connected to the switch, and all
ports that have been designated as "core" ports for internal links between
switches. These switch objects can be dragged and dropped on to the canvas.

> _Note:_ Currently there is no way in IXP Manager to declare datapath ids (dpids). If you intend to use the config generated as is for production, right-click on the switch object on the canvas, click on `Edit Data...` -> `Add Property` and add a property with the key "dpid" and the value with the switch's dpid.

Switches can be connected by hovering over a switch object, clicking and then
dragging one of the arrows that appears and connecting it to another switch.
Miru will find available ports on both of the switches and associate those
together as a link. If the link comes back as `undefined` please ensure that
each switch has at least 1 port that is set to `core` and is not currently
being used by another link.

If you would like to change the ports that Miru has selected, you can
right-click on the link and select `Edit link between switches` and choose from
the available ports. If the port you want is not there, please check if it is
allocated to another link, if not please ensure that it has been designated as
a `Core` port within IXP Manager.

Once you have a topology that is representative of your network, you can
generate and test configurations from `File` -> `Start tests`. Miru will
proceed to generate a topology representation and store them in the athos
directory declared in `custom.php`. This will emulate the network drawn in Miru
and test connectivity between all hosts, and then report back the results. For
more information check out the [athos repo](https://github.com/Holist-IX/athos).

> _Note:_ If this step fail it is most likely due to permission issues. Ensure that `$MY_WWW_USER` has permission to read and write in `$ATHOSROOT`. Future updates to Athos will remove this requirement.
