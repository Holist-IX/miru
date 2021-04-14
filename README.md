## Miru (Holsitix)

The Holistix is a full stack solution for Internet exchanges. It is built on top of IXP Manager and compromises of two main components, a php package designed to be incorporated with IXP Manager (Miru) and an automated network tester (Athos). This repo will primarily focus on Miru.

## Requirements

Ubuntu <= 20.04  
IXP Manager <= 5.7.0  
docker <= 19.0

## Install process

### IXP Manager
This guide will be based on and follow on from the [IXP Manager install instructions](https://docs.ixpmanager.org/install/automated-script/). The install instructions uses the default install location as below, change it as is appropriate:

```bash
IXPROOT=/srv/ixpmanager
MY_WWW_USER=www-data
```

### Miru
    
- In `${IXPROOT}` run `composer require holist-ix/miru`
- Edit `$IXPROOT/.env` uncomment and change `VIEW_SKIN=miru`

The packages is now installed however we still need to do a couple more steps so that we can have access to it within IXP Manager. Now we need to add the included skins from the package to be able to use the Miru package.

The script below will set a softlink within IXP Manager's skinning folder, this helps keeps the relevant parts updated as Miru gets updated.

```bash
ln -s ${IXPROOT}/vendor/holist-ix/miru/src/skins/miru ${IXPROOT}/resources/skins/miru
cp ${IXPROOT}/vendor/holist-ix/miru/src/config/custom.php ${IXPROOT}/config/custom.php

ln -s ${IXPROOT}/vendor/belthazaar/sdnixp/src/js/mxgraph ${IXPROOT}/public/mxgraph

# Ensure that our user still has permision to work with everything
chown -R $MY_WWW_USER: ${IXPROOT}/resources/skins/miru
chmod -R ug+rw ${IXPROOT}/resources/skins/miru

```

The default installation expects Athos to be installed at `/athos`. To change this to a different directory, change `${IXPROOT}/config/custom.php`. The defualt configuration also includes examples of options if you intend to use Miru with Urge, or want to deploy configurations from within Miru.


## Usage

IXP Manager needs to be setup with at least 1 infrastructure, facility, rack and switch in order to use it.

After the initial setup process is complete, you can access Miru from the bottom of the left sidebar.

When you first open Miru you will be greeted with a blank canvas, and Miru will add any switches found within IXP Manager. The switch object will be populated with all of the information associated with it within IXP Manager, including name, loopback addresses, hostname, all of the members connected to the switch, and all ports that have been designated as "core" ports for internal links between switches. These switch objects can be dragged and dropped on to the canvas.

> _Note:_ Currently there is no way in IXP Manager to declare datapath ids (dpids). If you intend to use the config generated as is for production, right click on the switch object on the canvas, click on `Edit Data...` -> `Add Property` and add a property with the key "dpid" and the value with the switch's dpid. 

Switches can be connected by hovering over a switch object, clicking and then dragging one of the arrows that appears and connecting it to another switch. Miru will find available ports on both of the switches and associate those together as a link. If the link comes back as `undefined` please ensure that each switch has at least 1 port that is set to `core` and is not currently being used by another link.

If you would like to change the ports that Miru has selected, you can right click on the link and select `Edit link between switches` and choose from the available ports. If the port you want is not there, please check if it is allocated to another link, if not please ensure that it has been designated as a `Core` port within IXP Manager.

Once you have a topology that is representative of your network, you can generate and test configurations from `File` -> `Start tests`. This will generate a Faucet Config based on the [umbrella switching fabric](https://hal.archives-ouvertes.fr/hal-01862776), and store it within `$ATHOSROOT\etc\faucet\faucet.yaml` and a network topology file at `$ATHOSROOT\etc\athos\topology.json`. It will then start the `runDocker.sh` within `$ATHOSROOT` and start an athos docker container loaded with our new configs. This will emulate the network drawn in Miru and test connectivity between all hosts, and then report back the results. For more information check out the [athos repo](https://github.com/Holist-IX/athos).

> _Note:_ If this step fail it is most likely due to permision issues. Ensure that `$MY_WWW_USER` has permision to read and write in `$ATHOSROOT`

Miru can also be configured with a deployment script (such as copying over config to faucet and reloading configs). If a deployment script is setup within `custom.php`, the option to run it will be available.
